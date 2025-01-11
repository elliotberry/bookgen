const countWords = string_ => string_.split(/\s+/).length;

const removeHeadlinesFromPage = page => {
  const lines = page.split('\n');
  const badLineStarters = ['chapter', 'page', '** chapter', '** page'];
  const filtered = lines.filter(line => !badLineStarters.some(badLineStarter => line.toLowerCase().startsWith(badLineStarter)));

  return filtered.join('\n');
};
const formatFileName = string_ => string_.split(' ').join('_').split('/').join('-').toLowerCase();
export { countWords, removeHeadlinesFromPage, formatFileName };