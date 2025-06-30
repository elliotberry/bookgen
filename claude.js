import 'dotenv/config';
import chalk from 'chalk';
import createFolderIfItDoesNotExist from 'elliotisms/createFolderIfItDoesNotExist';
import prompts from 'prompts';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import pLimit from 'p-limit';
import epub from 'epub-gen';
import path from 'node:path';

import { askOpenRouter } from './ask-open-router.js';
import outputBook from './output.js';
import { loadProgress, saveProgress } from './progress.js';
import { countWords, formatFileName, removeHeadlinesFromPage } from './string-functions.js';
import promptTemplates from './prompts.js';

const makeFilenames = (genre, numberChapters, pagesPerChapter, llmModel) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let shortGenre = genre.split(' ').join('-').toLowerCase();
  shortGenre = shortGenre.slice(0, 10);
  const baseFilename = formatFileName(`${shortGenre}_${numberChapters}ch_${pagesPerChapter}pg_${llmModel}_${timestamp}`);
  
  return {
    saveFileName: path.resolve(`./output/${baseFilename}.json`),
    outputFileName: path.resolve(`./output/${baseFilename}.txt`),
    epubFileName: path.resolve(`./output/${baseFilename}.epub`),
  };
};

async function main() {
  // Parse command line arguments with yargs
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <genre> <numChapters> <pagesPerChapter> [options]')
    .demandCommand(3, 'Please provide genre, number of chapters, and pages per chapter')
    .option('model', {
      alias: 'm',
      describe: 'LLM model to use',
      default: 'deepseek/deepseek-r1'
    })
    .option('words', {
      alias: 'w',
      describe: 'Target word count for the book',
      type: 'number',
      default: 50000
    })
    .help('h')
    .alias('h', 'help')
    .argv;

  const genre = argv._[0];
  const numberChapters = Number.parseInt(argv._[1], 10);
  const pagesPerChapter = Number.parseInt(argv._[2], 10);
  const llmModel = argv.model;
  const targetWordCount = argv.words;
  const wordsPerPage = Math.ceil(targetWordCount / (numberChapters * pagesPerChapter));

  // Parameter validation
  if (isNaN(numberChapters) || numberChapters <= 0) {
    console.error(chalk.red('Number of chapters must be a positive number'));
    process.exit(1);
  }
  
  if (isNaN(pagesPerChapter) || pagesPerChapter <= 0) {
    console.error(chalk.red('Pages per chapter must be a positive number'));
    process.exit(1);
  }
  
  const { saveFileName, outputFileName, epubFileName } = makeFilenames(genre, numberChapters, pagesPerChapter, llmModel);
  console.log(chalk.green(`Generating a ${genre} book with ${numberChapters} chapters, each with ${pagesPerChapter} pages, using the ${llmModel} model...`));
  console.log(chalk.blue(`Target word count: ${targetWordCount} (approx. ${wordsPerPage} words per page)`));

  await createFolderIfItDoesNotExist('./output');

  // Set up rate limiting
  const limit = pLimit(1); // Adjust number based on API limits

  // Initialize progress or load existing
  let progress = {
    chapters: [],
    genre,
    llmModel,
    numChapters: numberChapters,
    pagesPerChapter,
    targetWordCount,
  };

  // Check for existing progress
  try {
    const existingProgress = await loadProgress(saveFileName);
    if (existingProgress) {
      const continueResponse = await prompts({
        type: 'confirm',
        name: 'continue',
        message: `Found existing progress file. Continue from where you left off?`
      });
      
      if (continueResponse.continue) {
        progress = existingProgress;
        console.log(chalk.green(`Continuing from previous session...`));
      }
    }
  } catch (err) {
    // No existing progress or corrupt file, that's okay
    console.log(chalk.yellow(`Starting fresh book generation...`));
  }

  try {
    // Generate a book summary if not already done.
    if (!progress.bookSummary) {
      const spinner = ora('Generating book summary...').start();
      progress.bookSummary = await limit(() => 
        askOpenRouter(promptTemplates.fullSummary(genre), 'writer', llmModel)
      );
      spinner.succeed(`Book summary generated (${countWords(progress.bookSummary)} words)`);
      await saveProgress(progress, saveFileName);
    }

    // Generate chapter summaries if not already done.
    for (let chapterIndex = progress.chapters.length; chapterIndex < numberChapters; chapterIndex++) {
      const spinner = ora(`Generating summary for Chapter ${chapterIndex + 1}...`).start();
      let additionalInfo = '';
      if (chapterIndex === 0) {
        additionalInfo = 'This is the first chapter of the book.';
      } else if (chapterIndex === numberChapters - 1) {
        additionalInfo = 'This is the last chapter of the book.';
      } else {
        additionalInfo = `This is chapter ${chapterIndex + 1} of ${numberChapters}. The last chapter summary was: ${progress.chapters[chapterIndex - 1].summary}`;
      }
      
      const chapterPrompt = `Summarize Chapter ${chapterIndex + 1} for a ${genre} book. 
The book is ${numberChapters} chapters long. 
Book Summary: ${progress.bookSummary}
${additionalInfo}
This summary will be used to guide the writing of the chapter.`;

      const chapterSummary = await limit(() => 
        askOpenRouter(chapterPrompt, 'writer', llmModel)
      );
      progress.chapters.push({pages: [], summary: chapterSummary});
      spinner.succeed(`Chapter ${chapterIndex + 1} summary generated (${countWords(chapterSummary)} words)`);
      await saveProgress(progress, saveFileName);
    }
   
    // Generate page content for each chapter.
    for (let chapterIndex = 0; chapterIndex < numberChapters; chapterIndex++) {
      const chapter = progress.chapters[chapterIndex];
      for (let pageIndex = chapter.pages.length; pageIndex < pagesPerChapter; pageIndex++) {
        const spinner = ora(`Generating content for Chapter ${chapterIndex + 1}, Page ${pageIndex + 1}...`).start();
        
        let lastPageTrailingContent = '';
        if (pageIndex > 0) {
          lastPageTrailingContent = chapter.pages[pageIndex - 1].content.split('\n').slice(-2).join('\n');
        }
        
        const pagePrompt = `Write Page ${pageIndex + 1} of Chapter ${chapterIndex + 1} for a ${genre} book.
Book Summary: ${progress.bookSummary}
Chapter Summary: ${chapter.summary}
${pageIndex > 0 ? `Previous Page Ending: "${lastPageTrailingContent}"` : 'This is the first page of the chapter.'}
${pageIndex === pagesPerChapter - 1 ? 'This is the last page of this chapter.' : ''}
Try to write approximately ${wordsPerPage} words for this page.

Write a compelling, continuous narrative that flows naturally from any previous content.`;

        const pageContent = await limit(() => 
          askOpenRouter(pagePrompt, 'writer', llmModel)
        );

        // Quality check
        const qualityCheckSpinner = ora('Checking content quality...').start();
        const qualityCheck = await limit(() => 
          askOpenRouter(`
            Rate the following page content for quality on a scale of 1-10, and provide a single-sentence explanation:
            ${pageContent}
          `, 'writer', llmModel)
        );

        if (qualityCheck.includes('rating: [1-5]') || qualityCheck.toLowerCase().includes('poor')) {
          qualityCheckSpinner.fail(`Quality check flagged this content. Regenerating...`);
          // Regenerate the page with more specific guidance
          pageIndex--; // Retry this page
          continue;
        }
        qualityCheckSpinner.succeed(`Content quality check passed`);
        
        const filteredPageContent = removeHeadlinesFromPage(pageContent);
        chapter.pages.push({content: pageContent, filteredContent: filteredPageContent});
        
        spinner.succeed(`Chapter ${chapterIndex + 1}, Page ${pageIndex + 1} generated (${countWords(pageContent)} words)`);
        await saveProgress(progress, saveFileName);
      }
    }

    const totalWords = progress.chapters.reduce(
      (total, chapter) => total + chapter.pages.reduce(
        (chTotal, page) => chTotal + countWords(page.content), 0
      ), 0
    );

    console.log(
      chalk.green('Book generation completed! Final word count:'),
      chalk.cyan(totalWords),
      chalk.green(`(${Math.round((totalWords / targetWordCount) * 100)}% of target)`)
    );
    console.log(chalk.blue(`Final book data saved to ${saveFileName}`));

    // Output the final book to a text file.
    await outputBook(progress, outputFileName);
    console.log(chalk.blue(`Full book saved as ${outputFileName}`));

    // Generate EPUB file
    if (progress.chapters.length > 0) {
      const epubSpinner = ora('Generating EPUB file...').start();
      const epubOptions = {
        title: `${genre} Book`,
        author: 'AI Writer',
        publisher: 'AI Book Generator',
        cover: process.env.BOOK_COVER_IMAGE || null,
        content: progress.chapters.map((chapter, i) => ({
          title: `Chapter ${i+1}`,
          data: chapter.pages.map(page => page.filteredContent || page.content).join('\n')
        }))
      };
      
      try {
        await new epub(epubOptions, epubFileName).promise;
        epubSpinner.succeed(`EPUB book saved successfully as ${epubFileName}`);
      } catch (err) {
        epubSpinner.fail(`Failed to create EPUB: ${err.message}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('Error during book generation:'), error);
    // Save progress before exiting to ensure work isn't lost
    if (progress && Object.keys(progress).length > 0) {
      try {
        await saveProgress(progress, saveFileName);
        console.log(chalk.yellow('Progress saved before termination.'));
      } catch (saveError) {
        console.error(chalk.red('Failed to save progress:'), saveError);
      }
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Unhandled exception:'), error);
  process.exit(1);
});