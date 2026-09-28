import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { useI18n } from '../../hooks/useI18n.js';

export function NodeInspector({
  selectedNodeId,
  isOpen,
  onClose,
  onOpenCreateNode,
  showToast
}) {
  const { pockets, incomeSources, expenseCategories, transactions, addTransaction, getNodeAttachments } = useStore();
  const { formatCurrency, formatDate, t } = useI18n();

  // Form state for quick add transaction inside inspector
  const [txType, setTxType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [adminFee, setAdminFee] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [note, setNote] = useState('');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  if (!isOpen) return null;

  // Find node in pockets, income sources, or expense categories
  let node = pockets.find(p => p.id === selectedNodeId);
  let nodeType = 'account';
  if (!node) {
    node = incomeSources.find(i => i.id === selectedNodeId);
    nodeType = 'income';
  }
  if (!node) {
    node = expenseCategories.find(e => e.id === selectedNodeId);
    nodeType = 'expense';
  }

  // Handle column totals
  const isTotalIncome = selectedNodeId === 'total-income';
  const isTotalPocket = selectedNodeId === 'total-pocket';
  const isTotalExpense = selectedNodeId === 'total-expense';
  const isColumnTotal = isTotalIncome || isTotalPocket || isTotalExpense;

  // Filter transactions for this node
  const nodeTransactions = transactions.filter(tx => {
    if (isTotalIncome) return tx.type === 'income';
    if (isTotalPocket) return true;
    if (isTotalExpense) return tx.type === 'expense';
    if (!node) return false;
    return tx.fromId === node.id || tx.toId === node.id;
  });

  const attachments = node ? (getNodeAttachments(node.id) || []) : [];

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Masukkan nominal yang valid!');
      return;
    }

    let finalFrom = sourceId || (nodeType === 'account' ? node.id : (pockets[0]?.id || ''));
    let finalTo = destId || (nodeType === 'expense' ? node.id : (expenseCategories[0]?.id || ''));

    if (txType === 'income') {
      finalFrom = sourceId || (incomeSources[0]?.id || '');
      finalTo = nodeType === 'account' ? node.id : (pockets[0]?.id || '');
    } else if (txType === 'transfer') {
      finalFrom = nodeType === 'account' ? node.id : (pockets[0]?.id || '');
      finalTo = destId || (pockets.find(p => p.id !== finalFrom)?.id || '');
    }

    addTransaction({
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount: numAmount,
      fromId: finalFrom,
      toId: finalTo,
      adminFee: parseFloat(adminFee) || 0,
      shippingFee: parseFloat(shippingFee) || 0,
      note: note || (txType === 'transfer' ? 'Transfer Cepat' : (txType === 'income' ? 'Pemasukan Cepat' : 'Pengeluaran Cepat'))
    });

    setAmount('');
    setNote('');
    setAdminFee(0);
    setShippingFee(0);
    showToast('Transaksi berhasil dicatat!');
  };

  const totalCalculated = (Number(amount) || 0) + (Number(adminFee) || 0) + (Number(shippingFee) || 0);

  return (
    <aside id="inspectorSidebar" className="inspector-sidebar">
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>Detail &amp; Editor Panel</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-action-icon"
            style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
            title="Tambah Node Baru ke Canvas"
            onClick={onOpenCreateNode}
          >
            + Node
          </button>
          <button
            type="button"
            className="btn-close-inspector"
            title="Tutup Panel"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div id="inspectorBody" className="inspector-body">
        {!node && !isColumnTotal ? (
          <div className="inspector-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <p>Klik sembarang node pada canvas untuk memeriksa riwayat alur kas.</p>
          </div>
        ) : isColumnTotal ? (
          <div className="inspector-node-card">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>
              {isTotalIncome ? '🟢 Ringkasan Pemasukan' : isTotalPocket ? '🔵 Ringkasan Saldo Kantong' : '🔴 Ringkasan Pengeluaran'}
            </h3>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              Total mutasi tercatat: <strong style={{ color: '#f1f5f9' }}>{nodeTransactions.length} transaksi</strong>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Node Statistics & Info Card */}
            <div className="inspector-node-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge-tag tag-${nodeType}`}>
                  {nodeType.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {node.id}
                </span>
              </div>
              <h3 style={{ margin: '8px 0 12px', fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>
                {node.label}
              </h3>
              <div className="inspector-stat-grid">
                <div className="inspector-stat-box" style={{ gridColumn: 'span 2' }}>
                  <div className="inspector-stat-lbl">
                    {nodeType === 'account' ? 'Saldo Saat Ini' : (nodeType === 'income' ? 'Total Pemasukan' : 'Total Pengeluaran')}
                  </div>
                  <div className={`inspector-stat-val text-${nodeType === 'account' ? 'balance' : (nodeType === 'income' ? 'inflow' : 'outflow')}`} style={{ fontSize: 18 }}>
                    {formatCurrency(node.balance || node.total || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Interactive Mutasi Quick-Add Form */}
            <div className="inspector-node-card">
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚡</span>
                <span>Catat Transaksi untuk Node Ini</span>
              </h4>
              <form onSubmit={handleQuickSubmit}>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className={`filter-btn ${txType === 'expense' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
                      onClick={() => setTxType('expense')}
                    >
                      Pengeluaran
                    </button>
                    <button
                      type="button"
                      className={`filter-btn ${txType === 'income' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
                      onClick={() => setTxType('income')}
                    >
                      Pemasukan
                    </button>
                    {nodeType === 'account' && (
                      <button
                        type="button"
                        className={`filter-btn ${txType === 'transfer' ? 'active' : ''}`}
                        style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
                        onClick={() => setTxType('transfer')}
                      >
                        Transfer
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Nominal Pokok (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Cth: 50000"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ fontSize: 12, padding: '6px 8px' }}
                  />
                </div>

                {/* Additional breakdown toggle for fees */}
                <div style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 10, cursor: 'pointer', padding: 0 }}
                    onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                  >
                    {isBreakdownOpen ? '▼ Sembunyikan Biaya Admin & Ongkir' : '▶ Tambah Biaya Admin & Ongkir...'}
                  </button>

                  {isBreakdownOpen && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: 9 }}>Biaya Admin</label>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          value={adminFee}
                          onChange={(e) => setAdminFee(e.target.value)}
                          style={{ fontSize: 11, padding: '4px 6px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: 9 }}>Ongkir</label>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(e.target.value)}
                          style={{ fontSize: 11, padding: '4px 6px' }}
                        />
                      </div>
                    </div>
                  )}

                  {isBreakdownOpen && (
                    <div style={{ fontSize: 11, marginTop: 4, color: '#38bdf8', fontWeight: 700 }}>
                      Total Terhitung: {formatCurrency(totalCalculated)}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Catatan</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Keterangan transaksi"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ fontSize: 11, padding: '4px 6px' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-action btn-income"
                  style={{ width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: 700 }}
                >
                  + Catat Transaksi
                </button>
              </form>
            </div>

            {/* 3. Transaction History */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 8px', color: '#cbd5e1' }}>
                Riwayat Transaksi Terkait ({nodeTransactions.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {nodeTransactions.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
                    Belum ada riwayat transaksi untuk node ini.
                  </div>
                ) : (
                  nodeTransactions.map(tx => (
                    <div
                      key={tx.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{tx.note || tx.type.toUpperCase()}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', color: tx.type === 'income' ? '#34d399' : '#f87171' }}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount + (tx.adminFee || 0) + (tx.shippingFee || 0))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
