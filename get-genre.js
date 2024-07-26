function getGenre() {
  let genresList = ['Action', 'Adventure', 'Alternative History', 'Apocalyptic', 'Children\'s', 'Comedy', 
    'Crime', 'Cyberpunk', 'Drama', 'Dystopian', 'Elizabethan', 'Existentialist', 'Fantasy', 'Gothic', 
    'Historical', 'Horror', 'Legal', 'LGBTQ', 'Magical Realism', 'Mystery', 'Near-future', 'Parable', 
    'Paranormal', 'Post-Apocalyptic', 'Romance', 'Postmodern', 'Science Fiction', 'Sports', 
    'Star Trek Fan Fiction', 'Steampunk', 'Superhero', 'Supernatural', 'Teenage', 'Thriller',
    'Tragedy', 'Utopian', 'Victorian', 'Western', 'Young Adult'];
  console.clear();
  let randomGenre = genresList[Math.floor(Math.random() * genresList.length)];
  readline.cursorTo(process.stdout,1,1)
  process.stdout.write(`\u001B[35mGenre is: ${randomGenre}`);
  return randomGenre;
}

export default getGenre;