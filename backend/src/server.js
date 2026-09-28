// Combined Backend Server (API + Static Frontend)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('./db');
const authRoutes = require('./routes/auth');
const nodeRoutes = require('./routes/nodes');
const txRoutes = require('./routes/transactions');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '../../frontend');

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Assets with no-cache headers for instant local reload
app.use(express.static(FRONTEND_DIR, {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/transactions', txRoutes);
app.use('/api/export', exportRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Student Pocket Manager API & Combined Server',
    version: 'v04'
  });
});

// Fallback to frontend index.html for SPA routes (Express 5 compatible)
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server: ' + err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🚀 Student Pocket Manager - Combined Localhost Server Running!`);
    console.log(`👉 Open Web App:  http://localhost:${PORT}`);
    console.log(`👉 Health Check:  http://localhost:${PORT}/api/health`);
    console.log(`👉 Auth API:      http://localhost:${PORT}/api/auth`);
    console.log(`👉 Nodes API:     http://localhost:${PORT}/api/nodes`);
    console.log(`👉 Tx API:        http://localhost:${PORT}/api/transactions`);
    console.log(`================================================================\n`);
  });
}

module.exports = app;
