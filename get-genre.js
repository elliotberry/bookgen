import readline from 'readline';
function getGenre() {
  let genresList = ['Action', 'Adventure', 'Alternative History', 'Apocalyptic', 'Children\'s', 'Comedy', 
    'Crime', 'Cyberpunk', 'Drama', 'Dystopian', 'Elizabethan', 'Existentialist', 'Fantasy', 'Gothic', 
    'Historical', 'Horror', 'Legal', 'LGBTQ', 'Magical Realism', 'Mystery', 'Near-future', 'Parable', 
    'Paranormal', 'Post-Apocalyptic', 'Romance', 'Postmodern', 'Science Fiction', 'Sports', 
    'Star Trek Fan Fiction', 'Steampunk', 'Superhero', 'Supernatural', 'Teenage', 'Thriller',
    'Tragedy', 'Utopian', 'Victorian', 'Western', 'Young Adult'];

  let randomGenre = genresList[Math.floor(Math.random() * genresList.length)];

  console.log(`Genre is: ${randomGenre}`);
  return {genre: "Spooky Young Adult Poems to Tell While Knitting"};
}

export default getGenre;