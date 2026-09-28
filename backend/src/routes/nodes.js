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

// PUT /api/nodes/:id - Update node label, category, color
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, accountCategory, color } = req.body;

    const existing = db.prepare('SELECT * FROM nodes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Node tidak ditemukan.' });
    }

    const updatedLabel = label !== undefined ? label.trim() : existing.label;
    const updatedCategory = accountCategory !== undefined ? accountCategory : existing.account_category;
    const updatedColor = color !== undefined ? color : existing.color;

    db.prepare(`
      UPDATE nodes
      SET label = ?, account_category = ?, color = ?
      WHERE id = ? AND user_id = ?
    `).run(updatedLabel, updatedCategory, updatedColor, id, req.user.id);

    res.json({
      message: 'Node berhasil diperbarui.',
      node: { id, label: updatedLabel, category: updatedCategory, color: updatedColor }
    });
  } catch (err) {
    console.error('Error updating node:', err);
    res.status(500).json({ error: 'Gagal memperbarui node.' });
  }
});

// DELETE /api/nodes/:id - Delete node and attached transactions
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const delTx = db.transaction(() => {
      // Delete attached transactions first
      db.prepare('DELETE FROM transactions WHERE (from_node_id = ? OR to_node_id = ?) AND user_id = ?').run(id, id, req.user.id);
      // Delete node
      const result = db.prepare('DELETE FROM nodes WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (result.changes === 0) {
        throw new Error('Node tidak ditemukan.');
      }
    });

    delTx();
    res.json({ message: 'Node dan riwayat transaksinya berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting node:', err);
    res.status(400).json({ error: err.message || 'Gagal menghapus node.' });
  }
});

module.exports = router;

