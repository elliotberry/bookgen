async function plotSummaryByChapter(model, {plotOutline, desiredPages, padAmount}) {
  console.log('\nGenerating chapter-by-chapter plot summary.\n');

  let chapterSummaryText = await model.fn(`You are writing a book with this plot summary: ${plotOutline}. The book is ${desiredPages} pages long. Write a specific and detailed plot SUMMARY for each of the ten chapters of the book. You must use at least a few paragraphs per chapter summary and can use up to one page or more per chapter. Name any unnamed major or minor characters. Use the first few chapter summaries to introduce the characters and set the story. Use the next few chapter summaries for action and character development. Use the last few chapters for dramatic twists in the plot and conclusion. You have ${model.tokenLimit - (plotOutline.length + 500 + padAmount)} tokens (or words) left for the summaries. Try to use all the words you have available.`, 'writer', model.name, (model.tokenLimit - (plotOutline.length + padAmount)), 0.9)
  
  const condition = true;
  while (condition === true) {
    try {
      console.log(chapterSummaryText);
      chapterSummaryText = chapterSummaryText.choices[0].message.content; 
      chapterSummaryText = chapterSummaryText.split(/\n/).filter(({length}) => length > 5);
      console.log(`Chapter-By-Chapter Plot Summary: ${chapterSummaryText}`)
     // const textToSave = `\n\nChapter-By-Chapter Plot Summary: ${chapterSummaryText}\n`;
     // fs.appendFile(filename, textToSave, (error) => {
     //   if (error) {throw error;}
    //  });
      return chapterSummaryText;
    }
    catch {}
  }
}
export default plotSummaryByChapter;