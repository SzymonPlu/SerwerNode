const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('./User');
const saltRounds = 10;

const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('Authenticating admin');
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, '123456');
    const user = await User.findById(decodedToken.userId);
    if (user.role !== 'admin') {
      throw 'User is not authorized';
    } else {
      req.userRole = user.role; // Dodajemy rolę użytkownika do obiektu żądania
      next();
    }
  } catch (error) {
    console.error('Error in authenticateAdmin:', error);
    res.status(401).json({ error: 'User is not authorized' });
  }
};

exports.createUser = [authenticateAdmin, async (req, res) => {
  try {
    console.log('Creating user');
    const { username, password, role } = req.body;

    // Hash the password
    console.log('Hashing password');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    console.log('Creating new user object');
    const user = new User({
      username: username,
      password: hashedPassword,
      role: role
    });

    // Save the user to the database
    console.log('Saving user to database');
    const savedUser = await user.save();

    console.log('User created successfully');
    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
}];

exports.login = async (req, res) => {
  try {
    console.log('Logging in user');
    const { username, password } = req.body;

    // Find the user
    console.log('Finding user in database');
    const user = await User.findOne({ username: username }); // Poprawka tutaj
    if (!user) {
      console.error('User not found');
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    // Check the password
    console.log('Checking password');
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.error('Incorrect password');
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    // Generate a JWT
    console.log('Generating JWT');
    const token = jwt.sign({ userId: user._id }, '123456', { expiresIn: '24h' });

    console.log('User logged in successfully');
    res.json({ token: token, role: user.role }); // Dodajemy rolę użytkownika do odpowiedzi
  } catch (error) {
    console.error('Error in login:', error); // Log the error
    res.status(500).json({ error: 'Error logging in' });
  }
};