// Auth Middleware: Verifies JWT token and binds user to req.user
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'spm_secret_key_student_pocket_manager_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Akses ditolak. Token otorisasi tidak ditemukan.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Format token tidak valid. Gunakan format Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user from DB
    const user = db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan atau sesi telah berakhir.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.', details: err.message });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
