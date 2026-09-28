import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { useI18n } from '../../hooks/useI18n.js';

export function TimelineRangeControls({
  dateRange,
  onDateRangeChange,
  presetView,
  onPresetViewChange,
  customMinBalance,
  onCustomMinBalanceChange,
  selectedIncomeIds,
  onSelectedIncomeIdsChange,
  scopeFilter,
  activePocketFilterIds,
  showToast
}) {
  const { transactions, incomeSources, pockets } = useStore();
  const { formatCurrency, formatDate } = useI18n();

  const [isIncomePopoverOpen, setIsIncomePopoverOpen] = useState(false);
  const incomePopoverRef = useRef(null);

  // Close multi-select popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (incomePopoverRef.current && !incomePopoverRef.current.contains(e.target)) {
        setIsIncomePopoverOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Compute min and max dates across all transactions
  const { minTxDate, maxTxDate } = useMemo(() => {
    if (!transactions.length) {
      const now = new Date().toISOString().split('T')[0];
      return { minTxDate: now, maxTxDate: now };
    }
    const dates = transactions.map(t => t.date).sort();
    return { minTxDate: dates[0], maxTxDate: dates[dates.length - 1] };
  }, [transactions]);

  // Handle Preset Changes
  const handlePresetSelect = (preset) => {
    onPresetViewChange(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      onDateRangeChange({ start: todayStr, end: todayStr });
    } else if (preset === 'couple_days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 3);
      onDateRangeChange({ start: past.toISOString().split('T')[0], end: todayStr });
    } else if (preset === 'week') {
      const past = new Date(now);
      const day = past.getDay();
      const diff = past.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(past.setDate(diff));
      onDateRangeChange({ start: monday.toISOString().split('T')[0], end: todayStr });
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      onDateRangeChange({ start: firstDay, end: todayStr });
    } else if (preset === 'all') {
      onDateRangeChange({ start: minTxDate, end: maxTxDate });
    } else if (preset === 'income') {
      setIsIncomePopoverOpen(true);
    }
  };

  // Export data strictly based on this active view and scope
  const handleExportScopedData = () => {
    let list = [...transactions];

    // Filter by Date Range
    if (dateRange.start) {
      list = list.filter(t => t.date >= dateRange.start);
    }
    if (dateRange.end) {
      list = list.filter(t => t.date <= dateRange.end);
    }

    // Filter by Scope
    if (scopeFilter === 'filtered' && activePocketFilterIds.length > 0) {
      const activeSet = new Set(activePocketFilterIds);
      list = list.filter(t => {
        if (t.type === 'expense') return activeSet.has(t.fromId);
        if (t.type === 'income') return activeSet.has(t.toId);
        if (t.type === 'transfer') return activeSet.has(t.fromId) || activeSet.has(t.toId);
        return false;
      });
    }

    // Filter by Balance if preset is balance
    if (presetView === 'balance' && customMinBalance > 0) {
      list = list.filter(t => t.amount >= customMinBalance);
    }

    // Filter by Income Sources if preset is income
    if (presetView === 'income' && selectedIncomeIds.length > 0) {
      const incSet = new Set(selectedIncomeIds);
      list = list.filter(t => t.type === 'income' && incSet.has(t.fromId));
    }

    if (list.length === 0) {
      showToast('Tidak ada transaksi yang cocok dalam rentang ini untuk diexport.');
      return;
    }

    // Generate CSV
    const headers = ['ID', 'Tanggal', 'Jenis', 'Nominal Pokok', 'Admin', 'Ongkir', 'Total Kas', 'Dari (Sumber)', 'Tujuan', 'Catatan'];
    const rows = list.map(t => [
      t.id,
      t.date,
      t.type.toUpperCase(),
      t.amount,
      t.adminFee || 0,
      t.shippingFee || 0,
      t.amount + (t.adminFee || 0) + (t.shippingFee || 0),
      `"${(t.fromLabel || '').replace(/"/g, '""')}"`,
      `"${(t.toLabel || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student_pocket_view_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Berhasil mengekspor ${list.length} transaksi berdasarkan rentang view ini!`);
  };

  const handleSelectAllIncomes = () => {
    onSelectedIncomeIdsChange(incomeSources.map(i => i.id));
  };

  const handleClearAllIncomes = () => {
    onSelectedIncomeIdsChange([]);
  };

  const handleToggleIncome = (id) => {
    if (selectedIncomeIds.includes(id)) {
      onSelectedIncomeIdsChange(selectedIncomeIds.filter(i => i !== id));
    } else {
      onSelectedIncomeIdsChange([...selectedIncomeIds, id]);
    }
  };

  return (
    <div className="timeline-range-bar">
      {/* 1. Left: Preset View Dropdown */}
      <div className="timeline-range-preset-group">
        <label className="range-label">Preset View:</label>
        <select
          className="range-select"
          value={presetView}
          onChange={(e) => handlePresetSelect(e.target.value)}
        >
          <option value="all">Semua Waktu (All Time)</option>
          <option value="today">Hari Ini (Today)</option>
          <option value="couple_days">3 Hari Terakhir</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="balance">Berdasarkan Saldo Tertentu</option>
          <option value="income">Berdasarkan Pemasukan Tertentu</option>
        </select>

        {/* Custom Textbox if "Berdasarkan Saldo Tertentu" */}
        {presetView === 'balance' && (
          <div className="range-custom-balance-group">
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Min Rp:</span>
            <input
              type="number"
              className="range-input-num"
              placeholder="Cth: 50000"
              min="0"
              step="5000"
              value={customMinBalance || ''}
              onChange={(e) => onCustomMinBalanceChange(Number(e.target.value) || 0)}
            />
          </div>
        )}

        {/* Multi-select Dropdown Popover if "Berdasarkan Pemasukan Tertentu" */}
        {presetView === 'income' && (
          <div className="range-income-multi-wrapper" ref={incomePopoverRef}>
            <button
              type="button"
              className="range-btn-multi"
              onClick={() => setIsIncomePopoverOpen(!isIncomePopoverOpen)}
            >
              <span>{selectedIncomeIds.length ? `${selectedIncomeIds.length} Sumber Dipilih` : 'Pilih Sumber'}</span>
              <span>▾</span>
            </button>

            {isIncomePopoverOpen && (
              <div className="range-income-popover show">
                <div className="popover-action-row">
                  <button type="button" className="btn-popover-text" onClick={handleSelectAllIncomes}>
                    Pilih Semua
                  </button>
                  <span style={{ color: '#475569' }}>|</span>
                  <button type="button" className="btn-popover-text" onClick={handleClearAllIncomes}>
                    Hapus Semua
                  </button>
                </div>
                <div className="popover-checklist">
                  {incomeSources.map(inc => {
                    const isChecked = selectedIncomeIds.includes(inc.id);
                    return (
                      <label key={inc.id} className="popover-check-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleIncome(inc.id)}
                        />
                        <span>{inc.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Center: Timeline Current View Range Start & End datetime handles */}
      <div className="timeline-range-dates-group">
        <span className="range-label">Rentang Waktu:</span>
        <div className="range-date-inputs">
          <input
            type="date"
            className="range-date-input"
            title="timestartdatetime (Mulai)"
            value={dateRange.start || minTxDate}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
          />
          <span className="range-separator">➔</span>
          <input
            type="date"
            className="range-date-input"
            title="timeenddatetime (Selesai)"
            value={dateRange.end || maxTxDate}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
          />
          <button
            type="button"
            className="range-btn-reset"
            title="Reset ke rentang penuh transaksi"
            onClick={() => {
              onDateRangeChange({ start: minTxDate, end: maxTxDate });
              onPresetViewChange('all');
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* 3. Right: Export Based on View & Scope */}
      <div className="timeline-range-export-group">
        <button
          type="button"
          className="btn-export-view-scope"
          title="Ekspor data CSV berdasarkan rentang waktu, preset, dan scope saat ini"
          onClick={handleExportScopedData}
        >
          📥 <span>Export View Ini (.csv)</span>
        </button>
      </div>
    </div>
  );
}
