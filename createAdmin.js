const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./User');
const saltRounds = 10;

// Inicjalizacja połączenia z MongoDB
mongoose.connect('mongodb://localhost:27017/myDatabase', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

async function createAdmin() {
  const password = 'Niuf1703'; // Zmień na rzeczywiste hasło admina
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const admin = new User({
    username: 'admin',
    password: hashedPassword,
    role: 'admin'
  });

  await admin.save();
  console.log('Admin user created');
}

createAdmin().catch(console.error);