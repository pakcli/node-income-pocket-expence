import React, { useState, useRef, useEffect } from 'react';
import { useAccounts } from '../../hooks/useAccounts.js';
import { useI18n } from '../../hooks/useI18n.js';

export function MasterHeader({
  currentView,
  onViewChange,
  canvasMode,
  onCanvasModeChange,
  scopeFilter,
  onScopeFilterChange,
  onOpenModal,
  theme = 'dark',
  onToggleTheme,
  showToast
}) {
  const { activeAccount, accounts, switchAccount } = useAccounts();
  const { locale, toggleLocale, t } = useI18n();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const exportRef = useRef(null);
  const accountRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleExport = (type) => {
    setIsExportOpen(false);
    if (type === 'csv') {
      window.location.href = '/api/export/csv';
      showToast('Mengunduh export CSV...');
    } else if (type === 'db') {
      window.location.href = '/api/export/db';
      showToast('Mengunduh database SQLite...');
    }
  };

  return (
    <header className="master-header">
      {/* 1. Brand Logo */}
      <div className="header-brand">
        <div className="brand-logo-icon">SP</div>
        <div className="brand-titles">
          <h1 className="brand-app-title">Student Pocket</h1>
          <span className="brand-tagline">Visual Flow & Precision Ledger</span>
        </div>
      </div>

      {/* 2. Quick Add Data Action Buttons (Thicker, 1 Symbol + 1 Word) */}
      <div className="header-data-controls">
        <button
          type="button"
          className="btn-quick-data btn-add-income"
          title="Catat Pemasukan Baru"
          onClick={() => onOpenModal('income')}
        >
          <span className="btn-icon">+</span>
          <span>Pemasukan</span>
        </button>
        <button
          type="button"
          className="btn-quick-data btn-add-expense"
          title="Catat Pengeluaran Baru"
          onClick={() => onOpenModal('expense')}
        >
          <span className="btn-icon">−</span>
          <span>Pengeluaran</span>
        </button>
        <button
          type="button"
          className="btn-quick-data btn-add-transfer"
          title="Transfer Antar Kantong"
          onClick={() => onOpenModal('transfer')}
        >
          <span className="btn-icon">⇄</span>
          <span>Transfer</span>
        </button>
        <button
          type="button"
          className="btn-quick-data btn-add-pocket"
          title="Tambah Kantong / Rekening Baru"
          onClick={() => onOpenModal('pocket')}
        >
          <span className="btn-icon">💳</span>
          <span>Kantong</span>
        </button>
      </div>

      {/* 3. Perspective Radio Tabs (Flow | Split | Table) */}
      <div className="view-mode-tabs header-perspective-tabs">
        <button
          type="button"
          className={`tab-btn ${currentView === 'flow' ? 'active' : ''}`}
          onClick={() => onViewChange('flow')}
          title="Flow Canvas (100% Canvas Visual Network)"
        >
          <span className="tab-icon">🌊</span>
          <span>Flow</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${currentView === 'split' ? 'active' : ''}`}
          onClick={() => onViewChange('split')}
          title="Split View (Visual Flow & Precision Table)"
        >
          <span className="tab-icon">⚖️</span>
          <span>Split</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${currentView === 'table' ? 'active' : ''}`}
          onClick={() => onViewChange('table')}
          title="Table Ledger (100% Precision Table View)"
        >
          <span className="tab-icon">📑</span>
          <span>Table</span>
        </button>
      </div>

      {/* 4. Canvas Mode & Scope Filters */}
      <div className="header-scope-controls">
        <select
          className="header-select"
          value={canvasMode}
          onChange={(e) => onCanvasModeChange(e.target.value)}
          title="Mode Diagram Canvas"
        >
          <option value="both">Mode Both (Total + IRL)</option>
          <option value="irl">Mode IRL Saja</option>
          <option value="simple">Mode Simple</option>
        </select>

        <select
          className="header-select"
          value={scopeFilter}
          onChange={(e) => onScopeFilterChange(e.target.value)}
          title="Filter Cakupan Transaksi"
        >
          <option value="all">Semua Transaksi</option>
          <option value="filtered">Kantong Terpilih Saja</option>
        </select>
      </div>

      {/* 5. Right Utilities: Language, Export, Account Switcher */}
      <div className="header-actions">
        {/* Language Toggle */}
        <button
          type="button"
          className="btn-header-util"
          onClick={toggleLocale}
          title="Beralih Bahasa (ID / EN)"
        >
          🌐 <span style={{ textTransform: 'uppercase' }}>{locale}</span>
        </button>

        {/* Dual Export Menu */}
        <div className="export-menu-wrapper" ref={exportRef}>
          <button
            type="button"
            className="btn-header-util"
            onClick={() => setIsExportOpen(!isExportOpen)}
            title="Export Data Keuangan"
          >
            📥 <span>Export</span> ▼
          </button>
          {isExportOpen && (
            <div className="export-dropdown-menu show">
              <button type="button" className="export-dropdown-item" onClick={() => handleExport('csv')}>
                📊 Export CSV (Excel / Spreadsheet)
              </button>
              <button type="button" className="export-dropdown-item" onClick={() => handleExport('db')}>
                🗄️ Export Database (.db SQLite)
              </button>
            </div>
          )}
        </div>

        {/* Blender Theme Toggle (Dark / Light) */}
        <button
          type="button"
          className="btn-header-util btn-theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Ganti ke Blender Light Mode' : 'Ganti ke Blender Dark Mode'}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>

        {/* Multi-Account Switcher */}
        <div className="user-switcher-container" ref={accountRef}>
          <div
            className="user-profile-pill"
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            title="Beralih Profil Akun"
          >
            <div className="user-avatar" style={{ background: activeAccount?.avatarBg }}>
              {activeAccount?.avatarInitials}
            </div>
            <div className="user-info-brief">
              <span className="user-name">{activeAccount?.displayName}</span>
              <span className="user-role-badge">{activeAccount?.role?.toUpperCase()}</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
          </div>

          {isAccountOpen && (
            <div className="user-dropdown-menu show">
              <div className="user-dropdown-header">PROFIL TERSIMPAN</div>
              <div className="saved-accounts-list">
                {accounts.map(acc => {
                  const isCurrent = acc.userId === activeAccount?.userId;
                  return (
                    <div
                      key={acc.userId}
                      className={`saved-account-item ${isCurrent ? 'active' : ''}`}
                      onClick={() => {
                        if (!isCurrent) {
                          switchAccount(acc.userId);
                          setIsAccountOpen(false);
                          showToast(`Beralih ke akun: ${acc.displayName}`);
                        }
                      }}
                    >
                      <div className="saved-account-left">
                        <div className="user-avatar" style={{ background: acc.avatarBg }}>
                          {acc.avatarInitials}
                        </div>
                        <div className="user-info-text">
                          <div className="user-name">{acc.displayName}</div>
                          <div className="user-role-badge">{acc.role?.toUpperCase()} • {acc.email}</div>
                        </div>
                      </div>
                      <button className={`btn-switch-pill ${isCurrent ? 'active' : 'inactive'}`}>
                        {isCurrent ? 'ACTIVE' : 'SWITCH'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="user-dropdown-footer">
                <button
                  type="button"
                  id="btnAddAnotherAccount"
                  className="btn-add-account-sub"
                  onClick={() => {
                    setIsAccountOpen(false);
                    onOpenModal('addAccount');
                  }}
                >
                  + Tambah Akun Lain...
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
