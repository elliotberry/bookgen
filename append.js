import fs from 'node:fs/promises';

const appendToFile = async(filename, text) => {
 await fs.appendFile(filename, text);
}

export default appendToFile;