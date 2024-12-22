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
let padding = process.argv[5] || 500;

var bookGenre = 'Train-Themed Lesbian Hardcore Erotica';
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
  "mistralai/ministral-8b": {
    name: "mistralai/ministral-8b",
    tokenLimit: 32000,
  }
};

const formatFileName = str => str.split(' ').join('_').split('/').join('-').toLowerCase();

function countWords(str) {
  return str.trim().split(/\s+/).length;
}

async function generateOutline(state) {
  let outlinePrompt = `Generate the outline of an original ${state.totalPages}-page ${state.bookGenre} fiction book. Imagine and then carefully label the following: a detailed plot, characters with names, settings and writing style. You have ${
    modelConfigurations[selectedModel].tokenLimit - (40 + padding)
  } words remaining to write the outline. It is CRITICAL you use as many words as possible.`;

  console.log(`Generating Outline:`);

  let outline = await askOpenRouter(outlinePrompt, 'writer', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (40 + padding), 0.9);

  outline = outline.choices[0].message.content;

  console.log(`Here is the raw outline:`);

  console.log(`${outline}`);
  return outline;
}

async function main() {
  let state = {
    totalPages,
    chapters: totalChapters,
    bookGenre: '',
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
  state = createProxy(state, `state-${baseFilename}.json`);
  state.bookGenre = bookGenre;
  state.filename = formatFileName(`${baseFilename}.txt`);
  state.finalFilename = formatFileName(`${baseFilename}.txt-1`);
  fs.writeFile(state.filename, '', err => {
    if (err) {
      throw err;
    }
  });
  fs.writeFile(state.finalFilename, '', err => {
    if (err) {
      throw err;
    }
  });
  state.rawOutline = await generateOutline(state);
  state = await populateState(state);
  state.chapterByChapterSummary = await generateChapterSummaries(state);
  state.chapterSummaries = await generateChapterSummaryArray(state);
  state.pageSummaries = await generatePages(state);
}



async function populateState(state) {
  console.log('\nPopulating state from raw outline.\n');

  let itemsToPopulate = {
    plotOutline: 'plot',
    mainCharacters: 'main characters list',
    minorCharacters: 'minor characters list',
    plotSettings: 'setting',
    writingStyle: 'writing style',
    writingAdjectives: 'writing adjectives list',
  };

  for (const [key, description] of Object.entries(itemsToPopulate)) {
    let populatePrompt = `I'm going to give you the outline of a book. From this outline, tell me the ${description}. Use close to ${modelConfigurations[selectedModel].tokenLimit - (500 + state.rawOutline + padding)} words for this page. Here is the outline: ${state.rawOutline}`;

    let result = await askOpenRouter(populatePrompt, 'machine', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (state.rawOutline.length + padding), 0.9);

    console.log(result);
    result = result.choices[0].message.content;

    state[key] = result;
    console.log(`here is the ${description}: ${result}\n`);
  }

  console.log(`Here is the state object:\n`);
  let textToSave = `\n${JSON.stringify(state)}\n`;
  fs.appendFile(state.filename, textToSave, err => {
    if (err) {
      throw err;
    }
  });
  console.log(state);
  return state;
}

async function generateChapterSummaries(state) {
  console.log('Generating chapter-by-chapter plot summary.');

  let chapterSummaryText = await askOpenRouter(
    `You are writing a book with this plot summary: ${state.plotOutline}. The book is ${
      state.totalPages
    } pages long. Write a specific and detailed plot SUMMARY for each of the ten chapters of the book. You must use at least a few paragraphs per chapter summary and can use up to one page or more per chapter. Name any unnamed major or minor characters. Use the first few chapter summaries to introduce the characters and set the story. Use the next few chapter summaries for action and character development. Use the last few chapters for dramatic twists in the plot and conclusion. You have ${
      modelConfigurations[selectedModel].tokenLimit - (state.plotOutline.length + 500 + padding)
    } tokens (or words) left for the summaries. Try to use all the words you have available.`,
    'writer',
    modelConfigurations[selectedModel].name,
    modelConfigurations[selectedModel].tokenLimit - (state.plotOutline.length + padding),
    0.9,
  );

  let condition = true;
  while (condition == true) {
    try {
      console.log(chapterSummaryText);
      chapterSummaryText = chapterSummaryText.choices[0].message.content;
      chapterSummaryText = chapterSummaryText.split(/\n/).filter(({length}) => length > 5);
      console.log(`Chapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`);
      let textToSave = `\n\nChapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`;
      fs.appendFile(state.filename, textToSave, err => {
        if (err) {
          throw err;
        }
      });
      return chapterSummaryText;
    } catch (err) {}
  }
}

async function generateChapterSummaryArray(state) {
  for (let i = 0; i < state.chapters; i++) {
    console.log(`Generating chapter summaries to populate chapterSummaries.\n`);

    let shortSummaryText = '';
    let condition = true;
    while (condition) {
      try {
        console.log(`Generating short summary of Chapter ${i + 1}:`);

        shortSummaryText = await askOpenRouter(
          `You are writing a summary of Chapter ${i + 1} of a ${state.chapters} chapter ${state.bookGenre} book. The entire plot summary is ${state.plotOutline} The chapter-by-chapter summary for the entire book is: \n${
            state.chapterByChapterSummary
          }\n Using those summaries, write a several page SUMMARY of ONLY chapter ${
            i + 1
          }. Write the best summary you can, you may add new subplots, character development, character background, planned dialogue and plot development that you would typically find in such a work. You are NOT writing the actual book right now, you ARE writing an outline and SUMMARY of what will happen in this chapter. You have to write ${
            modelConfigurations[selectedModel].tokenLimit - (500 + state.plotOutline + state.chapterByChapterSummary.length + padding)
          } words.`,
          'writer',
          modelConfigurations[selectedModel].name,
          modelConfigurations[selectedModel].tokenLimit - (state.plotOutline + state.chapterByChapterSummary + padding),
          0.9,
        );

        if (!shortSummaryText.choices[0]) {
          shortSummaryText = 'error';
        }
        if (!shortSummaryText.choices[0].message) {
          shortSummaryText = 'error';
        }
        if (!shortSummaryText.choices[0].message.content) {
          shortSummaryText = 'error';
        } else {
          shortSummaryText = shortSummaryText.choices[0].message.content;
          shortSummaryText = shortSummaryText.replace(/\n/g, '');
          state.chapterSummaries.push(shortSummaryText);
          process.stdout.write(`\r\x1b[35mHere is the chapter summary: \n${state.chapterSummaries[i]}\n`);
          condition = false;
          let textToSave = `${`\nChapter ${i} Summary` + state.chapterSummaries[i]}\n`;
          fs.appendFile(state.filename, textToSave, err => {
            if (err) {
              throw err;
            }
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
  return state;
}

const generatePageSummary = async (page, selectedModel) => {
  while (true) {
    try {
      const pageSummaryText = await askOpenRouter(`Here is a full page of text. Please summarize it in a few sentences. Text to summarize: ${page}`, 'machine', modelConfigurations[selectedModel].name, modelConfigurations[selectedModel].tokenLimit - (page.length + padding), 0.5);

      if (pageSummaryText.choices && pageSummaryText.choices[0]) {
        return pageSummaryText.choices[0].message.content;
      } else {
        console.log('Error summarizing:', pageSummaryText);
      }
    } catch (err) {
      console.log(err);
    }
  }
};

const appendToFile = (filename, text) =>
  new Promise((resolve, reject) => {
    fs.appendFile(filename, text, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

async function generatePages(state) {
  console.log('Entering Page Generation module.\n');

  let chapterIterator = Array.from({length: state.chapters}, (_, i) => i);

  for await (let chapter of chapterIterator) {
    let i = chapter;
    console.log(`Generating pages for chapter ${i + 1}.\n`);
    let pageIterator = Array.from({length: chapterSize}, (_, j) => j);
    for await (let pageNumber of pageIterator) {
      let j = pageNumber;
      console.log(`Generating page ${j + 1} in chapter ${i + 1}.\n`);
     
      let amendment = createPageQueryAmendment(state, i, j);

      console.log('Generating final full text for chapter ', i + 1, ' page ', j + 1, '\n');

      let pageGenText = 'error';

      while (pageGenText === 'error') {
        try {
          pageGenText = await askOpenRouter(
            `You are an author writing page ${j + 1} in chapter ${i + 1} of a ${state.chapters}-chapter ${state.bookGenre} novel. \
          The plot summary for this chapter is ${state.chapterSummaries[i]}. ${amendment}. As you continue writing the next page, be sure to develop the \
          characters' background thoroughly, include dialogue and detailed literary descriptions of the scenery, and develop the plot. Do not mention page \
          or chapter numbers! Do not jump to the end of the plot and make sure there is plot continuity. Carefully read the summaries of the prior pages \ 
          before writing new plot. Make sure you fill an entire page of writing.`,
            'writer',
            modelConfigurations[selectedModel].name,
            modelConfigurations[selectedModel].tokenLimit - (state.chapterSummaries[i] + amendment),
            0.9,
          );

          if (!pageGenText.choices) {
            console.log('error in pageGenText');
            console.log(pageGenText);
            pageGenText = 'error';
          }

          if (!pageGenText.choices[0]) {
            pageGenText = 'error';
          }
          if (!pageGenText.choices[0].message) {
            pageGenText = 'error';
          }

          if (!pageGenText.choices[0].message.content) {
            pageGenText = 'error';
          } else {
            pageGenText = pageGenText.choices[0].message.content;
            pageGenText = pageGenText.replace(/\n/g, '');
            state.fullText.push(`${pageGenText}\n`);

            console.log(`Chapter ${i + 1}\nPage ${j + 1}\n ${pageGenText}`);

            const header = `\n\nChapter ${i + 1}, Page ${j + 1}\n\n`;
            await appendToFile(state.filename, header + pageGenText);
            await appendToFile(state.finalFilename, header + pageGenText);
            let pageSummary = await generatePageSummary(pageGenText, selectedModel);
            state.pageSummaries.push(pageSummary);
          }
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
}

function createPageQueryAmendment({fullText, sentenceSummaries}, i, j) {
  let amendment = '';

  if (j == 0) {
    amendment = 'This is the first page of the chapter.';
    return amendment;
  }

  if (j == 1 && selectedModel == 'gpt4') {
    amendment = `Page 1 of this chapter reads as follows: \n${fullText[i * 20 + j - 1]}\n`;
    return amendment;
  }

  if (j == 2 && selectedModel == 'gpt4') {
    amendment = `Pages ${j - 1} reads as follows: \n${fullText[i * 20 + j - 2]}\n Page ${j} reads as follows: ${fullText[i * 20 + j - 1]}\n`;
    return amendment;
  }

  //join the state.sentenceSummaries of all prior pages in the chapter so far
  let priorPages = '';

  for (let k = 0; k < j; k++) {
    if (k == 0) {
      priorPages = '';
      return;
    }
    priorPages = priorPages + `\nChapter ${i + 1}, Page ${k + 1}: ${sentenceSummaries[i * 20 + k]}\n`;
  }

  if (j > 2 && selectedModel == 'gpt4') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. The full text of pages ${j - 2},${j - 1} and ${j} read as follows: Page ${j - 2}: ${fullText[i * 20 + j - 3]} Page ${j - 1}: ${fullText[i * 20 + j - 2]} Page ${j}: ${fullText[i * 20 + j - 1]}`;
  }

  if (j > 0 && selectedModel == 'gpt35') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. Here is the full text of page ${j}: ${fullText[i * 20 + j - 1]}`;
  }

  return amendment;
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
