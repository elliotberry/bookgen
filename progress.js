import fs from 'fs/promises';
async function loadProgress(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return null; // No progress file found.
    throw error;
  }
}

async function saveProgress(progress, filePath) {
  await fs.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf-8');
}

export { loadProgress, saveProgress };