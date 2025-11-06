require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('../backend/routes/auth');
const imageRoutes = require('../backend/routes/images');
const questionRoutes = require('../backend/routes/questions');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'backend', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/questions', questionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Export for Vercel serverless function
module.exports = app;
