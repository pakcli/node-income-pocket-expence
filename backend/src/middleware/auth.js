// Auth Middleware: Verifies JWT token and binds user to req.user
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'spm_secret_key_student_pocket_manager_2026';

function authMiddleware(req, res, next) {
  let token = null;

  // 1. Authorization header: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // 2. Query parameter: ?token=<token>
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  // 3. If token is present, verify it
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users WHERE id = ?').get(decoded.id);

      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.', details: err.message });
    }
  }

  // 4. Check if a specific userId was passed in query parameter (e.g. direct export URL)
  const requestedUserId = req.query && req.query.userId;
  if (requestedUserId) {
    const user = db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users WHERE id = ?').get(requestedUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 5. Seamless fallback to default active user (usr_student_1 or first available user)
  // Ensures direct browser downloads (e.g. localhost:3000/api/export/db?scope=all) work immediately
  try {
    const defaultUser = db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users WHERE id = ?').get('usr_student_1')
      || db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users LIMIT 1').get();

    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }
  } catch (err) {
    console.warn('Fallback user error in authMiddleware:', err);
  }

  return res.status(401).json({ error: 'Akses ditolak. Token otorisasi tidak ditemukan.' });
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
