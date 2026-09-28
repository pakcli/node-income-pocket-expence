// Auth Router (Brief v04 Section 2 & Section 8)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, password, displayName, role = 'student', preferredLocale = 'id' } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, dan nama lengkap wajib diisi.' });
    }

    if (role !== 'student' && role !== 'parent') {
      return res.status(400).json({ error: 'Role harus student atau parent.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    const userId = 'usr_' + Date.now();
    const hash = bcrypt.hashSync(password, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, preferred_locale)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(userId, email.trim().toLowerCase(), hash, displayName.trim(), role, preferredLocale);

    // If student, create default starter pockets
    if (role === 'student') {
      const insertNode = db.prepare(`
        INSERT INTO nodes (id, user_id, label, type, account_category, current_balance, total_inflow, total_outflow, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertNode.run('pkt_cash_' + Date.now(), userId, 'Dompet Fisik (Cash)', 'account', 'cash', 0, 0, 0, '#10b981');
      insertNode.run('pkt_bank_' + Date.now(), userId, 'Rekening Bank', 'account', 'bank', 0, 0, 0, '#3b82f6');
      insertNode.run('pkt_wallet_' + Date.now(), userId, 'E-Wallet', 'account', 'e_wallet', 0, 0, 0, '#8b5cf6');
    }

    const newUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role,
      preferredLocale
    };

    const token = generateToken({ ...newUser, display_name: newUser.displayName });

    return res.status(201).json({
      message: 'Registrasi berhasil!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server saat registrasi.' });
  }
});

// 2. POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        photoUrl: user.photo_url,
        preferredLocale: user.preferred_locale
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

// 3. POST /api/auth/google (Google One-Tap / OAuth mock & verification)
router.post('/google', (req, res) => {
  try {
    const { email, displayName, photoUrl, role = 'student' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email Google diperlukan.' });
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    if (!user) {
      const userId = 'usr_g_' + Date.now();
      const insertUser = db.prepare(`
        INSERT INTO users (id, email, display_name, photo_url, role, preferred_locale)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertUser.run(userId, email.trim().toLowerCase(), displayName || email.split('@')[0], photoUrl || null, role, 'id');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      // Create starter pockets
      const insertNode = db.prepare(`
        INSERT INTO nodes (id, user_id, label, type, account_category, current_balance, total_inflow, total_outflow, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertNode.run('pkt_cash_' + Date.now(), userId, 'Dompet Fisik (Cash)', 'account', 'cash', 0, 0, 0, '#10b981');
      insertNode.run('pkt_bank_' + Date.now(), userId, 'Rekening Bank', 'account', 'bank', 0, 0, 0, '#3b82f6');
    }

    const token = generateToken(user);

    return res.json({
      message: 'Google auth berhasil!',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        photoUrl: user.photo_url,
        preferredLocale: user.preferred_locale
      }
    });
  } catch (err) {
    console.error('Google Auth error:', err);
    return res.status(500).json({ error: 'Gagal autentikasi Google.' });
  }
});

// 4. GET /api/auth/me (Protected: Get current profile)
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// 5. GET /api/auth/saved-accounts (List all registered profiles on this server instance for 1-click switch)
router.get('/saved-accounts', (req, res) => {
  try {
    const users = db.prepare('SELECT id, email, display_name, photo_url, role FROM users').all();
    return res.json({
      accounts: users.map(u => ({
        userId: u.id,
        email: u.email,
        displayName: u.display_name,
        role: u.role,
        photoUrl: u.photo_url
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat daftar profil tersimpan.' });
  }
});

// 6. POST /api/auth/switch-account (1-click Switch Profile without password)
router.post('/switch-account', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId diperlukan untuk switch profile.' });
    }

    const user = db.prepare('SELECT id, email, display_name, photo_url, role, preferred_locale FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }

    const token = generateToken(user);
    return res.json({
      message: `Berhasil beralih ke profil ${user.display_name}`,
      token,
      user
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal beralih akun.' });
  }
});

// 7. GET /api/auth/family (Protected: Get family connections)
router.get('/family', authMiddleware, (req, res) => {
  try {
    const isParent = req.user.role === 'parent';
    let query;

    if (isParent) {
      query = `
        SELECT fr.id as relation_id, fr.status, fr.pairing_code, u.id as student_id, u.display_name, u.email
        FROM family_relations fr
        JOIN users u ON u.id = fr.student_id
        WHERE fr.parent_id = ?
      `;
    } else {
      query = `
        SELECT fr.id as relation_id, fr.status, fr.pairing_code, u.id as parent_id, u.display_name, u.email
        FROM family_relations fr
        JOIN users u ON u.id = fr.parent_id
        WHERE fr.student_id = ?
      `;
    }

    const relations = db.prepare(query).all(req.user.id);
    return res.json({ family: relations });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat data keluarga.' });
  }
});

module.exports = router;
