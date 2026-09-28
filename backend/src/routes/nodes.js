// Financial Nodes Router (Pockets, Incomes, Expenses)
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/nodes - List all nodes for current user
router.get('/', (req, res) => {
  try {
    const nodes = db.prepare('SELECT * FROM nodes WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
    
    const pockets = nodes.filter(n => n.type === 'account').map(n => ({
      id: n.id,
      label: n.label,
      category: n.account_category || 'cash',
      balance: n.current_balance,
      inflow: n.total_inflow,
      outflow: n.total_outflow,
      color: n.color || '#3b82f6'
    }));

    const incomeSources = nodes.filter(n => n.type === 'income').map(n => ({
      id: n.id,
      label: n.label,
      total: n.total_inflow
    }));

    const expenseCategories = nodes.filter(n => n.type === 'expense').map(n => ({
      id: n.id,
      label: n.label,
      total: n.total_outflow
    }));

    res.json({ pockets, incomeSources, expenseCategories, raw: nodes });
  } catch (err) {
    console.error('Error fetching nodes:', err);
    res.status(500).json({ error: 'Gagal mengambil data nodes.' });
  }
});

// POST /api/nodes - Create node
router.post('/', (req, res) => {
  try {
    const { label, type, accountCategory, initialBalance = 0, color } = req.body;

    if (!label || !type) {
      return res.status(400).json({ error: 'Label dan type wajib diisi.' });
    }

    const id = (type === 'account' ? 'pkt_' : (type === 'income' ? 'inc_' : 'exp_')) + Date.now();
    const balance = Number(initialBalance) || 0;

    const stmt = db.prepare(`
      INSERT INTO nodes (id, user_id, label, type, account_category, current_balance, total_inflow, total_outflow, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, req.user.id, label.trim(), type, accountCategory || null, balance, 0, 0, color || '#3b82f6');

    res.status(201).json({
      message: 'Node berhasil dibuat.',
      node: {
        id,
        label,
        type,
        category: accountCategory,
        balance
      }
    });
  } catch (err) {
    console.error('Error creating node:', err);
    res.status(500).json({ error: 'Gagal membuat node.' });
  }
});

module.exports = router;
