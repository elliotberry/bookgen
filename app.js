import 'dotenv/config';
import createProxy from './create-proxy.js';
import fs from 'fs';
import {askOpenRouter} from './ask-open-router.js';
import chalk from 'chalk';

//GLOBALS
let selectedModel = process.argv[2] || 'mistralai/ministral-8b';
let chapterSize = process.argv[4] || 3;
let totalChapters = process.argv[3] || 2;
let totalPages = chapterSize * totalChapters;


let modelConfigurations = {
  gpt35: {
    name: 'gpt-3.5-turbo',
    tokenLimit: 4097,
  },
  gpt4: {
    name: 'gpt-4-0314',
    tokenLimit: 8000,
  },
  'meta-llama/llama-3.3-70b-instruct': {
    name: 'meta-llama/llama-3.3-70b-instruct',
    tokenLimit: 32000,
  },
  'google/gemini-2.0-flash-exp:free': {
    name: 'google/gemini-2.0-flash-exp:free',
    tokenLimit: 32000,
  },
  'google/gemini-flash-1.5-8b-exp': {
    name: 'google/gemini-flash-1.5-8b-exp',
    tokenLimit: 32000,
  },
  'anthropic/claude-3.5-sonnet:beta': {
    name: 'anthropic/claude-3.5-sonnet:beta',
    tokenLimit: 32000,
  },
  'mistralai/ministral-8b': {
    name: 'mistralai/ministral-8b',
    tokenLimit: 32000,
  },
};

const formatFileName = str => str.split(' ').join('_').split('/').join('-').toLowerCase();

function countWords(str) {
  return str.trim().split(/\s+/).length;
}

async function generateOutline(state) {
  let outlinePrompt = `Generate the outline of an original ${state.totalPages}-page ${state.bookGenre} fiction book. Imagine and then carefully label the following: a detailed plot, characters with names, settings and writing style. You have ${
    modelConfigurations[selectedModel].tokenLimit - (40 + state.padding)
  } words remaining to write the outline. It is CRITICAL you use as many words as possible.`;

  console.log(`Generating Outline`);

  let outline = await askOpenRouter(outlinePrompt, 'writer', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (40 + state.padding), 0.9);


  return outline;
}

async function populateState(state) {
  let itemsToPopulate = {
    plotOutline: 'plot',
    mainCharacters: 'main characters list',
    minorCharacters: 'minor characters list',
    plotSettings: 'setting',
    writingStyle: 'writing style',
    writingAdjectives: 'writing adjectives list',
  };


  
  for await (const [key, description] of Object.entries(itemsToPopulate)) {
    let lengthNote = ""; //`Use close to ${modelConfigurations[selectedModel].tokenLimit - (500 + state.rawOutlineWordsLength + state.padding)} words for this page.`;
    let populatePrompt = `I'm going to give you the outline of a book. From this outline, tell me the ${description}.${lengthNote} Here is the outline: ${state.rawOutline}`;
    let result = await askOpenRouter(populatePrompt, 'machine', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (state.rawOutlineWordsLength + state.padding), 0.9);
  

    state[key] = result;
    console.log(`populated ${key} state item`);
  }


  return state;
}

async function generateChapterSummaries(state) {
  console.log('Generating chapter-by-chapter plot summary.');

  let chapterSummaryText = await askOpenRouter(
    `You are writing a book with this plot summary: ${state.plotOutline}. The book is ${
      state.totalPages
    } pages long. Write a specific and detailed plot SUMMARY for each of the ${totalChapters} chapters of the book. You must use at least a few paragraphs per chapter summary and can use up to one page or more per chapter. Name any unnamed major or minor characters. Use the first few chapter summaries to introduce the characters and set the story. Use the next few chapter summaries for action and character development. Use the last few chapters for dramatic twists in the plot and conclusion. You have ${
      modelConfigurations[selectedModel].tokenLimit - (state.plotOutline.length + 500 + state.padding)
    } tokens (or words) left for the summaries. Try to use all the words you have available.`,
    'writer',
    modelConfigurations[selectedModel].name,
    modelConfigurations[selectedModel].tokenLimit - (state.plotOutline.length + state.padding),
    0.9,
  );


  chapterSummaryText = chapterSummaryText.split(/\n/).filter(({length}) => length > 5);
  state.chapterByChapterSummary = chapterSummaryText;
  return chapterSummaryText;
}

async function generateChapterSummaryArray(state) {
  let chapterSummaryIterator = Array.from({length: state.chapters}, (_, i) => i);
  console.log(`Generating chapter summaries to populate chapterSummaries.\n`);
  for await (let chapterSummary of chapterSummaryIterator) {
    let i = chapterSummary;
    

    console.log(`Generating short summary of Chapter ${i + 1}:`);
    let prompt = `You are writing a summary of Chapter ${i + 1} of a ${state.chapters} chapter ${state.bookGenre} book. The entire plot summary is ${state.plotOutline} The chapter-by-chapter summary for the entire book is: \n${
        state.chapterByChapterSummary
      }\n Using those summaries, write a several page SUMMARY of ONLY chapter ${
        i + 1
      }. Write the best summary you can, you may add new subplots, character development, character background, planned dialogue and plot development that you would typically find in such a work. You are NOT writing the actual book right now, you ARE writing an outline and SUMMARY of what will happen in this chapter. You have to write ${
        modelConfigurations[selectedModel].tokenLimit - (500 + state.plotOutline + state.chapterByChapterSummary.length + state.padding)
      } words.`;
  
    let shortSummaryText = await askOpenRouter(
      prompt,
      'writer',
      modelConfigurations[selectedModel].name,
      modelConfigurations[selectedModel].tokenLimit - (state.plotOutline + state.chapterByChapterSummary + state.padding),
      0.9,
    );


    shortSummaryText = shortSummaryText.replace(/\n/g, '');
    state.chapterSummaries.push(shortSummaryText);
  }
  return state;
}

const generatePageSummary = async (page, selectedModel, state) => {
  const pageSummaryText = await askOpenRouter(`Here is a full page of text. Please summarize it in a few sentences. Text to summarize: ${page}`, 'machine', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (page.length + state.padding), 0.5);

  return pageSummaryText;
};

async function generatePages(state) {
  console.log('Entering Page Generation.');

  let chapterIterator = Array.from({length: state.chapters}, (_, i) => i);

  for await (let chapter of chapterIterator) {
    let i = chapter;
    console.log(`Generating pages for chapter ${i + 1}.\n`);
    let pageIterator = Array.from({length: chapterSize}, (_, j) => j);
    for await (let pageNumber of pageIterator) {
      let j = pageNumber;
      console.log(`Generating page ${j + 1} in chapter ${i + 1}.\n`);

      let amendment = await createPageQueryAmendment(state, chapter, pageNumber);

      console.log('Generating final full text for chapter ', i + 1, ' page ', j + 1, '\n');

      let pageGenText = await askOpenRouter(
        `You are an author writing page ${j + 1} in chapter ${i + 1} of a ${state.chapters}-chapter ${state.bookGenre} novel. The plot summary for this chapter is ${state.chapterSummaries[i]}. ${amendment}. As you continue writing the next page, be sure to develop the characters' background thoroughly, include dialogue and detailed literary descriptions of the scenery, and develop the plot. Do not mention page or chapter numbers! Do not jump to the end of the plot and make sure there is plot continuity. Carefully read the summaries of the prior pages before writing new plot. Make sure you fill an entire page of writing.`,
        'writer',
        modelConfigurations[selectedModel].name,
        modelConfigurations[selectedModel].tokenLimit - (state.chapterSummaries[i] + amendment),
        0.9,
      );


     // pageGenText = pageGenText.replace(/\n/g, '');
     // state.fullText.push(`${pageGenText}\n`);

      const header = `\n\nChapter ${i + 1}, Page ${j + 1}\n\n`;
      let fullChapterText = header + pageGenText;
      state.fullText.push(fullChapterText);
     // let pageSummary = await generatePageSummary(pageGenText, selectedModel, state);
     // state.pageSummaries.push(pageSummary);
    }
  }
}

function createPageQueryAmendment({fullText, sentenceSummaries}, chapter, pageNumber) {
  let amendment = '';

  if (j == 0) {
    amendment = 'This is the first page of the chapter.';
    return amendment;
  }

  if (j == 1 && selectedModel == 'gpt4') {
    amendment = `Page 1 of this chapter reads as follows: \n${fullText[chapter * 20 + j - 1]}\n`;
    return amendment;
  }

  if (j == 2 && selectedModel == 'gpt4') {
    amendment = `Pages ${j - 1} reads as follows: \n${fullText[chapter * 20 + j - 2]}\n Page ${j} reads as follows: ${fullText[chapter * 20 + j - 1]}\n`;
    return amendment;
  }

  //join the state.sentenceSummaries of all prior pages in the chapter so far
  let priorPages = '';

  for (let k = 0; k < j; k++) {
    if (k == 0) {
      priorPages = '';
      return;
    }
    priorPages = priorPages + `\nChapter ${chapter + 1}, Page ${k + 1}: ${sentenceSummaries[chapter * 20 + k]}\n`;
  }

  if (j > 2 && selectedModel == 'gpt4') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. The full text of pages ${j - 2},${j - 1} and ${j} read as follows: Page ${j - 2}: ${fullText[chapter * 20 + j - 3]} Page ${j - 1}: ${fullText[chapter * 20 + j - 2]} Page ${j}: ${fullText[chapter * 20 + j - 1]}`;
  }

  if (j > 0 && selectedModel == 'gpt35') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. Here is the full text of page ${j}: ${fullText[chapter * 20 + j - 1]}`;
  }

  return amendment;
}

async function main() {
  let bookGenre = 'Train-Themed Lesbian Hardcore Erotica';
  let state = {
    totalPages,
    padding:500,
    chapters: totalChapters,
    bookGenre: bookGenre,
    rawOutline: '',
    plotOutline: '',
    mainCharacters: [],
    minorCharacters: [],
    writingStyle: '',
    writingAdjectives: '',
    plotSettings: [],
    chapterByChapterSummary: '',
    chapterSummaries: [],
    filename: '',
    fullText: [],
    pageSummaries: [],
  };
  let baseFilename = formatFileName(`${state.bookGenre}${selectedModel}${Math.round(Math.random() * 100)}`);
  state = createProxy(state, `./output/state-${baseFilename}.json`);

  state.rawOutline = await generateOutline(state);
 
  state.rawOutlineWordsLength = countWords(state.rawOutline);
  state = await populateState(state);
  await generateChapterSummaries(state);
  await generateChapterSummaryArray(state);
  state.pageSummaries = await generatePages(state);

  let fullText = state.fullText.join('\n');
  fs.writeFile(`./output/${baseFilename}--full.txt`, fullText, err => {
    if (err) {
      throw err;
    }
  })
}

main();

//1. Identify what the main theme or plot of the novel is going to be
//2. Brainstorm ideas for the main characters, their traits, and struggles.
//3. Create a timeline for the novel, including significant events and developments that will take place.
//4. Develop a setting for the novel, either real or imaginary.
//5. Establish the main characters and their motivations.
//6. Introduce the initial conflict and how it will be solved.
//7. Develop sub-plots for the novel using the characters and their struggles.
//8. Introduce necessary complications, such as other characters, that will further the story.
//9. Describe the environments, scenery, and settings that the characters will interact with
//10. Develop the climax of the novel and resolve the conflict
//11. Describe the resolution of the novel, explaining how it all wraps up
//12. Run the novel through Open AI and have it generate successive, non-repetitive chapters based on the initial input and timeline
