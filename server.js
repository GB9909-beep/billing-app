require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const billRoutes = require('./routes/bills');
const excelRoutes = require('./routes/excel');

// Import archiver
const startArchiver = require('./utils/archiver');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anushree-billing';

// Required for HTTPS on Render (trust proxy)
app.set('trust proxy', 1);

// ==================== Middleware ====================

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ==================== Session Setup ====================

app.use(session({
  secret: process.env.SESSION_SECRET || 'anushree-default-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 hours
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true on Render (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ==================== API Routes ====================

app.use('/api', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api', excelRoutes);

// ==================== Page Routes ====================

// Serve login page as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==================== Connect to MongoDB & Start Server ====================

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Start the daily archiver cron job
    startArchiver();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running at: http://localhost:${PORT}`);
      console.log(`📁 Login page:     http://localhost:${PORT}`);
      console.log(`📊 Dashboard:      http://localhost:${PORT}/dashboard`);
      console.log(`\nPress Ctrl+C to stop the server.\n`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('\n💡 Make sure MongoDB is running. Options:');
    console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('   2. Use MongoDB Atlas (free): https://www.mongodb.com/atlas');
    console.log('   3. Update MONGODB_URI in your .env file\n');
    process.exit(1);
  }
}

startServer();

// ==================== Global Error Handler ====================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});
