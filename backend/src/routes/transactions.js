// Transactions Router (Brief v04 Section 8.1)
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/transactions - List transactions with optional type/node filters
router.get('/', (req, res) => {
  try {
    const { type, nodeId, limit = 100 } = req.query;
    let query = `
      SELECT t.id, t.user_id, t.type, t.from_node_id, t.to_node_id, t.amount, t.currency, t.date, t.note, t.category,
             n_from.label as from_label, n_to.label as to_label
      FROM transactions t
      JOIN nodes n_from ON n_from.id = t.from_node_id
      JOIN nodes n_to ON n_to.id = t.to_node_id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (type && type !== 'all') {
      query += ` AND t.type = ?`;
      params.push(type);
    }

    if (nodeId) {
      query += ` AND (t.from_node_id = ? OR t.to_node_id = ?)`;
      params.push(nodeId, nodeId);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const transactions = db.prepare(query).all(...params);

    const formatted = transactions.map(t => ({
      id: t.id,
      type: t.type,
      fromId: t.from_node_id,
      fromLabel: t.from_label,
      toId: t.to_node_id,
      toLabel: t.to_label,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      note: t.note
    }));

    res.json({ transactions: formatted });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Gagal mengambil data transaksi.' });
  }
});

// POST /api/transactions - Atomic transaction logging
router.post('/', (req, res) => {
  const { type, fromId, fromLabel, toId, toLabel, amount, date, note } = req.body;

  if (!type || !amount) {
    return res.status(400).json({ error: 'Tipe transaksi dan nominal wajib diisi.' });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Nominal harus berupa angka positif.' });
  }

  const txId = 'tx_' + Date.now();
  const txDate = date || new Date().toISOString().split('T')[0];

  // Atomic database transaction
  const executeTx = db.transaction(() => {
    let resolvedFromId = fromId;
    let resolvedToId = toId;

    // Helper: auto-create income node if passed by label
    if (type === 'income' && (!fromId || fromId.startsWith('inc_'))) {
      let node = db.prepare('SELECT id FROM nodes WHERE user_id = ? AND label = ? AND type = "income"').get(req.user.id, fromLabel || fromId);
      if (!node) {
        resolvedFromId = 'inc_' + Date.now();
        db.prepare('INSERT INTO nodes (id, user_id, label, type) VALUES (?, ?, ?, "income")').run(resolvedFromId, req.user.id, fromLabel || 'Income');
      } else {
        resolvedFromId = node.id;
      }
    }

    // Helper: auto-create expense node if passed by label
    if (type === 'expense' && (!toId || toId.startsWith('exp_'))) {
      let node = db.prepare('SELECT id FROM nodes WHERE user_id = ? AND label = ? AND type = "expense"').get(req.user.id, toLabel || toId);
      if (!node) {
        resolvedToId = 'exp_' + Date.now();
        db.prepare('INSERT INTO nodes (id, user_id, label, type) VALUES (?, ?, ?, "expense")').run(resolvedToId, req.user.id, toLabel || 'Expense');
      } else {
        resolvedToId = node.id;
      }
    }

    // 1. Insert Transaction
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, from_node_id, to_node_id, amount, date, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, req.user.id, type, resolvedFromId, resolvedToId, amt, txDate, note || '');

    // 2. Adjust balances & flows
    if (type === 'income') {
      db.prepare('UPDATE nodes SET total_inflow = total_inflow + ? WHERE id = ?').run(amt, resolvedFromId);
      db.prepare('UPDATE nodes SET current_balance = current_balance + ?, total_inflow = total_inflow + ? WHERE id = ?').run(amt, amt, resolvedToId);
    } else if (type === 'expense') {
      db.prepare('UPDATE nodes SET current_balance = current_balance - ?, total_outflow = total_outflow + ? WHERE id = ?').run(amt, amt, resolvedFromId);
      db.prepare('UPDATE nodes SET total_outflow = total_outflow + ? WHERE id = ?').run(amt, resolvedToId);
    } else if (type === 'transfer') {
      db.prepare('UPDATE nodes SET current_balance = current_balance - ?, total_outflow = total_outflow + ? WHERE id = ?').run(amt, amt, resolvedFromId);
      db.prepare('UPDATE nodes SET current_balance = current_balance + ?, total_inflow = total_inflow + ? WHERE id = ?').run(amt, amt, resolvedToId);
    }

    return {
      id: txId,
      type,
      fromId: resolvedFromId,
      toId: resolvedToId,
      amount: amt,
      date: txDate,
      note: note || ''
    };
  });

  try {
    const result = executeTx();
    res.status(201).json({
      message: 'Transaksi berhasil dicatat.',
      transaction: result
    });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi di database: ' + err.message });
  }
});

// DELETE /api/transactions/:id - Delete transaction and revert balance
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const revertTx = db.transaction(() => {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!tx) {
      throw new Error('Transaksi tidak ditemukan.');
    }

    const amt = tx.amount;
    // Revert balances
    if (tx.type === 'income') {
      db.prepare('UPDATE nodes SET total_inflow = total_inflow - ? WHERE id = ?').run(amt, tx.from_node_id);
      db.prepare('UPDATE nodes SET current_balance = current_balance - ?, total_inflow = total_inflow - ? WHERE id = ?').run(amt, amt, tx.to_node_id);
    } else if (tx.type === 'expense') {
      db.prepare('UPDATE nodes SET current_balance = current_balance + ?, total_outflow = total_outflow - ? WHERE id = ?').run(amt, amt, tx.from_node_id);
      db.prepare('UPDATE nodes SET total_outflow = total_outflow - ? WHERE id = ?').run(amt, tx.to_node_id);
    } else if (tx.type === 'transfer') {
      db.prepare('UPDATE nodes SET current_balance = current_balance + ?, total_outflow = total_outflow - ? WHERE id = ?').run(amt, amt, tx.from_node_id);
      db.prepare('UPDATE nodes SET current_balance = current_balance - ?, total_inflow = total_inflow - ? WHERE id = ?').run(amt, amt, tx.to_node_id);
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return true;
  });

  try {
    revertTx();
    res.json({ message: 'Transaksi berhasil dihapus dan saldo telah disesuaikan kembali.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
