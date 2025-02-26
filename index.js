import 'dotenv/config';
import chalk from 'chalk';
import createFolderIfItDoesNotExist from 'elliotisms/createFolderIfItDoesNotExist';
import fs from 'node:fs/promises';
import path from 'node:path';
import outputBook from './output.js';
import {askOpenRouter} from './ask-open-router.js';
import {loadProgress, saveProgress} from './progress.js';
import { countWords, removeHeadlinesFromPage, formatFileName } from './string-functions.js';

async function main() {
  const genre = process.argv[2];
  const numberChapters = Number.parseInt(process.argv[3], 10);
  const pagesPerChapter = Number.parseInt(process.argv[4], 10);
  const llmModel = process.argv[5] || 'amazon/nova-micro-v1';

  console.log(chalk.green(`Generating a ${genre} book with ${numberChapters} chapters, each with ${pagesPerChapter} pages, using the ${llmModel} model...`));
  if (!genre || isNaN(numberChapters) || isNaN(pagesPerChapter)) {
    console.error(chalk.red('Usage: node book_writer.js <genre> <numChapters> <pagesPerChapter> [llmModel]'));
    process.exit(1);
  }
  await createFolderIfItDoesNotExist('./output');

  let shortGenre = genre.split(' ').join('-').toLowerCase();
  shortGenre = shortGenre.slice(0, 10);
  const filename = formatFileName(`${shortGenre}_${numberChapters}_${pagesPerChapter}_${llmModel}`);
  const saveFileName = path.resolve(`./output/${filename}.json`);
  const outputFileName = path.resolve(`./output/${filename}.txt`);

  const progress = {
    chapters: [],
    genre,
    llmModel,
    numChapters: numberChapters,
    pagesPerChapter,
  };

  try {
    // Generate a book summary if not already done.
    if (!progress.bookSummary) {
      console.log('Generating book summary.');
      progress.bookSummary = await askOpenRouter(`Write a detailed summary for a ${genre} book.`, 'writer', llmModel);
      await saveProgress(progress, saveFileName);
    }

    // Generate chapter summaries if not already done.
    for (let chapterIndex = progress.chapters.length; chapterIndex < numberChapters; chapterIndex++) {
      console.log(`Generating summary for Chapter ${chapterIndex + 1}...`);
      let additionalInfo = '';
      if (chapterIndex === 0) {
        additionalInfo = 'This is the first chapter of the book.';
      } else if (chapterIndex === numberChapters - 1) {
        additionalInfo = 'This is the last chapter of the book.';
      }else {
        additionalInfo = `This is chapter ${chapterIndex + 1} of the book. The last chapter summary was: ${progress.chapters[chapterIndex - 1].summary}`;
      }
      const chapterSummary = await askOpenRouter(`Summarize Chapter ${chapterIndex + 1} for a ${genre} book. The book is ${numberChapters} chapters long. Use this summary of the book: ${progress.bookSummary}. ${additionalInfo}`, 'writer', llmModel);
      progress.chapters.push({pages: [], summary: chapterSummary});
      console.log(`received a ${countWords(chapterSummary)} word summary for chapter ${chapterIndex + 1}`);
      await saveProgress(progress, saveFileName);
    }

    // Generate page summaries and content for each chapter.
    for (let chapterIndex = 0; chapterIndex < numberChapters; chapterIndex++) {
      const chapter = progress.chapters[chapterIndex];
      for (let pageIndex = chapter.pages.length; pageIndex < pagesPerChapter; pageIndex++) {
        console.log(`Generating summary for Chapter ${chapterIndex + 1}, Page ${pageIndex + 1}...`);
        const pageSummary = await askOpenRouter(`Summarize Page ${pageIndex + 1} of Chapter ${chapterIndex + 1} based on the following summary of the chapter:\n${chapter.summary}`, 'writer', llmModel);
        console.log(`received a ${countWords(pageSummary)} word summary for page ${pageIndex + 1}`);
        const pageContent = await askOpenRouter(`Write Page ${pageIndex + 1} of Chapter ${chapterIndex + 1} for a book about: ${genre}. Use this summary of the page: ${pageSummary}. Use as many words as possible.`, 'writer', llmModel);
        console.log(`received a ${countWords(pageContent)} word page for page ${pageIndex + 1}`);
        const filteredPageContent = removeHeadlinesFromPage(pageContent);
        chapter.pages.push({content: pageContent, filteredContent: filteredPageContent, summary: pageSummary});
        await saveProgress(progress, saveFileName);
      }
    }

    console.log('Book generation completed! Final word count:', progress.chapters.reduce((total, chapter) => total + chapter.pages.reduce((total, page) => total + countWords(page.content), 0), 0));
    console.log(`Final book data saved to ${saveFileName}`);

    // Output the final book to a text file.
    await outputBook(progress, outputFileName);
    console.log(`Full book saved as ${outputFileName}`);
  } catch (error) {
    console.error('Error during book generation:', error);
  }
}





main().catch(error => console.error(error));
