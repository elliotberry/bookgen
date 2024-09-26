import fs from 'node:fs/promises';

import models from './models.js';
import getGenre from './get-genre.js';
import overview from './overview.js';
import chapterSummaryArray from './chapter-summary-array.js';
import plotSummaryByChapter from './plot-summary-by-chapter.js';
import readline from 'readline';
import overview from './overview.js';
import appendToFile from './append.js';
import askOpenRouter from './ask-open-AI.js';
import askOpenRouter from './askOpenRouter.js';
import getGenre from './get-genre.js';
import models from './models.js';
import pageGenerator from './page-generator.js';

const defaultOpts = {
  modelChoice: 'google/gemini-flash-8b-1.5-exp',
  chapterLength: 10,
  desiredPages: 200,
  padAmount: 500,
  tokenLimit: 4096,
};

class State {
  constructor(opts) {
    this.functions = [
      {name: 'genre', fn: getGenre},
      {name: 'overview', fn: overview},
      {name: 'plotSummaryByChapter', fn: plotSummaryByChapter},
      {name: 'chapterSummaryArray', fn: chapterSummaryArray},
      {name: 'pageGenerator', fn: pageGenerator},
    ];
    this.functionAt = 0;
    this.defaultData = {
      chapterByChapterSummaryString: '',
      chapterSummaryArray: [],
      chaptersLength: this.opts.desiredPages / this.opts.chapterLength,
      chapters: Array.from({length: this.data.chaptersLength}, (_, i) => i + 1),
      fullText: [],
      mainCharacters: [],
      minorCharacters: [],
      pageSummaries: [],
      plotGenre: '',
      plotOutline: '',
      plotSettings: [],
      rawOutline: '',
      writingAdjectives: '',
      writingStyle: '',
    };
    init(opts);
  }
  async init(opts) {
    this.filename = `backup.json`; // Use a timestamp for the filename

    let backupData = await this.loadBackup();
    if (backupData) {
      this.data = backupData.data;
      this.functionAt = backupData.functionAt;
      this.opts = backupData.opts;
    } else {
      this.data = this.defaultData;
      this.functionAt = 0;
      this.opts = Object.assign({}, defaultOpts, opts);
    }
    this.model = models[this.opts.modelChoice];
    return this;
  }
  async run() {
    let functionsToRun = this.functions.slice(this.functionAt);

    for (const {name, fn} of functionsToRun) {
      console.log(`Running function: ${name}`);
      let resp = await fn(this.model, this.data);
      this.data = Object.assign(this.data, resp);
      this.updateFileCache();
    }
  }
  async loadBackup() {
    try {
      // Check if the backup file exists
      await fs.access(this.filename);
      // If it exists, load and parse the data
      const data = await fs.readFile(this.filename, 'utf-8');
      const parsedData = JSON.parse(data);

      console.log('State loaded from backup file:', this.filename);
      return parsedData;
    } catch (error) {
      this.data = this.defaultData;
      if (error.code === 'ENOENT') {
        console.log('No backup file found. Proceeding with default state.');
      } else {
        console.error('Error loading backup file:', error);
      }
    }
  }

  async update(key, value) {
    try {
      this.data[key] = value;
      await this.updateFileCache(); // Ensure the file is updated every time an update occurs
    } catch (error) {
      console.log(error);
    }
  }

  async updateFileCache() {
    try {
      await fs.writeFile(this.filename, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error updating file cache:', error);
    }
  }
}

export default State;
