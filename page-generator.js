import {askOpenAI} from "./ask-open-AI.js";
import models from './models.js';
import appendToFile from './append.js';


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
  


function createPageQueryAmendment({modelChoice, fullText, sentenceSummaries}, index, index_) {

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
async function pageGenerator(state) {
 const modelChoice = state.modelChoice;
  console.log('\nEntering Page Generation module.\n');

  for (let index=0; index<state.chapters; index++){
    for (let index_=0; index_<20; index_++) {

      // let pageToWrite = i*20 + j+1;
     let  amendment = createPageQueryAmendment(state, index, index_);

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

export default pageGenerator;