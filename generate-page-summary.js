import appendToFile from './append.js';
import askOpenRouter from './askOpenRouter.js';
import models from './models.js';


const generatePageSummary = async (model, page, {padAmount}) => {
  while (true) {
    try {
      const pageSummaryText = await askOpenRouter(`Here is a full page of text. Please summarize it in a few sentences. Text to summarize: ${page}`, 'machine', model.name, model.tokenLimit - (page.length + padAmount), 0.5);

      if (pageSummaryText.choices && pageSummaryText.choices[0]) {
        return pageSummaryText.choices[0].message.content;
      }
      console.log('Error summarizing:', pageSummaryText);
    } catch (error) {
      console.log(error);
    }
  }
};

export default generatePageSummary;