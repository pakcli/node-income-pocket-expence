import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { useI18n } from '../../hooks/useI18n.js';

export function KpiBar({ activePocketFilterIds, onPocketFilterChange, showToast }) {
  const { pockets, totalIncome, totalExpense } = useStore();
  const { formatCurrency, t } = useI18n();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  const toggleBtnRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) && 
        toggleBtnRef.current && 
        !toggleBtnRef.current.contains(e.target)
      ) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Compute filtered net pocket balance
  const activeSet = new Set(activePocketFilterIds);
  const filteredPocketBalance = pockets.reduce((sum, p) => {
    if (activeSet.size === 0 || activeSet.has(p.id)) {
      return sum + (p.balance || 0);
    }
    return sum;
  }, 0);

  const isAllSelected = pockets.length > 0 && activePocketFilterIds.length === pockets.length;
  const countLabel = isAllSelected
    ? `Semua (${pockets.length})`
    : `${activePocketFilterIds.length} / ${pockets.length}`;

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Keep at least the first pocket selected
      if (pockets.length > 0) {
        onPocketFilterChange([pockets[0].id]);
      }
    } else {
      onPocketFilterChange(pockets.map(p => p.id));
    }
  };

  const handlePocketToggle = (pocketId, isChecked) => {
    if (isChecked) {
      onPocketFilterChange([...activePocketFilterIds, pocketId]);
    } else {
      if (activePocketFilterIds.length <= 1) {
        showToast('Minimal 1 kantong harus tetap dipilih!');
        return;
      }
      onPocketFilterChange(activePocketFilterIds.filter(id => id !== pocketId));
    }
  };

  return (
    <div className="flow-kpi-bar">
      {/* 1. Total Inflow (Green) */}
      <div className="kpi-flow-card kpi-card-inflow">
        <div className="kpi-flow-header">
          <span className="kpi-flow-dot dot-inflow"></span>
          <span className="kpi-flow-label" data-i18n="total_income">Total Pemasukan</span>
        </div>
        <div className="kpi-flow-value text-inflow">
          +{formatCurrency(totalIncome)}
        </div>
      </div>

      {/* 2. Net Pocket Balance (Blue) with Interactive Popover */}
      <div className="kpi-flow-card kpi-card-balance" style={{ position: 'relative' }}>
        <div className="kpi-flow-header">
          <span className="kpi-flow-dot dot-balance"></span>
          <span className="kpi-flow-label" data-i18n="total_balance">Net Pocket Balance</span>
          <button
            ref={toggleBtnRef}
            type="button"
            className="kpi-pocket-filter-btn"
            title="Klik untuk memilih kantong yang disertakan dalam kalkulasi"
            onClick={(e) => {
              e.stopPropagation();
              setIsPopoverOpen(!isPopoverOpen);
            }}
          >
            <span>{countLabel}</span>
            <span style={{ fontSize: 9 }}>▼</span>
          </button>
        </div>

        <div className="kpi-flow-value text-balance">
          {formatCurrency(filteredPocketBalance)}
        </div>

        {/* Floating Pocket Checklist Popover */}
        {isPopoverOpen && (
          <div
            ref={popoverRef}
            className="kpi-pocket-filter-popover"
            style={{ display: 'block' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Kantong Aktif
              </span>
              <button
                type="button"
                className="btn-link"
                style={{ fontSize: 10, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={handleToggleAll}
              >
                {isAllSelected ? 'Pilih 1 Saja' : 'Pilih Semua'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
              {pockets.map(p => {
                const isChecked = activeSet.has(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '4px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      background: isChecked ? 'rgba(56, 189, 248, 0.08)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                        onChange={(e) => handlePocketToggle(p.id, e.target.checked)}
                      />
                      <span style={{ color: isChecked ? '#f1f5f9' : '#64748b', fontWeight: isChecked ? 600 : 400 }}>
                        {p.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'monospace', color: isChecked ? '#93c5fd' : '#64748b', fontWeight: 700, fontSize: 10 }}>
                      {formatCurrency(p.balance)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Total Outflow (Red) */}
      <div className="kpi-flow-card kpi-card-outflow">
        <div className="kpi-flow-header">
          <span className="kpi-flow-dot dot-outflow"></span>
          <span className="kpi-flow-label" data-i18n="total_expense">Total Pengeluaran</span>
        </div>
        <div className="kpi-flow-value text-outflow">
          -{formatCurrency(totalExpense)}
        </div>
      </div>
    </div>
  );
}
