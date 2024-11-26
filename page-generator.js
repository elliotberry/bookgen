import askOpenRouter from './askOpenRouter.js';
import models from './models.js';
import appendToFile from './append.js';
import generatePageSummary from './generate-page-summary.js';
import createPageQueryAmendment from './create-page-query-amendment.js';



async function pageGenerator(model, {chapterLength, chapterSummaryArray, chapters, modelChoice, plotGenre, filename}) {
  console.log('\nEntering Page Generation module.\n');

  let chapterNumber = 0;
  for await (let chapter of chapters) {
    chapterNumber++;
    let pageNumber = 0;
    for await (let page of chapter) {
      pageNumber++;
      // let pageToWrite = i*20 + j+1;
      let amendment = createPageQueryAmendment(state, chapterNumber, pageNumber);

      console.log('\nGenerating final full text for chapter', index + 1, 'page', index_ + 1, '\n');

      let pageGenText = '';

      while (true) {
        try {
          pageGenText = await askOpenRouter(
            `You are an author writing page ${index_ + 1} in chapter ${index + 1} of a ${chapters}-chapter ${plotGenre} novel. \
          The plot summary for this chapter is ${chapterSummaryArray[index]}. ${amendment}. As you continue writing the next page, be sure to develop the \
          characters' background thoroughly, include dialogue and detailed literary descriptions of the scenery, and develop the plot. Do not mention page \
          or chapter numbers! Do not jump to the end of the plot and make sure there is plot continuity. Carefully read the summaries of the prior pages \ 
          before writing new plot. Make sure you fill an entire page of writing.`,
            'writer',
            model.name,
            model.tokenLimit - (chapterSummaryArray[index] + amendment),
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

          if (pageGenText.choices[0].message.content) {
            pageGenText = pageGenText.choices[0].message.content;
            pageGenText = pageGenText.replaceAll('\n', '');
            fullText.push(`${pageGenText}\n`);

            process.stdout.write(`\u001B[36m\n\n\nChapter ${index + 1}\n\nPage ${index_ + 1}\n\n ${pageGenText}\n\n`);

            const header = `\n\nChapter ${index + 1}, Page ${index_ + 1}\n\n`;
            await appendToFile(filename, header + pageGenText);

            const pageSummary = await generatePageSummary(pageGenText, modelChoice);
            pageSummaries.push(pageSummary);
          } else {
            pageGenText = 'error';
          }
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
}

export default pageGenerator;
