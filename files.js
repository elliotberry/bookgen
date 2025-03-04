
import {formatFileName} from './string-functions.js';
import path from 'node:path';

const makeFilenames = (genre, numberChapters, pagesPerChapter, llmModel) => {
    let shortGenre = genre.split(' ').join('-').toLowerCase();
    shortGenre = shortGenre.slice(0, 10);
    const filename = formatFileName(`${shortGenre}_${numberChapters}_${pagesPerChapter}_${llmModel}`);
    const saveFileName = path.resolve(`./output/${filename}.json`);
    const outputFileName = path.resolve(`./output/${filename}.txt`);
    return { saveFileName, outputFileName };
}
export default makeFilenames;  