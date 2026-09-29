import React from 'react';
import { useStore } from '../../hooks/useStore.js';
import { useI18n } from '../../hooks/useI18n.js';
import { accountManager } from '../../services/accounts.js';

export function ModalExportData({
  isOpen,
  onClose,
  dateRange = {},
  presetView = 'all',
  customMinBalance = 0,
  selectedIncomeIds = [],
  scopeFilter = 'all',
  activePocketFilterIds = [],
  showToast
}) {
  const { transactions, pockets, incomeSources, expenseCategories } = useStore();
  const { formatCurrency, formatDate } = useI18n();

  if (!isOpen) return null;

  // Compute Current View filtered transactions
  let viewTxs = [...transactions];
  if (dateRange.start) viewTxs = viewTxs.filter(t => t.date >= dateRange.start);
  if (dateRange.end) viewTxs = viewTxs.filter(t => t.date <= dateRange.end);
  if (presetView === 'balance' && customMinBalance > 0) {
    viewTxs = viewTxs.filter(t => t.amount >= customMinBalance);
  }
  if (presetView === 'income' && selectedIncomeIds.length > 0) {
    const incSet = new Set(selectedIncomeIds);
    viewTxs = viewTxs.filter(t => t.type === 'income' && incSet.has(t.fromId));
  }
  if (scopeFilter === 'filtered' && activePocketFilterIds.length > 0) {
    const pSet = new Set(activePocketFilterIds);
    viewTxs = viewTxs.filter(t => {
      if (t.type === 'expense') return pSet.has(t.fromId);
      if (t.type === 'income') return pSet.has(t.toId);
      if (t.type === 'transfer') return pSet.has(t.fromId) || pSet.has(t.toId);
      return false;
    });
  }

  const allNodes = [...pockets, ...incomeSources, ...expenseCategories];

  const handleDownload = async (format, scope) => {
    const targetTxs = scope === 'view' ? viewTxs : transactions;
    const token = accountManager.token || localStorage.getItem('spm_auth_token') || localStorage.getItem('student_pocket_token') || '';

    showToast(`Menyiapkan export ${format.toUpperCase()} (${scope === 'view' ? 'Current View' : 'All Data'})...`);

    try {
      const response = await fetch(`/api/export/${format}?scope=${scope}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scope,
          transactions: targetTxs,
          nodes: allNodes,
          startDate: dateRange.start,
          endDate: dateRange.end,
          minBalance: customMinBalance,
          pocketIds: activePocketFilterIds,
          incomeIds: selectedIncomeIds
        })
      });

      if (!response.ok) {
        throw new Error('Server returned ' + response.status);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `student_pocket_${scope}_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Berhasil mengunduh file .${format} (${targetTxs.length} transaksi)!`);
      onClose();
    } catch (err) {
      console.warn('API export fallback:', err);
      // Direct GET download fallback with token & userId
      const q = new URLSearchParams({
        scope,
        ...(token ? { token } : {}),
        ...(accountManager.activeUserId ? { userId: accountManager.activeUserId } : {}),
        ...(dateRange.start ? { startDate: dateRange.start } : {}),
        ...(dateRange.end ? { endDate: dateRange.end } : {}),
        ...(customMinBalance ? { minBalance: customMinBalance } : {})
      });
      window.location.href = `/api/export/${format}?${q.toString()}`;
      onClose();
    }
  };

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div
        className="modal-card modal-card-export"
        style={{ maxWidth: 740, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📥</span>
            <div>
              <h2 className="modal-title" style={{ fontSize: 15 }}>Export Data Keuangan</h2>
              <p className="modal-subtitle" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Tabel opsi format file dan cakupan view scope (Current View vs All Time)
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Status Scope Indicator */}
        <div
          style={{
            margin: '12px 20px 0 20px',
            padding: '8px 12px',
            background: 'var(--bg-primary)',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <strong style={{ color: 'var(--accent-blender)' }}>🎯 Current View Scope: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              {dateRange.start ? `${formatDate(dateRange.start)} s/d ${formatDate(dateRange.end || dateRange.start)}` : 'Semua Tanggal'} • {viewTxs.length} Transaksi
            </span>
          </div>
          <div>
            <strong style={{ color: '#38bdf8' }}>🌐 All Data: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              {transactions.length} Transaksi Total • {pockets.length} Kantong
            </span>
          </div>
        </div>

        {/* Options Matrix Table */}
        <div style={{ padding: '14px 20px', overflowX: 'auto' }}>
          <table className="export-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>File Format</th>
                <th style={{ width: '36%' }}>🎯 Current View ({viewTxs.length} data)</th>
                <th style={{ width: '36%' }}>🌐 All Database ({transactions.length} data)</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: CSV */}
              <tr>
                <td>
                  <div className="format-title-group">
                    <span className="format-badge format-csv">CSV</span>
                    <div>
                      <div className="format-name">Spreadsheet (.csv)</div>
                      <div className="format-sub">Excel, Google Sheets, Calc</div>
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-view"
                    onClick={() => handleDownload('csv', 'view')}
                    title="Ekspor CSV terfilter berdasarkan rentang view saat ini"
                  >
                    📥 Unduh CSV (Current View)
                  </button>
                  <div className="matrix-subtext">{viewTxs.length} baris terfilter</div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-all"
                    onClick={() => handleDownload('csv', 'all')}
                    title="Ekspor CSV lengkap seluruh riwayat"
                  >
                    📥 Unduh CSV (All Data)
                  </button>
                  <div className="matrix-subtext">{transactions.length} baris total</div>
                </td>
              </tr>

              {/* Row 2: SQLite .db (Featured for DB Browser for SQLite) */}
              <tr className="highlight-db-row">
                <td>
                  <div className="format-title-group">
                    <span className="format-badge format-db">.DB</span>
                    <div>
                      <div className="format-name" style={{ color: '#60a5fa' }}>
                        SQLite Database (.db)
                      </div>
                      <div className="format-sub" style={{ color: '#93c5fd' }}>
                        ⭐ DB Browser for SQLite
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-view btn-matrix-db"
                    onClick={() => handleDownload('db', 'view')}
                    title="Ekspor database SQLite binary format asli berisi data terfilter"
                  >
                    📥 Unduh .db (Current View)
                  </button>
                  <div className="matrix-subtext">Format biner SQLite 3 asli</div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-all btn-matrix-db"
                    onClick={() => handleDownload('db', 'all')}
                    title="Ekspor database SQLite binary format asli seluruh data"
                  >
                    📥 Unduh .db (All Data)
                  </button>
                  <div className="matrix-subtext">Format biner SQLite 3 asli</div>
                </td>
              </tr>

              {/* Row 3: SQL Script */}
              <tr>
                <td>
                  <div className="format-title-group">
                    <span className="format-badge format-sql">SQL</span>
                    <div>
                      <div className="format-name">SQL Dump (.sql)</div>
                      <div className="format-sub">DDL CREATE + INSERT Statements</div>
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-view"
                    onClick={() => handleDownload('sql', 'view')}
                    title="Ekspor script query SQL terfilter"
                  >
                    📥 Unduh SQL (Current View)
                  </button>
                  <div className="matrix-subtext">Skrip DDL &amp; INSERT terfilter</div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-export-matrix btn-matrix-all"
                    onClick={() => handleDownload('sql', 'all')}
                    title="Ekspor script query SQL seluruh database"
                  >
                    📥 Unduh SQL (All Data)
                  </button>
                  <div className="matrix-subtext">Skrip DDL &amp; INSERT lengkap</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Compatibility Notice Footer */}
        <div className="export-modal-footer-notice">
          <span style={{ fontSize: 14 }}>🗄️</span>
          <div>
            <strong>Kompatibilitas Penuh DB Browser for SQLite:</strong> File <code>.db</code> diekspor dalam format biner SQLite 3 resmi (magic header <code>SQLite format 3</code>). Anda dapat langsung membuka file <code>.db</code> tersebut di aplikasi <strong>DB Browser for SQLite</strong> di komputer Anda tanpa error <em>in-memory</em>.
          </div>
        </div>
      </div>
    </div>
  );
}
