import 'dotenv/config';
import chalk from 'chalk';
import createFolderIfItDoesNotExist from 'elliotisms/createFolderIfItDoesNotExist'
import fs from 'node:fs/promises';
import path from 'node:path';

import { askOpenRouter } from './ask-open-router.js';
const countWords = (string_) => string_.split(/\s+/).length;


const removeHeadlinesFromPage = (page) => {
  const lines = page.split('\n')
  const badLineStarters = ['chapter', 'page', '** chapter', '** page'];
const filtered = lines.filter(line => !badLineStarters.some(badLineStarter => line.toLowerCase().startsWith(badLineStarter)))

  return filtered.join('\n')
}

async function main() {
  const genre = process.argv[2];
  const numberChapters = Number.parseInt(process.argv[3], 10);
  const pagesPerChapter = Number.parseInt(process.argv[4], 10);
  const llmModel = process.argv[5] || 'sao10k/l3.3-euryale-70b';

  console.log(chalk.green(`Generating a ${genre} book with ${numberChapters} chapters, each with ${pagesPerChapter} pages, using the ${llmModel} model...`));
  if (!genre || isNaN(numberChapters) || isNaN(pagesPerChapter)) {
    console.error(chalk.red('Usage: node book_writer.js <genre> <numChapters> <pagesPerChapter> [llmModel]'));
    process.exit(1);
  }
  await createFolderIfItDoesNotExist('./output')
  const formatFileName = string_ => string_.split(' ').join('_').split('/').join('-').toLowerCase();
  let shortGenre = genre.split(' ').join('-').toLowerCase();
  shortGenre = shortGenre.slice(0, 10);
  const filename = formatFileName(`${shortGenre}_${numberChapters}_${pagesPerChapter}_${llmModel}`);
  const saveFileName = path.resolve(`./output/${filename}.json`);
  const outputFileName = path.resolve(`./output/${filename}.txt`);

  const progress = await loadProgress(saveFileName) || {
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
      const chapterSummary = await askOpenRouter(
        `Summarize Chapter ${chapterIndex + 1} for a ${genre} book. The book is ${numberChapters} chapters long. Use this summary of the book: ${progress.bookSummary}`,
        'writer',
        llmModel
      );
      progress.chapters.push({ pages: [], summary: chapterSummary });
      await saveProgress(progress, saveFileName);
    }

    // Generate page summaries and content for each chapter.
    for (let chapterIndex = 0; chapterIndex < numberChapters; chapterIndex++) {
      const chapter = progress.chapters[chapterIndex];
      for (let pageIndex = chapter.pages.length; pageIndex < pagesPerChapter; pageIndex++) {
        console.log(`Generating summary for Chapter ${chapterIndex + 1}, Page ${pageIndex + 1}...`);
        const pageSummary = await askOpenRouter(
          `Summarize Page ${pageIndex + 1} of Chapter ${chapterIndex + 1} based on the following summary of the chapter:\n${chapter.summary}`,
          'writer',
          llmModel
        );
        const pageContent = await askOpenRouter(
          `Write Page ${pageIndex + 1} of Chapter ${chapterIndex + 1} for a ${genre} book. Use this summary of the page: ${pageSummary}`,
          'writer',
          llmModel
        );
        const filteredPageContent = removeHeadlinesFromPage(pageContent)
        chapter.pages.push({ content: pageContent, filteredContent: filteredPageContent, summary: pageSummary});
        await saveProgress(progress, saveFileName);
      }
    }

    console.log('Book generation completed!');
    console.log(`Final book data saved to ${saveFileName}`);

    // Output the final book to a text file.
    await outputBook(progress, outputFileName);
    console.log(`Full book saved as ${outputFileName}`);
  } catch (error) {
    console.error('Error during book generation:', error);
  }
}

async function loadProgress(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return null; // No progress file found.
    throw error;
  }
}

async function saveProgress(progress, filePath) {
  await fs.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf-8');
}

async function outputBook(progress, filePath) {
  const bookContent = [];


  for (const [chapterIndex, chapter] of progress.chapters.entries()) {


    for (const [pageIndex, page] of chapter.pages.entries()) {
   
      bookContent.push(page.filteredPageContent);
    }

    bookContent.push('\n');
  }

  await fs.writeFile(filePath, bookContent.join('\n'), 'utf-8');
}

main().catch((error) => console.error(error));
