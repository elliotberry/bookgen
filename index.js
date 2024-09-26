import 'dotenv/config'
import fs from 'node:fs';
import readline from 'readline';
import overview from './overview.js';
import appendToFile from './append.js';
import askOpenRouter from "./ask-open-AI.js";
import askOpenRouter from './askOpenRouter.js';
import getGenre from './get-genre.js';
import models from './models.js';
import pageGenerator from './page-generator.js';
import State from './state.js';
import chapterSummaryArray from './chapter-summary-array.js';
import plotSummaryByChapter from './plot-summary-by-chapter.js';

function countWords(string_) {
  return string_.trim().split(/\s+/).length;
}








async function main() {

  var state = new State();
  
  /*
  var plotGenrer = getGenre();
  state.update('plotGenre', plotGenrer);

  const {desiredPages, plotGenre, modelChoice, padAmount} = state.opts;

  await outlineGenerator({desiredPages, plotGenre, modelChoice, padAmount}, state);
console.log("created outline");
 // state = await statePopulator(state);
 
  await overview(state);
  console.log("created overview");
  await plotSummaryByChapter(state);
  console.log("created plot summary");
  await chapterSummaryArray(state);
  console.log("created chapter summary");
  await pageGenerator(state);
  console.log("created page");*/
}
main();
