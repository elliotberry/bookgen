async function chapterSummaryArray(model, {chapterLength, chapterByChapterSummaryString, chapters, modelChoice, plotGenre,  padAmount, plotOutline}) {
  for (let index=0; index<chapterLength; index++){
    console.log(`Generating chapter summaries to populate chapterSummaryArray...`);

    let shortSummaryText = ''
    let condition = true;
    while (condition) {
      try {
        console.log(`\nGenerating short summary of Chapter ${index+1}:\n`);

        shortSummaryText = await model.fn(`You are writing a summary of Chapter ${index+1} of a ${chapters} chapter ${plotGenre} book. The entire plot summary is ${plotOutline} The chapter-by-chapter summary for the entire book is: \n${chapterByChapterSummaryString}\n Using those summaries, write a several page SUMMARY of ONLY chapter ${index+1}. Write the best summary you can, you may add new subplots, character development, character background, planned dialogue and plot development that you would typically find in such a work. You are NOT writing the actual book right now, you ARE writing an outline and SUMMARY of what will happen in this chapter. You have to write ${model.tokenLimit - (500 + plotOutline + chapterByChapterSummaryString.length + padAmount)} words.`, 'writer', model.name, (model.tokenLimit - (plotOutline + chapterByChapterSummaryString + padAmount)), 0.9)

        if (!shortSummaryText.choices[0]) {
          shortSummaryText = 'error'
        }
        if (!shortSummaryText.choices[0].message) {
          shortSummaryText = 'error'
        }
        if (shortSummaryText.choices[0].message.content) {
          shortSummaryText = shortSummaryText.choices[0].message.content;
          shortSummaryText = shortSummaryText.replaceAll('\n', '');
        chapterSummaryArray.push(shortSummaryText);
       //  let newArray = [...chapterSummaryArray, shortSummaryText];
          
        
         process.stdout.write(`\r\u001B[35mHere is the chapter summary: \n${chapterSummaryArray[index]}\n`);
          condition = false;
       //   const textToSave = `\nChapter ${index} Summary${chapterSummaryArray[index]}\n`;
         // fs.appendFile(filename, textToSave, (error) => {
          //  if (error) {throw error;}
         // });
        } else {
          shortSummaryText = 'error';
        }        
      } catch (error) {
        console.log(error);
      }
    }
  }
 return chapterSummaryArray
}

export default chapterSummaryArray;