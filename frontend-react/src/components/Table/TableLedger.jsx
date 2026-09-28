import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { useI18n } from '../../hooks/useI18n.js';

export function TableLedger({
  isDetailedMode,
  onToggleDetailedMode,
  sortOrder,
  onToggleSortOrder,
  tableFilter,
  onTableFilterChange,
  scopeFilter,
  activePocketFilterIds,
  nodeClickAction,
  onNodeClickActionChange,
  onSelectNode,
  onEditTransaction,
  dateRange,
  presetView,
  customMinBalance,
  selectedIncomeIds,
  showToast
}) {
  const { pockets, incomeSources, expenseCategories, transactions, addTransaction, deleteTransaction } = useStore();
  const { formatCurrency, formatDate, t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Quick Add Row local form state
  const [qaDate, setQaDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qaType, setQaType] = useState('expense');
  const [qaAmount, setQaAmount] = useState('');
  const [qaAdmin, setQaAdmin] = useState('0');
  const [qaShipping, setQaShipping] = useState('0');
  const [qaSource, setQaSource] = useState('');
  const [qaTarget, setQaTarget] = useState('');
  const [qaNote, setQaNote] = useState('');
  const [isQaFeesOpen, setIsQaFeesOpen] = useState(false);

  // Compute Running Balances accurately from chronological order
  const txRunningBalances = useMemo(() => {
    const sortedChronological = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalBal = pockets.reduce((sum, p) => sum + (p.balance || 0), 0);
    const balances = {};
    let bal = totalBal;

    for (let i = sortedChronological.length - 1; i >= 0; i--) {
      const tx = sortedChronological[i];
      balances[tx.id] = bal;

      let impact = 0;
      if (tx.type === 'income') {
        impact = tx.amount;
      } else if (tx.type === 'expense') {
        impact = -(tx.amount + (tx.adminFee || 0) + (tx.shippingFee || 0));
      } else if (tx.type === 'transfer') {
        impact = -(tx.adminFee || 0);
      }
      bal -= impact;
    }
    return balances;
  }, [transactions, pockets]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Filter by type
    if (tableFilter !== 'all') {
      list = list.filter(t => t.type === tableFilter);
    }

    // Filter by scope
    if (scopeFilter === 'filtered' && activePocketFilterIds.length > 0) {
      const activeSet = new Set(activePocketFilterIds);
      list = list.filter(t => {
        if (t.type === 'expense') return activeSet.has(t.fromId);
        if (t.type === 'income') return activeSet.has(t.toId);
        if (t.type === 'transfer') return activeSet.has(t.fromId) || activeSet.has(t.toId);
        return false;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.note && t.note.toLowerCase().includes(q)) ||
        (t.fromLabel && t.fromLabel.toLowerCase().includes(q)) ||
        (t.toLabel && t.toLabel.toLowerCase().includes(q))
      );
    }

    // Filter by Date Range
    if (dateRange?.start) {
      list = list.filter(t => t.date >= dateRange.start);
    }
    if (dateRange?.end) {
      list = list.filter(t => t.date <= dateRange.end);
    }

    // Filter by Balance if preset is balance
    if (presetView === 'balance' && customMinBalance > 0) {
      list = list.filter(t => t.amount >= customMinBalance);
    }

    // Filter by Income Sources if preset is income
    if (presetView === 'income' && selectedIncomeIds?.length > 0) {
      const incSet = new Set(selectedIncomeIds);
      list = list.filter(t => t.type === 'income' && incSet.has(t.fromId));
    }

    // Sort order: Latest first (default) vs Oldest first
    if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return list;
  }, [transactions, tableFilter, scopeFilter, activePocketFilterIds, searchQuery, sortOrder, dateRange, presetView, customMinBalance, selectedIncomeIds]);

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(qaAmount);
    if (!numAmount || numAmount <= 0) {
      showToast('Masukkan jumlah nominal yang valid!');
      return;
    }

    let fromId = qaSource || (qaType === 'income' ? incomeSources[0]?.id : pockets[0]?.id);
    let toId = qaTarget || (qaType === 'expense' ? expenseCategories[0]?.id : (qaType === 'transfer' ? (pockets[1]?.id || pockets[0]?.id) : pockets[0]?.id));

    if (qaType === 'transfer' && fromId === toId) {
      showToast('Sumber dan tujuan transfer tidak boleh sama!');
      return;
    }

    const fromNode = [...pockets, ...incomeSources, ...expenseCategories].find(n => n.id === fromId);
    const toNode = [...pockets, ...incomeSources, ...expenseCategories].find(n => n.id === toId);

    addTransaction({
      date: qaDate || new Date().toISOString().split('T')[0],
      type: qaType,
      amount: numAmount,
      adminFee: parseFloat(qaAdmin) || 0,
      shippingFee: parseFloat(qaShipping) || 0,
      fromId,
      fromLabel: fromNode?.label || fromId,
      toId,
      toLabel: toNode?.label || toId,
      note: qaNote || (qaType === 'transfer' ? 'Transfer Cepat' : (qaType === 'income' ? 'Pemasukan Cepat' : 'Pengeluaran Cepat'))
    });

    setQaAmount('');
    setQaNote('');
    setQaAdmin('0');
    setQaShipping('0');
    setIsQaFeesOpen(false);
    showToast('Transaksi berhasil dicatat!');
  };

  const handleDuplicate = (tx) => {
    const today = new Date().toISOString().split('T')[0];
    addTransaction({
      type: tx.type,
      fromId: tx.fromId,
      fromLabel: tx.fromLabel,
      toId: tx.toId,
      toLabel: tx.toLabel,
      amount: tx.amount,
      adminFee: tx.adminFee || 0,
      shippingFee: tx.shippingFee || 0,
      date: today,
      note: tx.note ? `${tx.note} (Salinan)` : 'Salinan Transaksi'
    });
    showToast('Transaksi berhasil diduplikasi untuk hari ini!');
  };

  const handleDelete = (txId) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      deleteTransaction(txId);
      showToast('Transaksi telah dihapus');
    }
  };

  const qaTotalKas = (Number(qaAmount) || 0) + (Number(qaAdmin) || 0) + (Number(qaShipping) || 0);

  return (
    <section id="tableViewContainer" className="table-view-container">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="table-search-group">
          <input
            type="text"
            className="table-search-input"
            placeholder="Cari transaksi, pos, catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Detail Mode Toggle */}
          <button
            type="button"
            className="btn-action-icon"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: `1px solid ${isDetailedMode ? '#38bdf8' : 'var(--border-color)'}`,
              color: isDetailedMode ? '#38bdf8' : '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            title="Toggle antara Tampilan Ringkas dan Mode Rinci (Raw Data)"
            onClick={onToggleDetailedMode}
          >
            <span>{isDetailedMode ? '📋' : '📑'}</span>
            <span>{isDetailedMode ? 'Simple Mode' : 'Detailed Mode'}</span>
          </button>

          {/* Sort Order Toggle */}
          <button
            type="button"
            className={`btn-action-icon sort-order-toggle-btn ${sortOrder === 'oldest' ? 'order-oldest' : ''}`}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            title={sortOrder === 'latest' ? 'Urutan saat ini: Terbaru Dulu (Klik untuk Terlama Dulu)' : 'Urutan saat ini: Terlama Dulu (Klik untuk Terbaru Dulu)'}
            onClick={onToggleSortOrder}
          >
            <span>{sortOrder === 'latest' ? '⬇️' : '⬆️'}</span>
            <span>{sortOrder === 'latest' ? 'Terbaru Dulu' : 'Terlama Dulu'}</span>
          </button>

          {/* Type Filter Pills */}
          <div className="table-filters">
            <button
              type="button"
              className={`filter-btn ${tableFilter === 'all' ? 'active' : ''}`}
              onClick={() => onTableFilterChange('all')}
            >
              Semua
            </button>
            <button
              type="button"
              className={`filter-btn ${tableFilter === 'income' ? 'active' : ''}`}
              onClick={() => onTableFilterChange('income')}
            >
              Pemasukan
            </button>
            <button
              type="button"
              className={`filter-btn ${tableFilter === 'expense' ? 'active' : ''}`}
              onClick={() => onTableFilterChange('expense')}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              className={`filter-btn ${tableFilter === 'transfer' ? 'active' : ''}`}
              onClick={() => onTableFilterChange('transfer')}
            >
              Pindah Saldo
            </button>
          </div>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="ledger-table-wrapper">
        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: 38, textAlign: 'center' }} title="Rel Timeline Vertikal">TIMELINE</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={onToggleSortOrder} title="Klik untuk ubah urutan tanggal">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Tanggal
                  <span style={{ fontSize: 10, color: '#38bdf8' }}>{sortOrder === 'latest' ? '▼' : '▲'}</span>
                </span>
              </th>
              <th>Jenis</th>
              {isDetailedMode ? (
                <>
                  <th title="Nominal Pokok Tanpa Biaya Tambahan">Nominal Pokok</th>
                  <th title="Biaya Transfer / Administrasi">Biaya Admin</th>
                  <th title="Ongkos Kirim">Ongkos Kirim</th>
                  <th title="Total Kas Riil Masuk/Keluar Termasuk Admin & Ongkir">Total Kas</th>
                </>
              ) : (
                <th>Perubahan</th>
              )}
              <th>Saldo Berjalan</th>
              <th>Dari (Sumber)</th>
              <th>Tujuan</th>
              <th>Kantong Terkait</th>
              <th>Catatan</th>
              <th style={{ textAlign: 'right', position: 'sticky', right: 0, background: '#0f172a', zIndex: 3 }}>Aksi</th>
            </tr>

            {/* Inline Quick Add Row */}
            <tr className="table-quick-add-row">
              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 800, fontSize: 14 }}>⚡</td>
              <td>
                <input
                  type="date"
                  className="quick-input"
                  value={qaDate}
                  onChange={(e) => setQaDate(e.target.value)}
                />
              </td>
              <td>
                <select
                  className="quick-select"
                  value={qaType}
                  onChange={(e) => setQaType(e.target.value)}
                >
                  <option value="expense">EXPENSE</option>
                  <option value="income">INCOME</option>
                  <option value="transfer">TRANSFER</option>
                </select>
              </td>

              {isDetailedMode ? (
                <>
                  <td>
                    <input
                      type="number"
                      className="quick-input"
                      placeholder="Rp Pokok"
                      min="1"
                      required
                      value={qaAmount}
                      onChange={(e) => setQaAmount(e.target.value)}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="quick-input"
                      placeholder="Admin"
                      min="0"
                      value={qaAdmin}
                      onChange={(e) => setQaAdmin(e.target.value)}
                      style={{ width: 65 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="quick-input"
                      placeholder="Ongkir"
                      min="0"
                      value={qaShipping}
                      onChange={(e) => setQaShipping(e.target.value)}
                      style={{ width: 65 }}
                    />
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {formatCurrency(qaTotalKas)}
                  </td>
                </>
              ) : (
                <td>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', position: 'relative' }}>
                    <input
                      type="number"
                      className="quick-input"
                      placeholder="Rp Pokok"
                      min="1"
                      required
                      value={qaAmount}
                      onChange={(e) => setQaAmount(e.target.value)}
                      style={{ width: 80 }}
                    />
                    <button
                      type="button"
                      className="quick-btn-icon"
                      title="Rincian Admin & Ongkir"
                      onClick={() => setIsQaFeesOpen(!isQaFeesOpen)}
                    >
                      🏷️
                    </button>
                    {isQaFeesOpen && (
                      <div className="quick-fees-popover" style={{ display: 'block' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>RINCIAN BIAYA</div>
                        <label style={{ fontSize: 9, color: '#cbd5e1' }}>Biaya Admin:</label>
                        <input
                          type="number"
                          className="quick-input"
                          min="0"
                          value={qaAdmin}
                          onChange={(e) => setQaAdmin(e.target.value)}
                          style={{ marginBottom: 4 }}
                        />
                        <label style={{ fontSize: 9, color: '#cbd5e1' }}>Ongkos Kirim:</label>
                        <input
                          type="number"
                          className="quick-input"
                          min="0"
                          value={qaShipping}
                          onChange={(e) => setQaShipping(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </td>
              )}

              <td style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Auto-Calc</td>
              <td>
                <select
                  className="quick-select"
                  value={qaSource}
                  onChange={(e) => setQaSource(e.target.value)}
                >
                  {qaType === 'income' ? (
                    incomeSources.map(i => <option key={i.id} value={i.id}>{i.label}</option>)
                  ) : (
                    pockets.map(p => <option key={p.id} value={p.id}>{p.label} ({formatCurrency(p.balance)})</option>)
                  )}
                </select>
              </td>
              <td>
                <select
                  className="quick-select"
                  value={qaTarget}
                  onChange={(e) => setQaTarget(e.target.value)}
                >
                  {qaType === 'expense' ? (
                    expenseCategories.map(e => <option key={e.id} value={e.id}>{e.label}</option>)
                  ) : (
                    pockets.map(p => <option key={p.id} value={p.id}>{p.label} ({formatCurrency(p.balance)})</option>)
                  )}
                </select>
              </td>
              <td style={{ fontSize: 11, color: '#93c5fd', whiteSpace: 'nowrap' }}>-</td>
              <td>
                <input
                  type="text"
                  className="quick-input"
                  placeholder="Catatan..."
                  value={qaNote}
                  onChange={(e) => setQaNote(e.target.value)}
                  style={{ minWidth: 110 }}
                />
              </td>
              <td className="sticky-action-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  className="btn-action btn-income"
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                  onClick={handleQuickAddSubmit}
                >
                  + Catat
                </button>
              </td>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={isDetailedMode ? 13 : 10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  Tidak ada transaksi yang tercatat.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, idx) => {
                const isFirstRow = idx === 0;
                const isLastRow = idx === filteredTransactions.length - 1;
                const isInc = tx.type === 'income';
                const isExp = tx.type === 'expense';
                const changeSign = isInc ? '+' : (isExp ? '-' : '⇄');
                const totalCash = tx.amount + (tx.adminFee || 0) + (tx.shippingFee || 0);
                const runningBal = txRunningBalances[tx.id] ?? 0;

                // Find pocket label
                let assignedPocket = '-';
                if (tx.type === 'expense') {
                  const p = pockets.find(pkt => pkt.id === tx.fromId);
                  assignedPocket = p ? p.label : tx.fromLabel;
                } else if (tx.type === 'income') {
                  const p = pockets.find(pkt => pkt.id === tx.toId);
                  assignedPocket = p ? p.label : tx.toLabel;
                } else if (tx.type === 'transfer') {
                  const p1 = pockets.find(pkt => pkt.id === tx.fromId);
                  const p2 = pockets.find(pkt => pkt.id === tx.toId);
                  assignedPocket = `${p1 ? p1.label : tx.fromLabel} ➔ ${p2 ? p2.label : tx.toLabel}`;
                }

                return (
                  <tr
                    key={tx.id}
                    data-tx-id={tx.id}
                    className={selectedTxId === tx.id ? 'row-active-frame' : ''}
                    onClick={() => {
                      setSelectedTxId(tx.id);
                      if (typeof window !== 'undefined' && window.timelineController) {
                        window.timelineController.jumpToTx(tx.id, true);
                      }
                      const targetId = tx.type === 'expense' ? tx.toId : (tx.type === 'income' ? tx.fromId : tx.toId);
                      onSelectNode(targetId);
                    }}
                  >
                    {/* Vertical Timeline Rail */}
                    <td className="timeline-rail-cell">
                      <div className={`timeline-rail-wrapper ${isFirstRow ? 'is-first' : ''} ${isLastRow ? 'is-last' : ''}`}>
                        <div className="timeline-rail-line-top"></div>
                        <div className={`timeline-rail-dot ${selectedTxId === tx.id ? 'active' : ''}`}>
                          <div className="timeline-rail-dot-core"></div>
                        </div>
                        <div className="timeline-rail-line-bottom"></div>
                      </div>
                    </td>

                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                    <td>
                      <span className={`badge-tag tag-${tx.type}`}>{tx.type.toUpperCase()}</span>
                    </td>

                    {isDetailedMode ? (
                      <>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: isInc ? '#34d399' : (isExp ? '#f87171' : '#60a5fa') }}>
                          {changeSign}{formatCurrency(tx.amount)}
                        </td>
                        <td style={{ color: tx.adminFee ? '#f59e0b' : '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
                          {tx.adminFee ? formatCurrency(tx.adminFee) : '-'}
                        </td>
                        <td style={{ color: tx.shippingFee ? '#f59e0b' : '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
                          {tx.shippingFee ? formatCurrency(tx.shippingFee) : '-'}
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', color: isInc ? '#34d399' : (isExp ? '#f87171' : '#60a5fa') }}>
                          {changeSign}{formatCurrency(totalCash)}
                        </td>
                      </>
                    ) : (
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: isInc ? '#34d399' : (isExp ? '#f87171' : '#60a5fa') }}>
                        {changeSign}{formatCurrency(totalCash)}
                      </td>
                    )}

                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#93c5fd' }}>
                      {formatCurrency(runningBal)}
                    </td>
                    <td><span style={{ color: '#cbd5e1', fontWeight: 500 }}>{tx.fromLabel}</span></td>
                    <td><span style={{ color: '#cbd5e1', fontWeight: 500 }}>{tx.toLabel}</span></td>
                    <td><span className="badge-tag tag-pocket">{assignedPocket}</span></td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.note || '-'}
                    </td>

                    {/* Sticky Action Cell */}
                    <td className="sticky-action-cell" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="btn-action-icon"
                          title="Edit Transaksi"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#38bdf8', cursor: 'pointer', padding: '3px 6px', fontSize: 11 }}
                          onClick={() => onEditTransaction(tx)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon"
                          title="Duplikasi Transaksi Hari Ini"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#a78bfa', cursor: 'pointer', padding: '3px 6px', fontSize: 11 }}
                          onClick={() => handleDuplicate(tx)}
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon"
                          title="Hapus Transaksi"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#ef4444', cursor: 'pointer', padding: '3px 6px', fontSize: 11 }}
                          onClick={() => handleDelete(tx.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
