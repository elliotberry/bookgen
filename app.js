import 'dotenv/config'
import fs from 'node:fs';
import readline from 'readline';
import overview from './overview.js';
import appendToFile from './append.js';
import {askOpenAI} from "./ask-open-AI.js";
import getGenre from './get-genre.js';
import models from './models.js';
import pageGenerator from './page-generator.js';
import State from './state.js';

//GLOBALS
const modelChoice = process.argv[2] || 'gpt4';
const chapterLength = process.argv[4] || 10;
const desiredPages = process.argv[3] || 200;
const padAmount = process.argv[5] || 500;



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
  state.update('rawOutline', outline);
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
     // const textToSave = `\n\nChapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`;
     // fs.appendFile(state.filename, textToSave, (error) => {
     //   if (error) {throw error;}
    //  });
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
         // state.chapterSummaryArray.push(shortSummaryText);
         let newArray = [...state.chapterSummaryArray, shortSummaryText];
        state.update('chapterSummaryArray', newArray);
        
         process.stdout.write(`\r\u001B[35mHere is the chapter summary: \n${state.chapterSummaryArray[index]}\n`);
          condition = false;
       //   const textToSave = `\nChapter ${index} Summary${state.chapterSummaryArray[index]}\n`;
         // fs.appendFile(state.filename, textToSave, (error) => {
          //  if (error) {throw error;}
         // });
        } else {
          shortSummaryText = 'error';
        }        
      } catch (error) {
        console.log(error);
      }
    }
  }
  state.update('chapterSummaryArray', state.chapterSummaryArray);
  return state;
}

async function main() {
  var state = new State({modelChoice, chapterLength, desiredPages, padAmount});
  var plotGenre = getGenre();
  state.update('plotGenre', plotGenre);
  //state.filename = `${state.plotGenre}${modelChoice}${Math.round(Math.random()*100)}.txt`;
  await outlineGenerator(state);

  //state = await statePopulator(state);
  await overview(state);
  await plotSummaryByChapter(state);
  await chapterSummaryArray(state);
  await pageGenerator(state);
}
main();
