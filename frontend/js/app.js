// Master Application Coordinator (Brief v04)
import { i18n } from './i18n.js';
import { store } from './store.js';
import { accountManager } from './accounts.js';
import { FlowCanvas } from './flow.js';

let flowCanvas = null;
let currentView = 'flow'; // 'flow' | 'table' | 'split'
let tableFilter = 'all'; // 'all' | 'income' | 'expense' | 'transfer'
let tableSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initFlowCanvas();
  initUserSwitcher();
  initKPIs();
  initModals();
  initTableLedger();
  initViewTabs();
  initModeToggle();
  initExportMenu();

  // Listen to store updates
  window.addEventListener('storeUpdated', () => {
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    renderTableLedger();
    if (flowCanvas && flowCanvas.selectedNodeId) {
      inspectNode(flowCanvas.selectedNodeId);
    }
  });

  // Listen to account changes
  window.addEventListener('accountChanged', (e) => {
    const activeAcc = e.detail;
    showToast(`Beralih ke akun: ${activeAcc.displayName} (${activeAcc.role})`);
    renderUserSwitcher();
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    renderTableLedger();
  });

  // Listen to locale changes
  window.addEventListener('localeChanged', () => {
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    renderTableLedger();
  });
});

// 1. i18n Initialization
function initI18n() {
  i18n.applyTranslations();
  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLocale = i18n.currentLocale === 'id' ? 'en' : 'id';
      i18n.setLocale(nextLocale);
    });
  }
}

// 2. Flow Canvas Initialization
function initFlowCanvas() {
  const container = document.getElementById('flowViewport');
  if (!container) return;

  flowCanvas = new FlowCanvas('flowViewport', (nodeId) => {
    inspectNode(nodeId);
  });
  flowCanvas.render();
}

// 3. User Switcher (Brief v04 Sec 2.2)
function initUserSwitcher() {
  const trigger = document.getElementById('userSwitcherTrigger');
  const menu = document.getElementById('userDropdownMenu');

  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });

    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  const btnAddAcc = document.getElementById('btnAddAnotherAccount');
  if (btnAddAcc) {
    btnAddAcc.addEventListener('click', () => {
      if (menu) menu.classList.remove('show');
      openModal('modalAddAccount');
    });
  }

  renderUserSwitcher();
}

function renderUserSwitcher() {
  const active = accountManager.getActiveAccount();
  const nameEl = document.getElementById('activeUserName');
  const roleEl = document.getElementById('activeUserRole');
  const avatarEl = document.getElementById('activeUserAvatar');

  if (nameEl) nameEl.textContent = active.displayName;
  if (roleEl) roleEl.textContent = active.role.toUpperCase();
  if (avatarEl) {
    avatarEl.textContent = active.avatarInitials;
    avatarEl.style.background = active.avatarBg;
  }

  const listEl = document.getElementById('savedAccountsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  accountManager.accounts.forEach(acc => {
    const isCurrent = acc.userId === active.userId;
    const item = document.createElement('div');
    item.className = `saved-account-item ${isCurrent ? 'active' : ''}`;
    item.innerHTML = `
      <div class="saved-account-left">
        <div class="user-avatar" style="background: ${acc.avatarBg}">${acc.avatarInitials}</div>
        <div class="user-info-text">
          <div class="user-name">${acc.displayName}</div>
          <div class="user-role-badge">${acc.role.toUpperCase()} &bull; ${acc.email}</div>
        </div>
      </div>
      <div>
        <button class="btn-switch-pill ${isCurrent ? 'active' : 'inactive'}">
          ${isCurrent ? 'ACTIVE' : 'SWITCH'}
        </button>
      </div>
    `;

    item.addEventListener('click', () => {
      if (!isCurrent) {
        accountManager.switchAccount(acc.userId);
        const menu = document.getElementById('userDropdownMenu');
        if (menu) menu.classList.remove('show');
      }
    });

    listEl.appendChild(item);
  });
}

// 4. KPIs
function initKPIs() {
  updateKPIs();
}

function updateKPIs() {
  const totalBalance = store.getTotalBalance();
  const totalIncome = store.getTotalIncome();
  const totalExpense = store.getTotalExpense();
  const pocketCount = store.state.pockets.length;

  const balEl = document.getElementById('kpiTotalBalance');
  const incEl = document.getElementById('kpiTotalIncome');
  const expEl = document.getElementById('kpiTotalExpense');
  const pktEl = document.getElementById('kpiPocketCount');

  if (balEl) balEl.textContent = i18n.formatCurrency(totalBalance);
  if (incEl) incEl.textContent = `+${i18n.formatCurrency(totalIncome)}`;
  if (expEl) expEl.textContent = `-${i18n.formatCurrency(totalExpense)}`;
  if (pktEl) pktEl.textContent = `${pocketCount} Pockets`;
}

// 5. Node Inspector
function inspectNode(nodeId) {
  const body = document.getElementById('inspectorBody');
  if (!body) return;

  // Search node among pockets, incomes, expenses
  let node = store.state.pockets.find(p => p.id === nodeId);
  let type = 'account';
  if (!node) {
    node = store.state.incomeSources.find(i => i.id === nodeId);
    type = 'income';
  }
  if (!node) {
    node = store.state.expenseCategories.find(e => e.id === nodeId);
    type = 'expense';
  }

  if (!node) {
    body.innerHTML = `
      <div class="inspector-empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <p>${i18n.t('inspector_empty')}</p>
      </div>
    `;
    return;
  }

  const txs = store.getNodeLedger(nodeId);

  body.innerHTML = `
    <div class="inspector-node-card">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="badge-tag tag-${type}">${type.toUpperCase()}</span>
        <span style="font-size: 11px; color: var(--text-muted);">${node.category ? node.category.toUpperCase() : ''}</span>
      </div>
      <h3 style="margin-top: 8px; font-size: 17px; font-weight: 700;">${node.label}</h3>
      <div class="inspector-stat-grid">
        ${type === 'account' ? `
          <div class="inspector-stat-box">
            <div class="inspector-stat-lbl">${i18n.t('inspector_balance')}</div>
            <div class="inspector-stat-val" style="color: #60a5fa;">${i18n.formatCurrency(node.balance)}</div>
          </div>
          <div class="inspector-stat-box">
            <div class="inspector-stat-lbl">Inflow / Outflow</div>
            <div class="inspector-stat-val" style="font-size: 12px;">+${i18n.formatCurrency(node.inflow)} / -${i18n.formatCurrency(node.outflow)}</div>
          </div>
        ` : `
          <div class="inspector-stat-box" style="grid-column: span 2;">
            <div class="inspector-stat-lbl">${type === 'income' ? i18n.t('inspector_inflow') : i18n.t('inspector_outflow')}</div>
            <div class="inspector-stat-val" style="color: ${type === 'income' ? 'var(--accent-income)' : 'var(--accent-expense)'};">
              ${i18n.formatCurrency(node.total)}
            </div>
          </div>
        `}
      </div>
    </div>

    <div>
      <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--text-secondary);">
        ${i18n.t('inspector_history')} (${txs.length})
      </h4>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
        ${txs.length === 0 ? `<p style="font-size: 12px; color: var(--text-muted);">${i18n.t('no_transactions')}</p>` : ''}
        ${txs.map(t => `
          <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700;">
              <span>${i18n.formatDate(t.date)}</span>
              <span class="${t.type === 'income' ? 'delta-income' : (t.type === 'expense' ? 'delta-expense' : 'delta-transfer')}">
                ${t.type === 'income' ? '+' : '-'}${i18n.formatCurrency(t.amount)}
              </span>
            </div>
            <div style="color: var(--text-muted); margin-top: 4px;">
              ${t.fromLabel} &rarr; ${t.toLabel}
            </div>
            ${t.note ? `<div style="color: var(--text-secondary); margin-top: 2px; font-style: italic;">"${t.note}"</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 6. Precision Table Ledger (Brief v04 Sec 4.2)
function initTableLedger() {
  const searchInput = document.getElementById('ledgerSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      tableSearchQuery = e.target.value.toLowerCase();
      renderTableLedger();
    });
  }

  const filterBtns = document.querySelectorAll('[data-table-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tableFilter = btn.getAttribute('data-table-filter');
      renderTableLedger();
    });
  });

  renderTableLedger();
}

function renderTableLedger() {
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = [...store.state.transactions];

  // Apply Type Filter
  if (tableFilter !== 'all') {
    list = list.filter(t => t.type === tableFilter);
  }

  // Apply Search
  if (tableSearchQuery.trim()) {
    list = list.filter(t => 
      (t.note && t.note.toLowerCase().includes(tableSearchQuery)) ||
      t.fromLabel.toLowerCase().includes(tableSearchQuery) ||
      t.toLabel.toLowerCase().includes(tableSearchQuery)
    );
  }

  // Sort chronological descending
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
          ${i18n.t('no_transactions')}
        </td>
      </tr>
    `;
    return;
  }

  // Calculate Running Balance per Pocket or Global
  let runningBalance = store.getTotalBalance();

  list.forEach(tx => {
    const isInc = tx.type === 'income';
    const isExp = tx.type === 'expense';
    const changeClass = isInc ? 'delta-income' : (isExp ? 'delta-expense' : 'delta-transfer');
    const changeSign = isInc ? '+' : (isExp ? '-' : '⇄ ');
    const assignedPocket = tx.type === 'expense' ? tx.fromLabel : tx.toLabel;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; white-space: nowrap;">${i18n.formatDate(tx.date)}</td>
      <td>
        <span class="badge-tag tag-${tx.type}">${tx.type.toUpperCase()}</span>
      </td>
      <td class="${changeClass}">${changeSign}${i18n.formatCurrency(tx.amount)}</td>
      <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #93c5fd;">
        ${i18n.formatCurrency(runningBalance)}
      </td>
      <td><span style="color: #cbd5e1; font-weight: 500;">${tx.fromLabel}</span></td>
      <td><span style="color: #cbd5e1; font-weight: 500;">${tx.toLabel}</span></td>
      <td><span class="badge-tag tag-pocket">${assignedPocket}</span></td>
      <td style="color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${tx.note || '-'}
      </td>
      <td style="white-space: nowrap; text-align: right;">
        <button class="btn-action-icon btn-del-tx" data-id="${tx.id}" title="Hapus Transaksi" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;

    // Hook delete
    tr.querySelector('.btn-del-tx').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('confirm_delete'))) {
        store.deleteTransaction(tx.id);
        showToast(i18n.t('toast_deleted'));
      }
    });

    tbody.appendChild(tr);
  });
}

// 7. View Tabs & Mode Switchers
function initViewTabs() {
  const tabs = document.querySelectorAll('[data-view-tab]');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const inspectorSidebar = document.getElementById('inspectorSidebar');
  const tableViewContainer = document.getElementById('tableViewContainer');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.getAttribute('data-view-tab');

      if (currentView === 'flow') {
        canvasWrapper.style.display = 'flex';
        inspectorSidebar.style.display = 'flex';
        tableViewContainer.classList.remove('active');
        if (flowCanvas) flowCanvas.render();
      } else if (currentView === 'table') {
        canvasWrapper.style.display = 'none';
        inspectorSidebar.style.display = 'none';
        tableViewContainer.classList.add('active');
        renderTableLedger();
      } else if (currentView === 'split') {
        canvasWrapper.style.display = 'flex';
        inspectorSidebar.style.display = 'none';
        tableViewContainer.classList.add('active');
        if (flowCanvas) flowCanvas.render();
        renderTableLedger();
      }
    });
  });
}

function initModeToggle() {
  const btnSimple = document.getElementById('btnModeSimple');
  const btnIRL = document.getElementById('btnModeIRL');

  if (btnSimple && btnIRL) {
    btnSimple.addEventListener('click', () => {
      btnSimple.classList.add('active');
      btnIRL.classList.remove('active');
      if (flowCanvas) flowCanvas.setMode('simple');
    });

    btnIRL.addEventListener('click', () => {
      btnIRL.classList.add('active');
      btnSimple.classList.remove('active');
      if (flowCanvas) flowCanvas.setMode('irl');
    });
  }
}

// 8. Modals Handling
function initModals() {
  // Trigger Buttons
  document.getElementById('btnOpenAddIncome')?.addEventListener('click', () => {
    populateAccountSelect('incomeDestAccount');
    openModal('modalAddIncome');
  });

  document.getElementById('btnOpenAddExpense')?.addEventListener('click', () => {
    populateAccountSelect('expenseSourceAccount');
    populateExpenseCategorySelect('expenseCategorySelect');
    openModal('modalAddExpense');
  });

  document.getElementById('btnOpenTransfer')?.addEventListener('click', () => {
    populateAccountSelect('transferFromAccount');
    populateAccountSelect('transferToAccount');
    openModal('modalTransfer');
  });

  document.getElementById('btnOpenAddPocket')?.addEventListener('click', () => {
    openModal('modalAddPocket');
  });

  // Modal Closes
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('show');
    });
  });

  // Form Submissions
  document.getElementById('formAddIncome')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const sourceName = document.getElementById('incomeSourceName').value;
    const destPktId = document.getElementById('incomeDestAccount').value;
    const amount = document.getElementById('incomeAmount').value;
    const date = document.getElementById('incomeDate').value;
    const note = document.getElementById('incomeNote').value;

    const source = store.getOrCreateIncomeSource(sourceName);
    const pkt = store.state.pockets.find(p => p.id === destPktId);

    store.addTransaction({
      type: 'income',
      fromId: source.id,
      fromLabel: source.label,
      toId: pkt ? pkt.id : destPktId,
      toLabel: pkt ? pkt.label : 'Pocket',
      amount,
      date,
      note
    });

    closeAllModals();
    showToast(i18n.t('toast_added'));
    e.target.reset();
  });

  document.getElementById('formAddExpense')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const categoryName = document.getElementById('expenseCategoryName').value;
    const srcPktId = document.getElementById('expenseSourceAccount').value;
    const amount = document.getElementById('expenseAmount').value;
    const date = document.getElementById('expenseDate').value;
    const note = document.getElementById('expenseNote').value;

    const expNode = store.getOrCreateExpenseCategory(categoryName);
    const pkt = store.state.pockets.find(p => p.id === srcPktId);

    store.addTransaction({
      type: 'expense',
      fromId: pkt ? pkt.id : srcPktId,
      fromLabel: pkt ? pkt.label : 'Pocket',
      toId: expNode.id,
      toLabel: expNode.label,
      amount,
      date,
      note
    });

    closeAllModals();
    showToast(i18n.t('toast_added'));
    e.target.reset();
  });

  document.getElementById('formTransfer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transferFromAccount').value;
    const toId = document.getElementById('transferToAccount').value;
    const amount = document.getElementById('transferAmount').value;
    const date = document.getElementById('transferDate').value;
    const note = document.getElementById('transferNote').value;

    if (fromId === toId) {
      alert('Sumber dan tujuan transfer tidak boleh sama!');
      return;
    }

    const fromPkt = store.state.pockets.find(p => p.id === fromId);
    const toPkt = store.state.pockets.find(p => p.id === toId);

    store.addTransaction({
      type: 'transfer',
      fromId,
      fromLabel: fromPkt ? fromPkt.label : fromId,
      toId,
      toLabel: toPkt ? toPkt.label : toId,
      amount,
      date,
      note
    });

    closeAllModals();
    showToast('Transfer saldo berhasil!');
    e.target.reset();
  });

  document.getElementById('formAddPocket')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('pocketName').value;
    const category = document.getElementById('pocketCategory').value;
    const initialBalance = document.getElementById('pocketInitialBalance').value;

    store.addPocket({
      label,
      category,
      initialBalance
    });

    closeAllModals();
    showToast(i18n.t('toast_pocket_added'));
    e.target.reset();
  });

  document.getElementById('formAddAccount')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const displayName = document.getElementById('newAccountName').value;
    const email = document.getElementById('newAccountEmail').value;
    const role = document.getElementById('newAccountRole').value;

    accountManager.addAccount({ displayName, email, role });
    closeAllModals();
    showToast(`Akun keluarga baru (${displayName}) berhasil ditambahkan!`);
    e.target.reset();
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // default date today
    const dateInputs = modal.querySelectorAll('input[type="date"]');
    dateInputs.forEach(d => {
      if (!d.value) d.value = new Date().toISOString().split('T')[0];
    });
    modal.classList.add('show');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}

function populateAccountSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  store.state.pockets.forEach(pkt => {
    const opt = document.createElement('option');
    opt.value = pkt.id;
    opt.textContent = `${pkt.label} (${i18n.formatCurrency(pkt.balance)})`;
    sel.appendChild(opt);
  });
}

function populateExpenseCategorySelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  store.state.expenseCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.label;
    opt.textContent = cat.label;
    sel.appendChild(opt);
  });
}

// 9. Dual Export Engine (Brief v04 Sec 7)
function initExportMenu() {
  const trigger = document.getElementById('exportMenuTrigger');
  const dropdown = document.getElementById('exportDropdown');

  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });
  }

  document.getElementById('btnExportCSV')?.addEventListener('click', () => {
    exportCSV();
    if (dropdown) dropdown.classList.remove('show');
  });

  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    exportJSONBackup();
    if (dropdown) dropdown.classList.remove('show');
  });

  document.getElementById('btnExportDB')?.addEventListener('click', () => {
    exportSQLiteBackup();
    if (dropdown) dropdown.classList.remove('show');
  });
}

function exportCSV() {
  const txs = store.state.transactions;
  const headers = ['Date', 'Type', 'Amount', 'Currency', 'From', 'To', 'Assigned Pocket', 'Note'];
  const rows = txs.map(t => [
    t.date,
    t.type,
    t.amount,
    'IDR',
    `"${t.fromLabel}"`,
    `"${t.toLabel}"`,
    `"${t.type === 'expense' ? t.fromLabel : t.toLabel}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student-pocket-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Spreadsheet CSV berhasil diunduh!');
}

function exportJSONBackup() {
  const data = JSON.stringify(store.state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student-pocket-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File backup data berhasil diunduh!');
}

function exportSQLiteBackup() {
  // In frontend static mode, exports SQL DDL + Inserts ready to import into any SQLite / DB Browser
  const txs = store.state.transactions;
  const pockets = store.state.pockets;
  const incomes = store.state.incomeSources;
  const expenses = store.state.expenseCategories;

  let sql = `-- Student Pocket Manager SQLite Dump (Brief v04)\n`;
  sql += `PRAGMA journal_mode = WAL;\n\n`;
  sql += `CREATE TABLE IF NOT EXISTS pockets (id TEXT PRIMARY KEY, label TEXT, category TEXT, balance REAL);\n`;
  sql += `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT, from_id TEXT, to_id TEXT, amount REAL, date TEXT, note TEXT);\n\n`;

  pockets.forEach(p => {
    sql += `INSERT INTO pockets VALUES ('${p.id}', '${p.label}', '${p.category}', ${p.balance});\n`;
  });
  txs.forEach(t => {
    sql += `INSERT INTO transactions VALUES ('${t.id}', '${t.type}', '${t.fromId}', '${t.toId}', ${t.amount}, '${t.date}', '${(t.note || '').replace(/'/g, "''")}');\n`;
  });

  const blob = new Blob([sql], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student-pocket-data-${new Date().toISOString().split('T')[0]}.sql`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Database dump (.sql / .db) berhasil diunduh!');
}

// Toast Utility
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
