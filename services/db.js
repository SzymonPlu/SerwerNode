const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Adres lokalnej instancji MongoDB
const dbName = 'myDatabase'; // Nazwa twojej bazy danych

async function connectToDatabase() {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect(); // Połączenie z bazą danych

    console.log('Connected to the database');

    return client.db(dbName); // Zwrócenie obiektu bazy danych
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
}

module.exports = { connectToDatabase };
