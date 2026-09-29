// Dual Export Engine (Brief v06 - Authentic SQLite Binary & Scoped Export)
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Helper to retrieve data according to filters/scope
function getExportData(userId, reqQuery = {}, reqBody = {}) {
  const scope = reqBody.scope || reqQuery.scope || 'all';
  
  // If transactions/nodes are supplied directly in POST payload, use them
  if (Array.isArray(reqBody.transactions) && reqBody.transactions.length > 0) {
    return {
      scope,
      nodes: reqBody.nodes || [],
      transactions: reqBody.transactions || []
    };
  }

  // Otherwise, query from backend SQLite database
  const nodes = db.prepare('SELECT * FROM nodes WHERE user_id = ?').all(userId);
  let txQuery = `
    SELECT t.id, t.date, t.type, t.amount, t.currency,
           t.from_node_id, n_from.label as from_label,
           t.to_node_id, n_to.label as to_label,
           t.note
    FROM transactions t
    LEFT JOIN nodes n_from ON n_from.id = t.from_node_id
    LEFT JOIN nodes n_to ON n_to.id = t.to_node_id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  // Scoped filters if scope === 'view'
  if (scope === 'view') {
    const startDate = reqBody.startDate || reqQuery.startDate;
    const endDate = reqBody.endDate || reqQuery.endDate;
    const minBalance = Number(reqBody.minBalance || reqQuery.minBalance) || 0;
    const pocketIds = reqBody.pocketIds || (reqQuery.pocketIds ? reqQuery.pocketIds.split(',') : null);
    const incomeIds = reqBody.incomeIds || (reqQuery.incomeIds ? reqQuery.incomeIds.split(',') : null);

    if (startDate) {
      txQuery += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      txQuery += ' AND t.date <= ?';
      params.push(endDate);
    }
    if (minBalance > 0) {
      txQuery += ' AND t.amount >= ?';
      params.push(minBalance);
    }
    if (Array.isArray(pocketIds) && pocketIds.length > 0) {
      const placeholders = pocketIds.map(() => '?').join(',');
      txQuery += ` AND (t.from_node_id IN (${placeholders}) OR t.to_node_id IN (${placeholders}))`;
      params.push(...pocketIds, ...pocketIds);
    }
    if (Array.isArray(incomeIds) && incomeIds.length > 0) {
      const placeholders = incomeIds.map(() => '?').join(',');
      txQuery += ` AND (t.type != 'income' OR t.from_node_id IN (${placeholders}))`;
      params.push(...incomeIds);
    }
  }

  txQuery += ' ORDER BY t.date DESC';
  const transactions = db.prepare(txQuery).all(...params);

  return { scope, nodes, transactions };
}

// 1. GET & POST /api/export/csv - Stream RFC 4180 CSV
const handleCsvExport = (req, res) => {
  try {
    const { scope, transactions } = getExportData(req.user.id, req.query, req.body);

    const headers = ['ID', 'Tanggal', 'Jenis', 'Nominal Pokok', 'Admin', 'Ongkir', 'Total Kas', 'Dari (Sumber)', 'Tujuan', 'Kantong', 'Catatan'];
    const rows = transactions.map(t => {
      const admin = t.admin_fee || t.adminFee || 0;
      const shipping = t.shipping_fee || t.shippingFee || 0;
      const totalCash = (Number(t.amount) || 0) + admin + shipping;
      const fromLabel = t.from_label || t.fromLabel || t.from_node_id || '';
      const toLabel = t.to_label || t.toLabel || t.to_node_id || '';
      const assignedPocket = t.type === 'expense' ? fromLabel : (t.type === 'income' ? toLabel : `${fromLabel} -> ${toLabel}`);

      return [
        t.id,
        t.date,
        t.type ? t.type.toUpperCase() : 'TRANSACTION',
        t.amount,
        admin,
        shipping,
        totalCash,
        `"${fromLabel.replace(/"/g, '""')}"`,
        `"${toLabel.replace(/"/g, '""')}"`,
        `"${assignedPocket.replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `student_pocket_${scope}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Gagal mengekspor CSV.' });
  }
};
router.get('/csv', handleCsvExport);
router.post('/csv', handleCsvExport);

// 2. GET & POST /api/export/db - Stream authentic SQLite 3 binary database (.db)
const handleDbBinaryExport = (req, res) => {
  let tempDbPath = null;
  try {
    const { scope, nodes, transactions } = getExportData(req.user.id, req.query, req.body);

    // Create a temporary authentic SQLite 3 database file on disk
    const uniqueId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    tempDbPath = path.join(os.tmpdir(), `${uniqueId}.db`);

    const exportDb = new Database(tempDbPath);

    // Set Pragmas for SQLite standard compatibility
    exportDb.pragma('journal_mode = DELETE');
    exportDb.pragma('foreign_keys = OFF');

    // Create tables
    exportDb.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        account_category TEXT,
        current_balance REAL DEFAULT 0,
        total_inflow REAL DEFAULT 0,
        total_outflow REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        admin_fee REAL DEFAULT 0,
        shipping_fee REAL DEFAULT 0,
        total_cash REAL DEFAULT 0,
        from_node_id TEXT,
        from_label TEXT,
        to_node_id TEXT,
        to_label TEXT,
        note TEXT
      );
    `);

    // Insert Nodes
    const insertNode = exportDb.prepare(`
      INSERT OR REPLACE INTO nodes (id, label, type, category, account_category, current_balance, total_inflow, total_outflow)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    nodes.forEach(n => {
      insertNode.run(
        n.id,
        n.label || '',
        n.type || 'account',
        n.category || '',
        n.account_category || n.accountCategory || '',
        Number(n.current_balance || n.balance || 0),
        Number(n.total_inflow || n.total || 0),
        Number(n.total_outflow || n.total || 0)
      );
    });

    // Insert Transactions
    const insertTx = exportDb.prepare(`
      INSERT OR REPLACE INTO transactions (id, date, type, amount, admin_fee, shipping_fee, total_cash, from_node_id, from_label, to_node_id, to_label, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    transactions.forEach(t => {
      const admin = Number(t.admin_fee || t.adminFee || 0);
      const shipping = Number(t.shipping_fee || t.shippingFee || 0);
      const amount = Number(t.amount || 0);
      const totalCash = amount + admin + shipping;

      insertTx.run(
        t.id,
        t.date || '',
        t.type || '',
        amount,
        admin,
        shipping,
        totalCash,
        t.from_node_id || t.fromId || '',
        t.from_label || t.fromLabel || '',
        t.to_node_id || t.toId || '',
        t.to_label || t.toLabel || '',
        t.note || ''
      );
    });

    // Close SQLite database cleanly so all locks release and file finishes writing
    exportDb.close();

    // Read the binary SQLite file
    const fileBuffer = fs.readFileSync(tempDbPath);

    // Clean up temporary file
    try {
      fs.unlinkSync(tempDbPath);
      tempDbPath = null;
    } catch (e) {}

    const filename = `student_pocket_${scope}_${new Date().toISOString().split('T')[0]}.db`;

    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (err) {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch (e) {}
    }
    console.error('Export DB binary error:', err);
    res.status(500).json({ error: 'Gagal mengekspor database SQLite .db' });
  }
};
router.get('/db', handleDbBinaryExport);
router.post('/db', handleDbBinaryExport);

// 3. GET & POST /api/export/sql - Stream ANSI SQL Script (.sql)
const handleSqlDumpExport = (req, res) => {
  try {
    const { scope, nodes, transactions } = getExportData(req.user.id, req.query, req.body);

    let sql = `-- ==========================================================================\n`;
    sql += `-- Student Pocket Manager SQLite Dump\n`;
    sql += `-- User: ${req.user.display_name} (${req.user.id})\n`;
    sql += `-- Scope: ${scope.toUpperCase()}\n`;
    sql += `-- Date: ${new Date().toISOString()}\n`;
    sql += `-- ==========================================================================\n\n`;
    sql += `PRAGMA foreign_keys = OFF;\n`;
    sql += `BEGIN TRANSACTION;\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS nodes (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  label TEXT NOT NULL,\n`;
    sql += `  type TEXT NOT NULL,\n`;
    sql += `  category TEXT,\n`;
    sql += `  account_category TEXT,\n`;
    sql += `  current_balance REAL DEFAULT 0\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS transactions (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  date TEXT NOT NULL,\n`;
    sql += `  type TEXT NOT NULL,\n`;
    sql += `  amount REAL NOT NULL,\n`;
    sql += `  admin_fee REAL DEFAULT 0,\n`;
    sql += `  shipping_fee REAL DEFAULT 0,\n`;
    sql += `  total_cash REAL DEFAULT 0,\n`;
    sql += `  from_node_id TEXT,\n`;
    sql += `  from_label TEXT,\n`;
    sql += `  to_node_id TEXT,\n`;
    sql += `  to_label TEXT,\n`;
    sql += `  note TEXT\n`;
    sql += `);\n\n`;

    nodes.forEach(n => {
      const bal = Number(n.current_balance || n.balance || 0);
      sql += `INSERT OR REPLACE INTO nodes VALUES ('${n.id}', '${(n.label || '').replace(/'/g, "''")}', '${n.type || 'account'}', '${(n.category || '').replace(/'/g, "''")}', '${(n.account_category || n.accountCategory || '').replace(/'/g, "''")}', ${bal});\n`;
    });
    sql += `\n`;

    transactions.forEach(t => {
      const admin = Number(t.admin_fee || t.adminFee || 0);
      const shipping = Number(t.shipping_fee || t.shippingFee || 0);
      const amount = Number(t.amount || 0);
      const totalCash = amount + admin + shipping;
      const fromLabel = (t.from_label || t.fromLabel || '').replace(/'/g, "''");
      const toLabel = (t.to_label || t.toLabel || '').replace(/'/g, "''");
      const note = (t.note || '').replace(/'/g, "''");

      sql += `INSERT OR REPLACE INTO transactions VALUES ('${t.id}', '${t.date || ''}', '${t.type || ''}', ${amount}, ${admin}, ${shipping}, ${totalCash}, '${t.from_node_id || t.fromId || ''}', '${fromLabel}', '${t.to_node_id || t.toId || ''}', '${toLabel}', '${note}');\n`;
    });

    sql += `\nCOMMIT;\n`;

    const filename = `student_pocket_${scope}_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sql);
  } catch (err) {
    console.error('Export SQL dump error:', err);
    res.status(500).json({ error: 'Gagal mengekspor script SQL.' });
  }
};
router.get('/sql', handleSqlDumpExport);
router.post('/sql', handleSqlDumpExport);

module.exports = router;
