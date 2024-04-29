const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const Schema = mongoose.Schema;

const validRoles = ['admin', 'archiwista', 'reporter', 'kierownik produkcji'];

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: validRoles } // Dodaj enum dla dozwolonych ról
});

const User = mongoose.model('User', UserSchema);

// Tworzenie nowego użytkownika
router.post('/create', async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = new User({ username, password: hashedPassword, role });
  await user.save();
  res.send('User created');
});

// Usuwanie użytkownika
router.delete('/:username', async (req, res) => {
  console.log(`Deleting user: ${req.params.username}`);
  const result = await User.deleteOne({ username: req.params.username });
  console.log(`Delete result: ${JSON.stringify(result)}`);
  res.send('User deleted');
});

// Aktualizowanie użytkownika
router.put('/:username', async (req, res) => {
  const { password, role } = req.body;
  
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  console.log(`Updating user: ${req.params.username}`);
  console.log(`New password: ${password}`);
  console.log(`New role: ${role}`);
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await User.updateOne({ username: req.params.username }, { password: hashedPassword, role });
  console.log(`Update result: ${JSON.stringify(result)}`);
  res.send('User updated');
});

module.exports = { User, router };
