// Backend Server Entry
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Student Pocket Manager API',
    version: 'v04'
  });
});

// Authentication Routes (Step 2)
app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🔐 [Step 2] Auth API Server running on port ${PORT}`);
    console.log(`👉 Health: http://localhost:${PORT}/api/health`);
    console.log(`👉 Auth Register: POST http://localhost:${PORT}/api/auth/register`);
    console.log(`👉 Auth Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
