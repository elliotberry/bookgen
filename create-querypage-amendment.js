async function createPageQueryAmendment({modelChoice, fullText, sentenceSummaries}, index, index_) {
  let amendment = '';

  if (index_ == 0) {
    return 'This is the first page of the chapter.';
  }

  if (index_ == 1 && modelChoice == 'gpt4') {
    return `Page 1 of this chapter reads as follows: \n${fullText[index * 20 + index_ - 1]}\n`;
  }

  if (index_ == 2 && modelChoice == 'gpt4') {
    return `Pages ${index_ - 1} reads as follows: \n${fullText[index * 20 + index_ - 2]}\n Page ${index_} reads as follows: ${fullText[index * 20 + index_ - 1]}\n`;
  }

  //join the sentenceSummaries of all prior pages in the chapter so far
  let priorPages = '';

  for (let k = 0; k < index_; k++) {
    if (k == 0) {
      priorPages = '';
      return;
    }
    priorPages += `\nChapter ${index + 1}, Page ${k + 1}: ${sentenceSummaries[index * 20 + k]}\n`;
  }

  if (index_ > 2 && modelChoice == 'gpt4') {
    amendment = `Here are the page summaries of the chapter thus far: ${priorPages}. The full text of pages ${index_ - 2},${index_ - 1} and ${index_} read as follows: Page ${index_ - 2}: ${fullText[index * 20 + index_ - 3]} Page ${index_ - 1}: ${fullText[index * 20 + index_ - 2]} Page ${index_}: ${fullText[index * 20 + index_ - 1]}`;
  }

  if (index_ > 0 && modelChoice == 'gpt35') {
    return `Here are the page summaries of the chapter thus far: ${priorPages}. Here is the full text of page ${index_}: ${fullText[index * 20 + index_ - 1]}`;
  }

  return amendment;
}

export default createPageQueryAmendment;