import fs from 'fs/promises';
import path from 'path';
import { askOpenRouter } from './ask-open-router.js';
import createFolderIfItDoesNotExist from 'elliotisms/createFolderIfItDoesNotExist'
import 'dotenv/config';
import chalk from 'chalk';
const countWords = (str) => str.split(/\s+/).length;


async function main() {
  const genre = process.argv[2];
  const numChapters = parseInt(process.argv[3], 10);
  const pagesPerChapter = parseInt(process.argv[4], 10);
  const llmModel = process.argv[5] || 'mistralai/ministral-8b';

  console.log(chalk.green(`Generating a ${genre} book with ${numChapters} chapters, each with ${pagesPerChapter} pages, using the ${llmModel} model...`));
  if (!genre || isNaN(numChapters) || isNaN(pagesPerChapter)) {
    console.error(chalk.red('Usage: node book_writer.js <genre> <numChapters> <pagesPerChapter> [llmModel]'));
    process.exit(1);
  }
  await createFolderIfItDoesNotExist('./output')
  const formatFileName = str => str.split(' ').join('_').split('/').join('-').toLowerCase();
  let filename = formatFileName(`book_progress_${genre}_${numChapters}_${pagesPerChapter}_${llmModel}`);
  const saveFileName = path.resolve(`./output/${filename}.json`);
  const outputFileName = path.resolve(`./output/${filename}.txt`);

  let progress = await loadProgress(saveFileName) || {
    genre,
    numChapters,
    pagesPerChapter,
    llmModel,
    chapters: [],
  };

  try {
    // Generate a book summary if not already done.
    if (!progress.bookSummary) {
      console.log('Generating book summary.');
      progress.bookSummary = await askOpenRouter(`Write a detailed summary for a ${genre} book.`, 'writer', llmModel);
      await saveProgress(progress, saveFileName);
    }

    // Generate chapter summaries if not already done.
    for (let chapterIdx = progress.chapters.length; chapterIdx < numChapters; chapterIdx++) {
      console.log(`Generating summary for Chapter ${chapterIdx + 1}...`);
      const chapterSummary = await askOpenRouter(
        `Summarize Chapter ${chapterIdx + 1} for a ${genre} book. The book is ${numChapters} chapters long. Use this summary of the book: ${progress.bookSummary}`,
        'writer',
        llmModel
      );
      progress.chapters.push({ summary: chapterSummary, pages: [] });
      await saveProgress(progress, saveFileName);
    }

    // Generate page summaries and content for each chapter.
    for (let chapterIdx = 0; chapterIdx < numChapters; chapterIdx++) {
      const chapter = progress.chapters[chapterIdx];
      for (let pageIdx = chapter.pages.length; pageIdx < pagesPerChapter; pageIdx++) {
        console.log(`Generating summary for Chapter ${chapterIdx + 1}, Page ${pageIdx + 1}...`);
        const pageSummary = await askOpenRouter(
          `Summarize Page ${pageIdx + 1} of Chapter ${chapterIdx + 1} based on the following summary of the chapter:\n${chapter.summary}`,
          'writer',
          llmModel
        );
        const pageContent = await askOpenRouter(
          `Write Page ${pageIdx + 1} of Chapter ${chapterIdx + 1} for a ${genre} book. Use this summary of the page: ${pageSummary}`,
          'writer',
          llmModel
        );
        chapter.pages.push({ summary: pageSummary, content: pageContent });
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
    const data = await fs.readFile(filePath, 'utf-8');
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
 // bookContent.push(`Genre: ${progress.genre}`);
 // bookContent.push(`Book Summary: ${progress.bookSummary}\n`);

  progress.chapters.forEach((chapter, chapterIdx) => {
   // bookContent.push(`Chapter ${chapterIdx + 1}:`);
  //  bookContent.push(chapter.summary);

    chapter.pages.forEach((page, pageIdx) => {
     // bookContent.push(`Page ${pageIdx + 1}:`);
      bookContent.push(page.content);
    });

    bookContent.push('\n');
  });

  await fs.writeFile(filePath, bookContent.join('\n'), 'utf-8');
}

main().catch((err) => console.error(err));