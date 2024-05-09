const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Lista filmów do dodania
const movies = [
  {
    name: 'Wojna na Ukrainie',
    keywords: 'wojna, Ukraina',
    path: 'C:\\Users\\Lenovo\\Downloads\\pexels-tacettin-çetin-20576968 (Original).mp4',
    transcription: 'To jest przykładowa transkrypcja. Składa się z trzech zdań. To jest trzecie zdanie.'
  },
  // Dodaj tutaj więcej filmów...
];

// Dodaj film
const addMovie = async (movie) => {
  const form = new FormData();
  form.append('name', movie.name);
  form.append('keywords', movie.keywords);
  form.append('video', fs.createReadStream(movie.path));

  const response = await axios.post('http://localhost:3001/api/videos/add', form, {
    headers: form.getHeaders()
  });

  return response.data;
};

// Aktualizuj transkrypcję filmu
const updateTranscription = async (movieId, transcription) => {
  const response = await axios.put(`http://localhost:3001/api/videos/transcription/${movieId}`, {
    transcription: transcription
  });

  return response.data;
};

// Wywołaj funkcje dla każdego filmu
movies.forEach(movie => {
  addMovie(movie)
    .then(addedMovie => {
      console.log('Dodano film:', addedMovie);
      return updateTranscription(addedMovie._id, movie.transcription);
    })
    .then(updatedMovie => {
      console.log('Zaktualizowano transkrypcję:', updatedMovie);
    })
    .catch(error => {
      console.error('Wystąpił błąd:', error);
    });
});