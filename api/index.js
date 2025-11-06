// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('../backend/routes/auth');
const imageRoutes = require('../backend/routes/images');
const questionRoutes = require('../backend/routes/questions');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'backend', 'uploads')));

// Routes - remove /api prefix since Vercel routing already handles it
app.use('/auth', authRoutes);
app.use('/images', imageRoutes);
app.use('/questions', questionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Root route for debugging
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    endpoints: ['/auth', '/images', '/questions', '/health']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Export for Vercel serverless function
module.exports = app;
