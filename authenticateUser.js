const jwt = require('jsonwebtoken');
const { User } = require('./User');

const authenticateUser = async (req, res, next) => {
  try {
    // Pobierz token z nagłówka żądania
    let token = req.header('Authorization');
    console.log('Token:', token);

    if (!token) {
      console.error('Brak dostępu - brak tokena uwierzytelniającego.');
      return res.status(401).json({ message: 'Brak dostępu - brak tokena uwierzytelniającego.' });
    }

    // Usuń prefiks "Bearer " z tokenu
    token = token.replace('Bearer ', '');

    // Zweryfikuj token
    let decoded;
    try {
      decoded = jwt.verify(token, '123456'); // Przykładowy klucz tajny, użyj swojego odpowiedniego klucza
    } catch (error) {
      console.error('Błąd weryfikacji tokenu:', error);
      return res.status(401).json({ message: 'Brak dostępu - nieprawidłowy token uwierzytelniający.' });
    }

    // Pobierz użytkownika na podstawie zdekodowanych danych
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.error('Nie znaleziono użytkownika dla tokena uwierzytelniającego.');
      return res.status(401).json({ message: 'Brak dostępu - nieprawidłowy token uwierzytelniający.' });
    }

    // Ustaw obiekt req.user na obiekt użytkownika
    req.user = user;
    next(); // Przejdź do następnego middleware lub routera
  } catch (error) {
    console.error('Błąd uwierzytelniania:', error);
    res.status(500).json({ message: 'Wystąpił błąd podczas uwierzytelniania użytkownika.' });
  }
};

module.exports = authenticateUser;