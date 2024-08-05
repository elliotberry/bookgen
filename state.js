import fs from 'node:fs/promises';
import path from 'node:path';

class State {
  constructor({chapterLength, desiredPages, modelChoice, padAmount}) {
    this.chapterByChapterSummaryString = '';
    this.chapterSummaryArray = [];
    this.chapters = desiredPages / chapterLength;
    this.desiredPages = desiredPages;
    this.filename = `backup_${Date.now()}.json`; // Use a timestamp for the filename
    this.fullText = [];
    this.plotGenre;
    this.chapterByChapterSummaryString;
    this.chapterSummaryArray;
    this.pageSummaries;
    this.mainCharacters = [];
    this.minorCharacters = [];
    this.pageSummaries = [];
    this.plotGenre = '';
    this.plotOutline = '';
    this.plotSettings = [];
    this.rawOutline = '';
    this.writingAdjectives = '';
    this.writingStyle = '';
    this.opts = {
      chapterLength,
      desiredPages,
      modelChoice,
      padAmount,
    };
  }

  async update(key, value) {
    try {
      this[key] = value;
      await this.updateFileCache(); // Ensure the file is updated every time an update occurs
    } catch (error) {
      console.log(error);
    }
  }

  async updateFileCache() {
    const oldFilename = `${this.filename}.old`;
    
    try {
      // Check if the file exists
      await fs.access(this.filename);
      
      // If it exists, rename it to .old
      await fs.rename(this.filename, oldFilename);
    } catch (error) {
      // If the file doesn't exist, ignore the error
      if (error.code !== 'ENOENT') {
        console.error('Error accessing file', error);
      }
    }

    try {
      // Write the new file
      await fs.writeFile(this.filename, JSON.stringify(this, null, 2));
      console.log('State successfully backed up to', this.filename);

      // If writing was successful, delete the old file
      try {
        await fs.unlink(oldFilename);
      } catch (error) {
        // If the old file doesn't exist, ignore the error
        if (error.code !== 'ENOENT') {
          console.error('Error deleting old file', error);
        }
      }
    } catch (error) {
      console.error('Error writing to file', error);

      // If writing failed, try to restore the old file
      try {
        await fs.rename(oldFilename, this.filename);
      } catch (error) {
        console.error('Error restoring old file', error);
      }
    }
  }
}

export default State;