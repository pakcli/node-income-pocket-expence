// Dual Export Engine (Brief v04 Section 7)
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 1. GET /api/export/csv - Stream RFC 4180 CSV
router.get('/csv', (req, res) => {
  try {
    const query = `
      SELECT t.date, t.type, t.amount, t.currency, n_from.label as from_label, n_to.label as to_label, t.note
      FROM transactions t
      JOIN nodes n_from ON n_from.id = t.from_node_id
      JOIN nodes n_to ON n_to.id = t.to_node_id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
    `;
    const transactions = db.prepare(query).all(req.user.id);

    const headers = ['Date', 'Type', 'Amount', 'Currency', 'From', 'To', 'Assigned Pocket', 'Note'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.amount,
      t.currency || 'IDR',
      `"${t.from_label}"`,
      `"${t.to_label}"`,
      `"${t.type === 'expense' ? t.from_label : t.to_label}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `student-pocket-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Gagal mengekspor CSV.' });
  }
});

// 2. GET /api/export/db - Stream user's isolated SQLite dump / binary
router.get('/db', (req, res) => {
  try {
    const nodes = db.prepare('SELECT * FROM nodes WHERE user_id = ?').all(req.user.id);
    const txs = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(req.user.id);

    let sql = `-- Student Pocket Manager SQLite Dump for User: ${req.user.display_name} (${req.user.id})\n`;
    sql += `PRAGMA journal_mode = WAL;\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, label TEXT, type TEXT, category TEXT, current_balance REAL);\n`;
    sql += `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT, from_node_id TEXT, to_node_id TEXT, amount REAL, date TEXT, note TEXT);\n\n`;

    nodes.forEach(n => {
      sql += `INSERT INTO nodes VALUES ('${n.id}', '${n.label.replace(/'/g, "''")}', '${n.type}', '${n.account_category || ''}', ${n.current_balance});\n`;
    });

    txs.forEach(t => {
      sql += `INSERT INTO transactions VALUES ('${t.id}', '${t.type}', '${t.from_node_id}', '${t.to_node_id}', ${t.amount}, '${t.date}', '${(t.note || '').replace(/'/g, "''")}');\n`;
    });

    const filename = `student-pocket-data-${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sql);
  } catch (err) {
    console.error('Export DB error:', err);
    res.status(500).json({ error: 'Gagal mengekspor database.' });
  }
});

module.exports = router;
