import fs from 'fs/promises';
async function outputBook(progress, filePath) {

  const bookContent = [];

  

  for await (const [chapterIndex, chapter] of progress.chapters.entries()) {

    for await (const [pageIndex, page] of chapter.pages.entries()) {

      bookContent.push(page.filteredContent);
    }

    bookContent.push('\n');
  }

  await fs.writeFile(filePath, bookContent.join('\n'), 'utf-8');
}

export default outputBook;