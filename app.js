const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { generateThumbnail, getVideoDuration } = require('./videoProcessing');
const path = require('path');
const userController = require('./UserController');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { User } = require('./User');
const authenticateUser = require('./authenticateUser');
const config = require('./config.json');
const fs = require('fs');

const jwt = require('jsonwebtoken');
const jwtSecret = '123456';

const upload = multer({ dest: 'uploads/' });

const app = express();

app.use(cors());
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/myDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Błąd połączenia z MongoDB:'));
db.once('open', function() {
  console.log('Połączono z bazą danych MongoDB');
});

const movieSchema = new mongoose.Schema({
  name: String,
  type: String,
  src: String,
  keywords: [String],
  thumbnail: String,
  duration: Number,
  dateAdded: { type: Date, default: Date.now },
  status: { type: String, default: 'niezaakceptowany' },
  transcription: String
});

const Movie = mongoose.model('Movie', movieSchema);

app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Obsługa tworzenia nowego użytkownika
app.post('/users/create', userController.createUser);

// Obsługa logowania
app.post('/login', (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Próba logowania`);
  next();
}, userController.login, (req, res) => {
  const token = jwt.sign({ username: req.user.username }, 'secretKey');
  res.json({ token });
});

// Obsługa rejestracji
app.post('/signup', userController.createUser);

// Trasa /api/videos z uwzględnieniem uwierzytelniania użytkownika
app.get('/api/videos', authenticateUser, async (req, res) => {
  try {
    const userRole = req.user.role; // Pobierz rolę użytkownika z uwierzytelnienia

    let movies;
    if (userRole === 'reporter') {
      // Dla reportera zwracaj tylko filmy o statusie "zaakceptowano"
      movies = await Movie.find({ status: 'zaakceptowano' });
    } else {
      // Dla innych użytkowników zwracaj wszystkie filmy
      movies = await Movie.find();
    }

    // Sortuj filmy na podstawie statusu
    movies.sort((a, b) => {
      if (a.status === 'do_akceptacji' || a.status === 'do_pobrania') return -1;
      if (b.status === 'do_akceptacji' || b.status === 'do_pobrania') return 1;
      return 0;
    });

    res.json(movies);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Błąd pobierania filmów:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Dodaj nowy endpoint PUT dla zmiany statusu filmu
app.put('/api/videos/approve/:id', async (req, res) => {
  const movieId = req.params.id;

  try {
    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found.' });
    }

    // Logowanie obecnego statusu filmu
    console.log(`Current status of movie ${movieId}: "${movie.status}"`);

    // Sprawdź obecny status filmu i zmień go odpowiednio
    if (movie.status === 'niezaakceptowany') {
      movie.status = 'do akceptacji';
    } else if (movie.status === 'do akceptacji') {
      movie.status = 'zaakceptowano';
    } else if (movie.status === 'zaakceptowano') {
      movie.status = 'do_pobrania';
    } else if (movie.status === 'do_pobrania') {
      // Skopiuj film do lokalizacji
      const sourcePath = path.normalize(movie.src); // Ścieżka do filmu z bazy danych
      const fileNameWithExtension = path.basename(sourcePath); // Pobierz nazwę pliku wraz z rozszerzeniem
      const destinationPath = path.join('C:\\', 'Users', 'Lenovo', 'Desktop', 'Tymczasowy', fileNameWithExtension); // Ścieżka docelowa

      try {
        fs.copyFileSync(sourcePath, destinationPath);
        console.log(`Successfully copied movie from ${sourcePath} to ${destinationPath}`);
      } catch (copyError) {
        console.error(`Failed to copy movie from ${sourcePath} to ${destinationPath}:`, copyError);
        return res.status(500).json({ message: copyError.message, stack: copyError.stack });
      }

      movie.status = 'zaakceptowano';
    } else {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const updatedMovie = await movie.save();

    console.log(`${new Date().toISOString()} - Changed status to "${movie.status}" for movie:`, updatedMovie);
    res.json(updatedMovie);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error updating movie status:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

app.post('/api/videos/add', upload.single('video'), async (req, res) => {
  const keywords = req.body.keywords || '';
  console.log(`${new Date().toISOString()} - Received new media data:`);
  console.log("Name:", req.body.name);
  console.log("Keywords:", keywords);
  console.log("Video file:", req.file);

  try {
    const [thumbnail, duration] = await Promise.all([
      generateThumbnail(req.file.path),
      getVideoDuration(req.file.path)
    ]);

    const movie = new Movie({
      name: req.body.name,
      type: 'video',
      src: req.file.path, // Zapisujemy pełną ścieżkę do pliku
      keywords: keywords.split(','),
      thumbnail: thumbnail,
      duration: duration,
      status: 'niezaakceptowany'
    });

    const newMovie = await movie.save();
    console.log(`${new Date().toISOString()} - Saved new movie to the database:`, newMovie);

    res.status(201).json(newMovie);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error saving new movie to the database:`, error);
    res.status(400).json({ message: error.message, stack: error.stack });
  }
});

app.put('/api/videos/transcription/:id', async (req, res) => {
  const movieId = req.params.id;
  const newTranscription = req.body.transcription;

  try {
    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found.' });
    }

    // Logowanie obecnej transkrypcji filmu
    console.log(`Current transcription of movie ${movieId}: "${movie.transcription}"`);

    // Aktualizacja transkrypcji filmu
    movie.transcription = newTranscription;

    const updatedMovie = await movie.save();

    console.log(`${new Date().toISOString()} - Updated transcription for movie:`, updatedMovie);
    res.json(updatedMovie);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error updating movie transcription:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

app.get('/movies/count', async (req, res) => {
  const { role } = req.query;
  let statusFilter = {};

  if (role === 'reporter') {
    statusFilter.status = 'zaakceptowano';
  } else if (role === 'admin' || role === 'archivist') {
    statusFilter.status = { $in: ['niezaakceptowany', 'do_pobrania', 'zaakceptowano', 'do akceptacji'] };
  }

  const countToAccept = await Movie.countDocuments({ ...statusFilter, status: 'do akceptacji' });
  const countAccepted = await Movie.countDocuments({ ...statusFilter, status: 'zaakceptowano' });
  const countNotAccepted = await Movie.countDocuments({ ...statusFilter, status: 'niezaakceptowany' });
  const countToDownload = await Movie.countDocuments({ ...statusFilter, status: 'do_pobrania' });

  console.log(`Total number of movies to accept: ${countToAccept}`);
  console.log(`Total number of accepted movies: ${countAccepted}`);
  console.log(`Total number of not accepted movies: ${countNotAccepted}`);
  console.log(`Total number of movies to download: ${countToDownload}`);

  const dates = await Movie.find(statusFilter).select('dateAdded').sort('dateAdded');
  res.json({ countToAccept, countAccepted, countNotAccepted, countToDownload, dates });
});

// Add a new GET route to fetch the transcription for a given movie
app.get('/api/videos/:id/transcription', async (req, res) => {
  const movieId = req.params.id;
  console.log(`Fetching transcription for movieId: ${movieId}`);

  try {
    const movie = await Movie.findById(movieId);
    console.log('Fetched movie:', movie);

    // Even if the movie does not exist, we return the transcription
    const transcription = movie ? movie.transcription : null;
    console.log('Fetched transcription:', transcription);
    res.json({ transcription: transcription });
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error fetching movie transcription:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});



// Obsługa usuwania użytkownika
app.delete('/users/delete', async (req, res) => {
  const { username } = req.body;
  console.log(`Deleting user: ${username}`);
  
  try {
    const result = await User.deleteOne({ username });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No user found to delete.' });
    }

    res.json({ message: `Successfully deleted user ${username}.` });
  } catch (error) {
    console.error(`Error deleting user ${username}:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Obsługa zmiany hasła
app.put('/api/users/password', async (req, res) => {
  const { username, newPassword } = req.body;
  console.log(`Changing password for user: ${username}`);
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    const result = await User.updateOne({ username }, { password: hashedPassword });
    
    if (result.nModified === 0) {
      return res.status(404).json({ message: 'No user found to update.' });
    }

    res.json({ message: `Successfully updated password for user ${username}.` });
  } catch (error) {
    console.error(`Error updating password for user ${username}:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

app.post('/api/videos/delete', async (req, res) => {
  console.log(`${new Date().toISOString()} - Received request to delete movies:`, req.body.ids);
  const ids = req.body.ids;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: 'Invalid request body, expected an array of ids.' });
  }

  try {
    const result = await Movie.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No movies found to delete.' });
    }

    res.json({ message: `Successfully deleted ${result.deletedCount} movies.` });
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error deleting movies:`, error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

app.use('/uploads', express.static('uploads'));

// Middleware do serwowania plików wideo z macierzy
app.use('/videos', express.static('H:\\2019\\kurczaki'));

app.get('/videos/:filename', (req, res) => {
  const filePath = path.join('H:\\2019\\kurczaki', req.params.filename);
  console.log(`Serving video file from: ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error sending file: ${err}`);
      res.status(500).send('Error sending file');
    }
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Serwer jest dostępny pod adresem http://localhost:${port}`);
});
