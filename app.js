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

const upload = multer({ dest: 'uploads/' });

const app = express();

app.use(cors());

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
  dateAdded: { type: Date, default: Date.now }
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
}, userController.login);

// Obsługa rejestracji
app.post('/signup', userController.createUser);

app.get('/api/videos', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Błąd pobierania filmów:`, error);
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
      src: path.join('uploads', req.file.filename), // zmienione
      keywords: keywords.split(','),
      thumbnail: thumbnail,
      duration: duration,
    });

    const newMovie = await movie.save();
    console.log(`${new Date().toISOString()} - Saved new movie to the database:`, newMovie);
    res.status(201).json(newMovie);
  } catch (error) {
    console.error(`${new Date().toISOString()} - Error saving new movie to the database:`, error);
    res.status(400).json({ message: error.message, stack: error.stack });
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

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Serwer jest dostępny pod adresem http://localhost:${port}`);
});
