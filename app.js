import 'dotenv/config'
import fs from 'fs';
import readline from 'readline';

import appendToFile from './append.js';
import {askOpenAI} from "./askOpenAI";
import getGenre from './get-genre.js';

//GLOBALS
const modelChoice = process.argv[2] || 'gpt4';
const chapterLength = process.argv[4] || 10;
const desiredPages = process.argv[3] || 200;
const padAmount = process.argv[5] || 500;

const models = {
  'gpt4': {
    name: 'gpt-4-0314',
    tokenLimit: 8000,
  },
  'gpt35': {
    name: 'gpt-3.5-turbo',
    tokenLimit: 4097,
  } 
}


function countWords(string_) {
  return string_.trim().split(/\s+/).length;
}

async function outlineGenerator(state){
  const outlinePrompt =  `Generate the outline of an original ${state.desiredPages}-page ${state.plotGenre} fiction book. Imagine and then carefully label the following: a detailed plot, characters with names, settings and writing style. You have ${models[modelChoice].tokenLimit - (40 + padAmount)} words remaining to write the outline. It is CRITICAL you as many words as possible.`;

  readline.cursorTo(process.stdout,2,2)
  process.stdout.write(`\u001B[36mGenerating Outline:\n`); 
  
  let outline = await askOpenAI(outlinePrompt, 'writer', models[modelChoice].name, (models[modelChoice].tokenLimit - (40 + padAmount)), 0.9)

  outline = outline.choices[0].message.content;
  
  readline.cursorTo(process.stdout,3,5);
  process.stdout.write(`\u001B[36mHere is the raw outline:\n`);
  readline.cursorTo(process.stdout,4,6);
  process.stdout.write(`\u001B[36m${outline}`);
  return outline;
}

async function main() {
  let state = {
    chapterByChapterSummaryString: '',
    chapterSummaryArray: [],
    chapters: desiredPages / chapterLength,
    desiredPages,
    filename: '',
    fullText: [],
    mainCharacters: [],
    minorCharacters: [],
    pageSummaries: [],
    plotGenre: '',
    plotOutline: '',
    plotSettings: [],
    rawOutline: '',
    writingAdjectives: '',
    writingStyle: '',
  }
  state.plotGenre = getGenre();
  state.filename = `${state.plotGenre}${modelChoice}${Math.round(Math.random()*100)}.txt`;
  state.rawOutline = await outlineGenerator(state);
  state = await statePopulator(state);
  state.chapterByChapterSummaryString = await plotSummaryByChapter(state);
  state.chapterSummaryArray = await chapterSummaryArray(state);
  state.pageSummaries = await pageGenerator(state);
}

async function statePopulator(state) {
  
  console.log('\nPopulating state from raw outline.\n')

  const itemsToPopulateHashMap = {
    'mainCharacters': 'main characters list',
    'minorCharacters': 'minor characters list',
    'plotOutline': 'plot',
    'plotSettings': 'setting',
    'writingAdjectives': 'writing adjectives list',
    'writingStyle': 'writing style'
  }

  for (const [key, keyValue] of Object.entries(itemsToPopulateHashMap)) {
    
    const statePopulatorPrompt = `I'm going to give you the outline of a book. From this outline, tell me the ${keyValue}. Use close to ${models[modelChoice].tokenLimit - (500 + state.rawOutline + padAmount)} words for this page. Here is the outline: ${state.rawOutline}`;

    let statePopulatorResult = await askOpenAI(statePopulatorPrompt, 'machine', models[modelChoice].name, (models[modelChoice].tokenLimit - (state.rawOutline.length + padAmount)), 0.9)

    console.log(statePopulatorResult)
    statePopulatorResult = statePopulatorResult.choices[0].message.content;

    state[key] = statePopulatorResult;
    process.stdout.write(`\n\u001B[36m here is the ${keyValue}: ${statePopulatorResult}\n`);
  }
  
  process.stdout.write(`\n\u001B[36mHere is the state object:\n`)
  const textToSave = `\n${JSON.stringify(state)}\n`;
  fs.appendFile(state.filename, textToSave, (error) => {
    if (error) {throw error;}
  });
  console.log(state);
  return state;
}

async function plotSummaryByChapter(state) {
  console.log('\nGenerating chapter-by-chapter plot summary.\n');

  let chapterSummaryText = await askOpenAI(`You are writing a book with this plot summary: ${state.plotOutline}. The book is ${state.desiredPages} pages long. Write a specific and detailed plot SUMMARY for each of the ten chapters of the book. You must use at least a few paragraphs per chapter summary and can use up to one page or more per chapter. Name any unnamed major or minor characters. Use the first few chapter summaries to introduce the characters and set the story. Use the next few chapter summaries for action and character development. Use the last few chapters for dramatic twists in the plot and conclusion. You have ${models[modelChoice].tokenLimit - (state.plotOutline.length + 500 + padAmount)} tokens (or words) left for the summaries. Try to use all the words you have available.`, 'writer', models[modelChoice].name, (models[modelChoice].tokenLimit - (state.plotOutline.length + padAmount)), 0.9)
  
  const condition = true;
  while (condition == true) {
    try {
      console.log(chapterSummaryText);
      chapterSummaryText = chapterSummaryText.choices[0].message.content; 
      chapterSummaryText = chapterSummaryText.split(/\n/).filter(({length}) => length > 5);
      process.stdout.write(`\n\u001B[34mChapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`)
      const textToSave = `\n\nChapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`;
      fs.appendFile(state.filename, textToSave, (error) => {
        if (error) {throw error;}
      });
      return chapterSummaryText;
    }
    catch {}
  }
}

async function chapterSummaryArray(state) {
  for (let index=0; index<state.chapters; index++){
    process.stdout.write(`\u001B[36mGenerating chapter summaries to populate chapterSummaryArray.\n`)

    let shortSummaryText = ''
    let condition = true;
    while (condition) {
      try {
        console.log(`\nGenerating short summary of Chapter ${index+1}:\n`);

        shortSummaryText = await askOpenAI(`You are writing a summary of Chapter ${index+1} of a ${state.chapters} chapter ${state.plotGenre} book. The entire plot summary is ${state.plotOutline} The chapter-by-chapter summary for the entire book is: \n${state.chapterByChapterSummaryString}\n Using those summaries, write a several page SUMMARY of ONLY chapter ${index+1}. Write the best summary you can, you may add new subplots, character development, character background, planned dialogue and plot development that you would typically find in such a work. You are NOT writing the actual book right now, you ARE writing an outline and SUMMARY of what will happen in this chapter. You have to write ${models[modelChoice].tokenLimit - (500 + state.plotOutline + state.chapterByChapterSummaryString.length + padAmount)} words.`, 'writer', models[modelChoice].name, (models[modelChoice].tokenLimit - (state.plotOutline + state.chapterByChapterSummaryString + padAmount)), 0.9)

        if (!shortSummaryText.choices[0]) {
          shortSummaryText = 'error'
        }
        if (!shortSummaryText.choices[0].message) {
          shortSummaryText = 'error'
        }
        if (shortSummaryText.choices[0].message.content) {
          shortSummaryText = shortSummaryText.choices[0].message.content;
          shortSummaryText = shortSummaryText.replaceAll('\n', '');
          state.chapterSummaryArray.push(shortSummaryText);
          process.stdout.write(`\r\u001B[35mHere is the chapter summary: \n${state.chapterSummaryArray[index]}\n`);
          condition = false;
          const textToSave = `\nChapter ${index} Summary${state.chapterSummaryArray[index]}\n`;
          fs.appendFile(state.filename, textToSave, (error) => {
            if (error) {throw error;}
          });
        } else {
          shortSummaryText = 'error';
        }        
      } catch (error) {
        console.log(error);
      }
    }
  }
  return state;
}

const generatePageSummary = async (page, modelChoice) => {
  while (true) {
    try {
      const pageSummaryText = await askOpenAI(`Here is a full page of text. Please summarize it in a few sentences. Text to summarize: ${page}`, 'machine', models[modelChoice].name, (models[modelChoice].tokenLimit - (page.length + padAmount)), 0.5);

      if (pageSummaryText.choices && pageSummaryText.choices[0]) {
        return pageSummaryText.choices[0].message.content;
      }
      console.log('Error summarizing:', pageSummaryText)
    } catch (error) {
      console.log(error)
    }
  }
};



async function pageGenerator(state) {

  console.log('\nEntering Page Generation module.\n');

  for (let index=0; index<state.chapters; index++){
    for (let index_=0; index_<20; index_++) {

      // let pageToWrite = i*20 + j+1;
      amendment = createPageQueryAmendment(state, index, index_);

      console.log('\nGenerating final full text for chapter', index+1, 'page', index_+1, '\n');

      let pageGenText = ''
      
      while (true) {
        try {
          pageGenText = await askOpenAI(`You are an author writing page ${index_+1} in chapter ${index+1} of a ${state.chapters}-chapter ${state.plotGenre} novel. \
          The plot summary for this chapter is ${state.chapterSummaryArray[index]}. ${amendment}. As you continue writing the next page, be sure to develop the \
          characters' background thoroughly, include dialogue and detailed literary descriptions of the scenery, and develop the plot. Do not mention page \
          or chapter numbers! Do not jump to the end of the plot and make sure there is plot continuity. Carefully read the summaries of the prior pages \ 
          before writing new plot. Make sure you fill an entire page of writing.`, 
          'writer', models[modelChoice].name, (models[modelChoice].tokenLimit - (state.chapterSummaryArray[index] + amendment)), 0.9)
          
          if (!pageGenText.choices) {
            console.log('error in pageGenText')
            console.log(pageGenText)
            pageGenText = 'error'
          }

          if (!pageGenText.choices[0]) {pageGenText = 'error'}
          if (!pageGenText.choices[0].message) {pageGenText = 'error'}

          if (pageGenText.choices[0].message.content) {
            pageGenText = pageGenText.choices[0].message.content;
            pageGenText = pageGenText.replaceAll('\n', '');
            state.fullText.push((`${pageGenText}\n`));
            
            process.stdout.write(`\u001B[36m\n\n\nChapter ${index+1}\n\nPage ${index_+1}\n\n ${pageGenText}\n\n`);

            const header = `\n\nChapter ${index + 1}, Page ${index_ + 1}\n\n`;
            await appendToFile(state.filename, header + pageGenText);

            const pageSummary = await generatePageSummary(pageGenText, modelChoice)
            state.pageSummaries.push(pageSummary);
          } else {
            pageGenText = 'error'
          }
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
}

function createPageQueryAmendment({fullText, sentenceSummaries}, index, index_) {

  let amendment = "";

  if (index_ == 0) {
    return "This is the first page of the chapter.";
  }

  if (index_ == 1 && modelChoice == 'gpt4') {
    return `Page 1 of this chapter reads as follows: \n${fullText[(index*20 + index_-1)]}\n`;
  };

  if (index_ == 2 && modelChoice == 'gpt4') {
    return `Pages ${index_-1} reads as follows: \n${fullText[(index*20 + index_-2)]}\n Page ${index_} reads as follows: ${fullText[(index*20 + index_-1)]}\n`;
  }

  //join the state.sentenceSummaries of all prior pages in the chapter so far
  let priorPages = '';

  for (let k=0; k<index_; k++) {
    if (k == 0) {priorPages = ''; return;};
    priorPages += `\nChapter ${index+1}, Page ${k+1}: ${sentenceSummaries[(index*20 + k)]}\n`;
  }

  if (index_ > 2 && modelChoice == 'gpt4') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. The full text of pages ${index_-2},${index_-1} and ${index_} read as follows: Page ${index_-2}: ${fullText[(index*20 + index_-3)]} Page ${index_-1}: ${fullText[(index*20 + index_-2)]} Page ${index_}: ${fullText[(index*20 + index_-1)]}`;
  }

  if (index_ > 0 && modelChoice == 'gpt35') {
    return `Here are the page summaries of the chapter thus far: ${priorPages}. Here is the full text of page ${index_}: ${fullText[(index*20 + index_-1)]}`;
  }

  return amendment;
}

main();
