// Master Application Coordinator (Brief v04)
import { i18n } from './i18n.js?v=04.2';
import { store } from './store.js?v=04.2';
import { accountManager } from './accounts.js?v=04.2';
import { FlowCanvas } from './flow.js?v=04.2';
import { TimelineController } from './timeline.js?v=04.2';

let flowCanvas = null;
let timelineController = null;
let currentView = 'flow'; // 'flow' | 'table' | 'split'
let isInspectorOpen = true;
let tableFilter = 'all'; // 'all' | 'income' | 'expense' | 'transfer'
let tableSearchQuery = '';
let tableSortOrder = 'latest'; // 'latest' (default) | 'oldest'
let isTableDetailedMode = false; // false = simple mode, true = detailed mode
let activePocketFilterIds = new Set();
let scopeFilter = 'all'; // 'all' | 'filtered'

const SETTINGS_KEY = 'student_pocket_settings_v05';

function loadAppSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse app settings from localStorage:', e);
    return null;
  }
}

function saveAppSettings() {
  try {
    const canvasMode = document.getElementById('canvasModeSelect')?.value || 'both';
    const nodeClickAction = document.getElementById('nodeClickActionSelect')?.value || 'both';
    const settings = {
      currentView,
      isInspectorOpen,
      canvasMode,
      scopeFilter,
      tableSortOrder,
      isTableDetailedMode,
      activePocketFilterIds: Array.from(activePocketFilterIds),
      tableFilter,
      nodeClickAction,
      panelWidths: getPanelWidths()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save app settings to localStorage:', e);
  }
}

function getPanelWidths() {
  const canvasWrapper = document.getElementById('canvasWrapper');
  const inspectorSidebar = document.getElementById('inspectorSidebar');
  const tableViewContainer = document.getElementById('tableViewContainer');
  return {
    canvas: canvasWrapper?.style.width || null,
    inspector: inspectorSidebar?.style.width || null,
    table: tableViewContainer?.style.width || null
  };
}

function applySavedPanelWidths(widths) {
  if (!widths) return;
  const canvasWrapper = document.getElementById('canvasWrapper');
  const inspectorSidebar = document.getElementById('inspectorSidebar');
  const tableViewContainer = document.getElementById('tableViewContainer');

  if (widths.canvas && canvasWrapper) {
    canvasWrapper.style.flex = 'none';
    canvasWrapper.style.maxWidth = 'none';
    canvasWrapper.style.width = widths.canvas;
  }
  if (widths.inspector && inspectorSidebar) {
    inspectorSidebar.style.flex = 'none';
    inspectorSidebar.style.maxWidth = 'none';
    inspectorSidebar.style.width = widths.inspector;
  }
  if (widths.table && tableViewContainer) {
    tableViewContainer.style.flex = 'none';
    tableViewContainer.style.maxWidth = 'none';
    tableViewContainer.style.width = widths.table;
  }
}

// Expose for debugging and automated testing
if (typeof window !== 'undefined') {
  window.__appSettings = {
    load: loadAppSettings,
    save: saveAppSettings,
    get: () => ({
      currentView,
      isInspectorOpen,
      canvasMode: document.getElementById('canvasModeSelect')?.value || 'both',
      scopeFilter,
      tableSortOrder,
      isTableDetailedMode,
      activePocketFilterIds: Array.from(activePocketFilterIds),
      tableFilter,
      nodeClickAction: document.getElementById('nodeClickActionSelect')?.value || 'both',
      panelWidths: getPanelWidths()
    })
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // 0. Hydrate settings from localStorage
  const savedSettings = loadAppSettings();
  if (savedSettings) {
    if (savedSettings.currentView && ['flow', 'table', 'split'].includes(savedSettings.currentView)) {
      currentView = savedSettings.currentView;
    }
    if (typeof savedSettings.isInspectorOpen === 'boolean') {
      isInspectorOpen = savedSettings.isInspectorOpen;
    }
    if (savedSettings.tableFilter && ['all', 'income', 'expense', 'transfer'].includes(savedSettings.tableFilter)) {
      tableFilter = savedSettings.tableFilter;
    }
    if (savedSettings.tableSortOrder && ['latest', 'oldest'].includes(savedSettings.tableSortOrder)) {
      tableSortOrder = savedSettings.tableSortOrder;
    }
    if (typeof savedSettings.isTableDetailedMode === 'boolean') {
      isTableDetailedMode = savedSettings.isTableDetailedMode;
    }
    if (savedSettings.scopeFilter && ['all', 'filtered'].includes(savedSettings.scopeFilter)) {
      scopeFilter = savedSettings.scopeFilter;
    }
    if (Array.isArray(savedSettings.activePocketFilterIds) && savedSettings.activePocketFilterIds.length > 0) {
      const existingIds = new Set((store.state.pockets || []).map(p => p.id));
      const valid = savedSettings.activePocketFilterIds.filter(id => existingIds.has(id));
      if (valid.length > 0) {
        activePocketFilterIds = new Set(valid);
      }
    }
  }

  // Ensure activePocketFilterIds is populated if empty
  if (activePocketFilterIds.size === 0) {
    (store.state.pockets || []).forEach(p => activePocketFilterIds.add(p.id));
  }

  initI18n();
  initFlowCanvas();
  initUserSwitcher();
  initKPIs();
  initPocketFilterChecklist();
  initModals();
  initInspector();
  initTableLedger();
  initTableDetailToggle();
  initScopeSelect();
  initPanelSplitters();
  initViewTabs();
  initModeToggle();
  initExportMenu();

  // Restore custom panel widths from localStorage if present
  if (savedSettings?.panelWidths) {
    applySavedPanelWidths(savedSettings.panelWidths);
    if (flowCanvas) flowCanvas.render();
  }

  // Listen to store updates
  window.addEventListener('storeUpdated', () => {
    const existingPktIds = new Set((store.state.pockets || []).map(p => p.id));
    for (const id of activePocketFilterIds) {
      if (!existingPktIds.has(id)) activePocketFilterIds.delete(id);
    }
    if (activePocketFilterIds.size === 0) {
      (store.state.pockets || []).forEach(p => activePocketFilterIds.add(p.id));
    }
    if (flowCanvas) flowCanvas.setActivePockets(activePocketFilterIds);
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    if (timelineController) timelineController.refresh();
    updateQuickAddDropdowns();
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
    activePocketFilterIds.clear();
    (store.state.pockets || []).forEach(p => activePocketFilterIds.add(p.id));
    if (flowCanvas) flowCanvas.setActivePockets(activePocketFilterIds);
    renderPocketFilterChecklist();
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    if (timelineController) timelineController.refresh();
    updateQuickAddDropdowns();
    renderTableLedger();
    saveAppSettings();
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

// 2. Flow Canvas & Timeline Initialization
function initFlowCanvas() {
  const container = document.getElementById('flowViewport');
  if (!container) return;

  flowCanvas = new FlowCanvas('flowViewport', (nodeId) => {
    inspectNode(nodeId);
  });
  if (activePocketFilterIds.size > 0) {
    flowCanvas.setActivePockets(activePocketFilterIds);
  }
  flowCanvas.render();

  // Instantiate Blender Timeline Controller
  timelineController = new TimelineController(flowCanvas);
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

// 4. KPIs & Pocket Checklist Filter
function initKPIs() {
  updateKPIs();
}

function initPocketFilterChecklist() {
  const btnToggle = document.getElementById('btnPocketFilterToggle');
  const popover = document.getElementById('kpiPocketFilterPopover');
  const btnToggleAll = document.getElementById('btnToggleAllPockets');

  if (btnToggle && popover) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.style.display = popover.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btnToggle) {
        popover.style.display = 'none';
      }
    });
  }

  if (btnToggleAll) {
    btnToggleAll.addEventListener('click', () => {
      const pockets = store.state.pockets || [];
      const allSelected = activePocketFilterIds.size === pockets.length;
      if (allSelected) {
        activePocketFilterIds.clear();
        if (pockets[0]) activePocketFilterIds.add(pockets[0].id);
      } else {
        pockets.forEach(p => activePocketFilterIds.add(p.id));
      }
      if (flowCanvas) flowCanvas.setActivePockets(activePocketFilterIds);
      updateKPIs();
      renderPocketFilterChecklist();
      renderTableLedger();
      if (flowCanvas) flowCanvas.render();
      saveAppSettings();
    });
  }

  if (flowCanvas) flowCanvas.setActivePockets(activePocketFilterIds);
  renderPocketFilterChecklist();
}

function renderPocketFilterChecklist() {
  const container = document.getElementById('kpiPocketChecklist');
  const countLabel = document.getElementById('kpiIncludedPocketsCount');
  if (!container) return;

  const pockets = store.state.pockets || [];
  if (activePocketFilterIds.size === 0) {
    pockets.forEach(p => activePocketFilterIds.add(p.id));
  }

  container.innerHTML = '';
  pockets.forEach(p => {
    const isChecked = activePocketFilterIds.has(p.id);
    const item = document.createElement('label');
    item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11px;';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; accent-color: #38bdf8;">
        <span style="color: #f1f5f9; font-weight: 500;">${p.label}</span>
      </div>
      <span style="font-family: monospace; color: #93c5fd; font-weight: 700; font-size: 10px;">${i18n.formatCurrency(p.balance)}</span>
    `;

    item.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) {
        activePocketFilterIds.add(p.id);
      } else {
        if (activePocketFilterIds.size <= 1) {
          e.target.checked = true;
          showToast('Minimal 1 kantong harus tetap dipilih!');
          return;
        }
        activePocketFilterIds.delete(p.id);
      }
      if (flowCanvas) flowCanvas.setActivePockets(activePocketFilterIds);
      updateKPIs();
      renderPocketFilterChecklist();
      renderTableLedger();
      if (flowCanvas) flowCanvas.render();
      saveAppSettings();
    });

    container.appendChild(item);
  });

  if (countLabel) {
    const isAll = activePocketFilterIds.size === pockets.length;
    countLabel.textContent = isAll ? `Semua (${pockets.length})` : `${activePocketFilterIds.size} / ${pockets.length}`;
  }
}

function updateKPIs() {
  const pockets = store.state.pockets || [];
  let filteredBalance = 0;
  pockets.forEach(p => {
    if (activePocketFilterIds.size === 0 || activePocketFilterIds.has(p.id)) {
      filteredBalance += (p.balance || 0);
    }
  });

  const totalIncome = store.getTotalIncome();
  const totalExpense = store.getTotalExpense();

  const balEl = document.getElementById('kpiTotalBalance');
  const incEl = document.getElementById('kpiTotalIncome');
  const expEl = document.getElementById('kpiTotalExpense');

  if (balEl) balEl.textContent = i18n.formatCurrency(filteredBalance);
  if (incEl) incEl.textContent = `+${i18n.formatCurrency(totalIncome)}`;
  if (expEl) expEl.textContent = `-${i18n.formatCurrency(totalExpense)}`;
}

// 5. Node Inspector & Strict Panel Editing
function initInspector() {
  const btnAdd = document.getElementById('btnPanelAddNode');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      renderPanelCreateNodeForm();
    });
  }

  const btnClose = document.getElementById('btnCloseInspector');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      isInspectorOpen = false;
      updateViewLayout();
      saveAppSettings();
    });
  }

  const btnToggleCanvas = document.getElementById('btnToggleInspectorFromCanvas');
  if (btnToggleCanvas) {
    btnToggleCanvas.addEventListener('click', () => {
      isInspectorOpen = !isInspectorOpen;
      updateViewLayout();
      saveAppSettings();
    });
  }
}

function renderPanelCreateNodeForm() {
  const body = document.getElementById('inspectorBody');
  if (!body) return;

  body.innerHTML = `
    <div class="inspector-node-card" style="border-left: 3px solid #3b82f6;">
      <h3 style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <span>📦</span>
        <span>Tambah Node Baru</span>
      </h3>

      <form id="formPanelCreateNode" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Tipe Node</label>
          <select id="panelNodeType" class="form-select">
            <option value="account">Kantong & Rekening (Pocket)</option>
            <option value="income">Sumber Pemasukan (Income)</option>
            <option value="expense">Pos Pengeluaran (Expense)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Node</label>
          <input type="text" id="panelNodeLabel" class="form-input" placeholder="Cth: Dompet Kost, Tabungan, Gaji" required>
        </div>

        <div id="panelPocketCategoryGroup" class="form-group">
          <label class="form-label">Kategori Dompet</label>
          <select id="panelNodeCategory" class="form-select">
            <option value="cash">Uang Tunai / Dompet Fisik</option>
            <option value="bank">Rekening Bank (BCA, Mandiri, dll)</option>
            <option value="e_wallet">E-Wallet (GoPay, OVO, ShopeePay)</option>
            <option value="savings">Tabungan / Dana Darurat</option>
          </select>
        </div>

        <div id="panelPocketBalanceGroup" class="form-group">
          <label class="form-label">Saldo Awal (Rp)</label>
          <input type="number" id="panelNodeBalance" class="form-input" placeholder="0" min="0" value="0">
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button type="button" id="btnCancelPanelCreate" class="btn-action" style="flex: 1; background: #334155; color: white;">
            Batal
          </button>
          <button type="submit" class="btn-action btn-income" style="flex: 2;">
            + Buat Node
          </button>
        </div>
      </form>
    </div>
  `;

  // Toggle pocket fields based on type
  const typeSelect = document.getElementById('panelNodeType');
  const catGroup = document.getElementById('panelPocketCategoryGroup');
  const balGroup = document.getElementById('panelPocketBalanceGroup');

  typeSelect.addEventListener('change', () => {
    const isPkt = typeSelect.value === 'account';
    catGroup.style.display = isPkt ? 'flex' : 'none';
    balGroup.style.display = isPkt ? 'flex' : 'none';
  });

  document.getElementById('btnCancelPanelCreate').addEventListener('click', () => {
    if (flowCanvas && flowCanvas.selectedNodeId) {
      inspectNode(flowCanvas.selectedNodeId);
    } else {
      body.innerHTML = `
        <div class="inspector-empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p>${i18n.t('inspector_empty')}</p>
        </div>
      `;
    }
  });

  document.getElementById('formPanelCreateNode').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    const label = document.getElementById('panelNodeLabel').value.trim();
    const category = document.getElementById('panelNodeCategory').value;
    const initialBalance = document.getElementById('panelNodeBalance').value;

    const newId = await store.addNode({
      type,
      label,
      category: type === 'account' ? category : null,
      initialBalance: type === 'account' ? initialBalance : 0
    });

    showToast(`Node "${label}" berhasil ditambahkan!`);
    if (flowCanvas) {
      flowCanvas.render();
      flowCanvas.selectNode(newId);
    }
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function openAttachmentPreview(att) {
  const modal = document.getElementById('modalPreviewAttachment');
  if (!modal) return;

  const iconEl = document.getElementById('previewAttachmentIcon');
  const titleEl = document.getElementById('previewAttachmentTitle');
  const subEl = document.getElementById('previewAttachmentSubtitle');
  const metaEl = document.getElementById('previewAttachmentMeta');
  const contentEl = document.getElementById('previewAttachmentContent');

  const isPdf = (att.type && att.type.includes('pdf')) || (att.name && att.name.toLowerCase().endsWith('.pdf'));
  if (iconEl) iconEl.textContent = isPdf ? '📄' : '🖼️';
  if (titleEl) titleEl.textContent = att.name;
  if (subEl) subEl.textContent = att.txNote ? `Terkait: ${att.txNote}` : 'Bukti Transaksi Digital Resmi';
  if (metaEl) metaEl.textContent = `Ukuran: ${att.size || '180 KB'} • Format: ${isPdf ? 'PDF Dokumen' : 'Gambar (PNG/JPG)'} • Tanggal: ${att.date || new Date().toISOString().split('T')[0]}`;

  if (contentEl) {
    if (att.dataUrl && !isPdf) {
      contentEl.innerHTML = `<img src="${att.dataUrl}" alt="${att.name}" style="max-width: 100%; max-height: 480px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); object-fit: contain;">`;
    } else if (isPdf) {
      contentEl.innerHTML = `
        <div class="digital-receipt-ticket">
          <div class="digital-receipt-header">
            <div class="digital-receipt-logo">📄 E-RECEIPT &bull; DOKUMEN SAH</div>
            <div class="digital-receipt-title">Bukti Transaksi Keuangan Digital (PDF)</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">No. Referensi: REF-${att.id || 'SPM-99214'}</div>
          </div>
          <table class="digital-receipt-table">
            <tr>
              <td style="color: #64748b;">Nama Berkas:</td>
              <td style="font-weight: 700; text-align: right; color: #0284c7;">${att.name}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Waktu Penerbitan:</td>
              <td style="font-weight: 600; text-align: right;">${att.date || new Date().toISOString().split('T')[0]}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Keterangan Mutasi:</td>
              <td style="font-weight: 600; text-align: right;">${att.txNote || 'Transaksi Tercatat'}</td>
            </tr>
            ${att.txAmount ? `
              <tr>
                <td style="color: #64748b;">Nominal:</td>
                <td style="font-weight: 700; font-family: monospace; text-align: right; color: #0f172a;">${i18n.formatCurrency(att.txAmount)}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b;">Ukuran Dokumen:</td>
              <td style="font-weight: 600; text-align: right;">${att.size || '185 KB'}</td>
            </tr>
          </table>
          <div class="digital-receipt-divider"></div>
          <div class="digital-receipt-total-row">
            <span style="font-size: 12px; color: #64748b;">Status Audit:</span>
            <span class="digital-receipt-stamp">✓ VERIFIED &bull; SAH</span>
          </div>
          <div style="margin-top: 16px; font-size: 10px; color: #94a3b8; text-align: center;">
            Dokumen elektronik ini tersimpan aman di Student Pocket Manager.
          </div>
        </div>
      `;
    } else {
      contentEl.innerHTML = `
        <div class="digital-receipt-ticket" style="border: 2px dashed #93c5fd; background: #f8fafc;">
          <div class="digital-receipt-header">
            <div class="digital-receipt-logo" style="color: #7c3aed;">🖼️ BUKTI STRUK / KWITANSI</div>
            <div class="digital-receipt-title">Foto / Scan Bukti Pembayaran Fisik</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">ID Berkas: ${att.id || 'IMG-8812'}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: #ede9fe; border-radius: 8px; margin-bottom: 12px;">
            <span style="font-size: 40px; margin-bottom: 6px;">🧾</span>
            <span style="font-weight: 800; font-size: 14px; color: #5b21b6;">${att.name}</span>
            <span style="font-size: 11px; color: #7c3aed;">${att.size || '210 KB'} &bull; Resolusi Tinggi</span>
          </div>
          <table class="digital-receipt-table">
            <tr>
              <td style="color: #64748b;">Catatan:</td>
              <td style="font-weight: 600; text-align: right;">${att.txNote || 'Kuitansi Transaksi'}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Status Bukti:</td>
              <td style="font-weight: 700; color: #16a34a; text-align: right;">Tersimpan &bull; Terverifikasi</td>
            </tr>
          </table>
          <div class="digital-receipt-divider"></div>
          <div style="text-align: center;">
            <span class="digital-receipt-stamp" style="border-color: #7c3aed; color: #7c3aed;">✓ STRUK TERLAMPIR</span>
          </div>
        </div>
      `;
    }
  }

  openModal('modalPreviewAttachment');
}

function renderTxItemsHtml(txs) {
  if (txs.length === 0) {
    return `<p style="font-size: 12px; color: var(--text-muted);">${i18n.t('no_transactions')}</p>`;
  }
  return txs.map(t => {
    const adminFee = Number(t.adminFee) || 0;
    const shippingFee = Number(t.shippingFee) || 0;
    const hasBreakdown = adminFee > 0 || shippingFee > 0;
    const attachments = Array.isArray(t.attachments) ? t.attachments : [];

    return `
      <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; font-weight: 700;">
          <span>${i18n.formatDate(t.date)}</span>
          <span class="${t.type === 'income' ? 'delta-income' : (t.type === 'expense' ? 'delta-expense' : 'delta-transfer')}">
            ${t.type === 'income' ? '+' : '-'}${i18n.formatCurrency(t.amount)}
          </span>
        </div>
        <div style="color: var(--text-muted); margin-top: 4px; font-size: 11px;">
          ${t.fromLabel} &rarr; ${t.toLabel}
        </div>

        ${hasBreakdown ? `
          <div style="display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap;">
            ${adminFee > 0 ? `<span class="fee-breakdown-chip" title="Biaya Admin">Admin: ${i18n.formatCurrency(adminFee)}</span>` : ''}
            ${shippingFee > 0 ? `<span class="fee-breakdown-chip" style="color: #67e8f9; background: rgba(6, 182, 212, 0.15); border-color: rgba(6, 182, 212, 0.3);" title="Ongkos Kirim">Ongkir: ${i18n.formatCurrency(shippingFee)}</span>` : ''}
          </div>
        ` : ''}

        ${attachments.length > 0 ? `
          <div style="display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap;">
            ${attachments.map(att => `
              <button type="button" class="tx-attachment-chip btn-preview-att" data-att-json='${JSON.stringify(att).replace(/'/g, "&apos;")}'>
                <span>${(att.type && att.type.includes('pdf')) || (att.name && att.name.endsWith('.pdf')) ? '📄' : '🖼️'}</span>
                <span>${att.name}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Note View & Inline Editor -->
        <div id="tx-note-wrapper-${t.id}" style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
          <span id="tx-note-text-${t.id}" style="color: var(--text-secondary); font-style: italic;">
            "${t.note || 'Tidak ada catatan'}"
          </span>
          <button class="btn-inline-edit-note" data-txid="${t.id}" style="background: transparent; border: none; color: #38bdf8; font-size: 11px; cursor: pointer; padding: 2px 6px;">
            ✏️ Edit
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function attachInlineNoteEditors(container, refreshNodeId) {
  // Hook attachment preview buttons in transaction items
  container.querySelectorAll('.btn-preview-att').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        const json = btn.getAttribute('data-att-json');
        if (json) {
          const att = JSON.parse(json);
          openAttachmentPreview(att);
        }
      } catch (err) {
        console.warn('Error parsing attachment data:', err);
      }
    });
  });

  // Hook note editors
  container.querySelectorAll('.btn-inline-edit-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const txId = btn.getAttribute('data-txid');
      const wrapper = document.getElementById(`tx-note-wrapper-${txId}`);
      const tx = store.state.transactions.find(t => t.id === txId);
      if (!wrapper || !tx) return;

      wrapper.innerHTML = `
        <div style="display: flex; gap: 4px; width: 100%; margin-top: 4px;">
          <input type="text" id="inline-note-input-${txId}" class="form-input" value="${tx.note || ''}" style="padding: 4px 8px; font-size: 11px; flex: 1;">
          <button id="btn-save-note-${txId}" class="btn-action btn-income" style="padding: 4px 8px; font-size: 11px;">OK</button>
          <button id="btn-cancel-note-${txId}" class="btn-action" style="padding: 4px 6px; font-size: 11px; background: #334155; color: white;">✕</button>
        </div>
      `;

      document.getElementById(`btn-cancel-note-${txId}`)?.addEventListener('click', () => {
        inspectNode(refreshNodeId);
      });

      document.getElementById(`btn-save-note-${txId}`)?.addEventListener('click', async () => {
        const val = document.getElementById(`inline-note-input-${txId}`).value.trim();
        await store.updateTransactionNote(txId, val);
        showToast('Catatan transaksi berhasil diperbarui!');
        inspectNode(refreshNodeId);
        renderTableLedger();
      });
    });
  });
}

function inspectTotalColumn(colType) {
  const nodeClickAction = document.getElementById('nodeClickActionSelect')?.value || 'both';

  if (nodeClickAction === 'both' || nodeClickAction === 'table') {
    const rows = document.querySelectorAll('#ledgerTableBody tr[data-tx-id]');
    let firstMatch = null;
    rows.forEach(r => {
      const type = r.getAttribute('data-type');
      let matches = false;
      if (colType === 'income') matches = (type === 'income');
      else if (colType === 'expense') matches = (type === 'expense');
      else if (colType === 'pocket') matches = (type === 'transfer' || type === 'income' || type === 'expense');
      if (matches) {
        r.classList.add('row-timeline-highlight');
        if (!firstMatch) firstMatch = r;
      } else {
        r.classList.remove('row-timeline-highlight');
      }
    });
    if (firstMatch && (currentView === 'table' || currentView === 'split')) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (nodeClickAction === 'table') return;

  if (!isInspectorOpen) {
    isInspectorOpen = true;
    updateViewLayout();
  }

  const body = document.getElementById('inspectorBody');
  if (!body) return;

  if (colType === 'income') {
    const total = store.getTotalIncome();
    const incomes = store.state.incomeSources;
    const txs = store.state.transactions.filter(t => t.type === 'income');
    body.innerHTML = `
      <div class="inspector-node-card" style="border-left: 3px solid #10b981;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge-tag tag-income">TOTAL INFLOW</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${incomes.length} SUMBER</span>
        </div>
        <h3 style="margin-top: 8px; font-size: 17px; font-weight: 800; color: #f8fafc;">Total Dana Masuk</h3>
        <div class="inspector-stat-grid">
          <div class="inspector-stat-box" style="grid-column: span 2;">
            <div class="inspector-stat-lbl">Akumulasi Dana Masuk</div>
            <div class="inspector-stat-val" style="color: var(--accent-income); font-size: 18px;">+${i18n.formatCurrency(total)}</div>
          </div>
        </div>
        <div style="margin-top: 14px;">
          <h4 style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">Rincian Sumber Pemasukan:</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${incomes.map(inc => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px;">
                <span style="font-weight: 600; color: #e2e8f0;">${inc.label}</span>
                <span style="font-weight: 700; color: #34d399; font-family: monospace;">+${i18n.formatCurrency(inc.total)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #cbd5e1;">Riwayat Mutasi Masuk (${txs.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto;">
          ${renderTxItemsHtml(txs)}
        </div>
      </div>
    `;
  } else if (colType === 'pocket') {
    const total = store.getTotalBalance();
    const pockets = store.state.pockets;
    const txs = store.state.transactions;
    body.innerHTML = `
      <div class="inspector-node-card" style="border-left: 3px solid #3b82f6;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge-tag tag-pocket">TOTAL WALLETS</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${pockets.length} KANTONG</span>
        </div>
        <h3 style="margin-top: 8px; font-size: 17px; font-weight: 800; color: #f8fafc;">Total Saldo Semua Kantong</h3>
        <div class="inspector-stat-grid">
          <div class="inspector-stat-box" style="grid-column: span 2;">
            <div class="inspector-stat-lbl">Total Likuiditas Kas</div>
            <div class="inspector-stat-val" style="color: #60a5fa; font-size: 18px;">${i18n.formatCurrency(total)}</div>
          </div>
        </div>
        <div style="margin-top: 14px;">
          <h4 style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">Rincian Saldo Tiap Kantong:</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${pockets.map(pkt => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px;">
                <span style="font-weight: 600; color: #e2e8f0;">${pkt.label}</span>
                <span style="font-weight: 700; color: #60a5fa; font-family: monospace;">${i18n.formatCurrency(pkt.balance)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #cbd5e1;">Riwayat Semua Transaksi (${txs.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto;">
          ${renderTxItemsHtml(txs)}
        </div>
      </div>
    `;
  } else if (colType === 'expense') {
    const total = store.getTotalExpense();
    const expenses = store.state.expenseCategories;
    const txs = store.state.transactions.filter(t => t.type === 'expense');
    body.innerHTML = `
      <div class="inspector-node-card" style="border-left: 3px solid #ef4444;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="badge-tag tag-expense">TOTAL EXPENSES</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${expenses.length} POS</span>
        </div>
        <h3 style="margin-top: 8px; font-size: 17px; font-weight: 800; color: #f8fafc;">Total Pengeluaran</h3>
        <div class="inspector-stat-grid">
          <div class="inspector-stat-box" style="grid-column: span 2;">
            <div class="inspector-stat-lbl">Akumulasi Belanja</div>
            <div class="inspector-stat-val" style="color: var(--accent-expense); font-size: 18px;">-${i18n.formatCurrency(total)}</div>
          </div>
        </div>
        <div style="margin-top: 14px;">
          <h4 style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">Rincian Pos Pengeluaran:</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${expenses.map(exp => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px;">
                <span style="font-weight: 600; color: #e2e8f0;">${exp.label}</span>
                <span style="font-weight: 700; color: #f87171; font-family: monospace;">-${i18n.formatCurrency(exp.total)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #cbd5e1;">Riwayat Mutasi Keluar (${txs.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto;">
          ${renderTxItemsHtml(txs)}
        </div>
      </div>
    `;
  }

  attachInlineNoteEditors(body, `total-${colType}`);
}

function renderPanelAddTxFields(activePanelTxType, node, nodeType) {
  const pockets = store.state.pockets;
  const incomeSources = store.state.incomeSources;
  const expenseCategories = store.state.expenseCategories;

  if (activePanelTxType === 'expense') {
    const isPocketNode = nodeType === 'account';
    return `
      ${isPocketNode ? `
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Sumber Dana (Dari Kantong)</label>
          <div style="font-size: 12px; font-weight: 600; color: #60a5fa; background: rgba(59, 130, 246, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
            💳 ${node.label} (Saldo: ${i18n.formatCurrency(node.balance)})
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Pos Pengeluaran Tujuan</label>
          <select id="panelTxDestSelect" class="form-select" style="font-size: 12px;">
            ${expenseCategories.map(e => `<option value="${e.id}">${e.label}</option>`).join('')}
            <option value="__new__">+ Pos Pengeluaran Baru...</option>
          </select>
          <input type="text" id="panelTxNewCategoryInput" class="form-input" placeholder="Ketik nama pos pengeluaran baru" style="display: none; margin-top: 6px; font-size: 12px;">
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Dibayar Dari (Kantong)</label>
          <select id="panelTxSourceSelect" class="form-select" style="font-size: 12px;">
            ${pockets.map(p => `<option value="${p.id}">${p.label} (${i18n.formatCurrency(p.balance)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Pos Pengeluaran</label>
          <div style="font-size: 12px; font-weight: 600; color: #f87171; background: rgba(239, 68, 68, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2);">
            🏷️ ${node.label}
          </div>
        </div>
      `}

      <div class="form-group">
        <label class="form-label" style="font-size: 11px;">Nominal Pokok (Rp)</label>
        <input type="number" id="panelTxAmount" class="form-input" placeholder="Cth: 50000" min="1" required style="font-size: 12px;">
      </div>

      <!-- Rincian Biaya Admin & Ongkir -->
      <div class="inspector-breakdown-box">
        <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Rincian Tambahan (Opsional)</div>
        <div class="inspector-breakdown-row">
          <div>
            <label class="form-label" style="font-size: 10px;">Biaya Admin</label>
            <input type="number" id="panelTxAdminFee" class="form-input" placeholder="0" min="0" value="0" style="padding: 4px 8px; font-size: 11px;">
          </div>
          <div>
            <label class="form-label" style="font-size: 10px;">Ongkos Kirim</label>
            <input type="number" id="panelTxShippingFee" class="form-input" placeholder="0" min="0" value="0" style="padding: 4px 8px; font-size: 11px;">
          </div>
        </div>
        <div class="inspector-total-pill">
          <span style="color: #cbd5e1;">Total Terhitung:</span>
          <span id="panelTxTotalPreview" class="inspector-total-pill-val">Rp 0</span>
        </div>
      </div>
    `;
  } else if (activePanelTxType === 'income') {
    const isPocketNode = nodeType === 'account';
    return `
      ${isPocketNode ? `
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Sumber Pemasukan (Dari)</label>
          <select id="panelTxSourceSelect" class="form-select" style="font-size: 12px;">
            ${incomeSources.map(i => `<option value="${i.id}">${i.label}</option>`).join('')}
            <option value="__new__">+ Sumber Pemasukan Baru...</option>
          </select>
          <input type="text" id="panelTxNewCategoryInput" class="form-input" placeholder="Ketik nama sumber pemasukan baru" style="display: none; margin-top: 6px; font-size: 12px;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Masuk ke Kantong</label>
          <div style="font-size: 12px; font-weight: 600; color: #34d399; background: rgba(16, 185, 129, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2);">
            💰 ${node.label}
          </div>
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Sumber Pemasukan</label>
          <div style="font-size: 12px; font-weight: 600; color: #34d399; background: rgba(16, 185, 129, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2);">
            💰 ${node.label}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Setor ke Kantong / Rekening</label>
          <select id="panelTxDestSelect" class="form-select" style="font-size: 12px;">
            ${pockets.map(p => `<option value="${p.id}">${p.label} (${i18n.formatCurrency(p.balance)})</option>`).join('')}
          </select>
        </div>
      `}

      <div class="form-group">
        <label class="form-label" style="font-size: 11px;">Nominal Pemasukan (Rp)</label>
        <input type="number" id="panelTxAmount" class="form-input" placeholder="Cth: 500000" min="1" required style="font-size: 12px;">
      </div>
    `;
  } else if (activePanelTxType === 'transfer') {
    const otherPockets = pockets.filter(p => p.id !== node.id);
    return `
      <div class="form-group">
        <label class="form-label" style="font-size: 11px;">Dari Kantong Asal</label>
        <div style="font-size: 12px; font-weight: 600; color: #60a5fa; background: rgba(59, 130, 246, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
          📤 ${node.label} (Saldo: ${i18n.formatCurrency(node.balance)})
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-size: 11px;">Ke Kantong Tujuan</label>
        <select id="panelTxDestSelect" class="form-select" style="font-size: 12px;">
          ${otherPockets.map(p => `<option value="${p.id}">${p.label} (${i18n.formatCurrency(p.balance)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-size: 11px;">Nominal Transfer (Rp)</label>
        <input type="number" id="panelTxAmount" class="form-input" placeholder="Cth: 100000" min="1" required style="font-size: 12px;">
      </div>

      <!-- Biaya Admin Transfer -->
      <div class="inspector-breakdown-box">
        <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Biaya Transfer Bank / E-Wallet</div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 10px;">Biaya Admin (Rp)</label>
          <input type="number" id="panelTxAdminFee" class="form-input" placeholder="0" min="0" value="0" style="padding: 4px 8px; font-size: 11px;">
        </div>
        <div class="inspector-total-pill">
          <span style="color: #cbd5e1;">Total Saldo Terpotong:</span>
          <span id="panelTxTotalPreview" class="inspector-total-pill-val">Rp 0</span>
        </div>
      </div>
    `;
  }
}

function inspectNode(nodeId) {
  const body = document.getElementById('inspectorBody');
  if (!body) return;

  // Handle click on column total nodes
  if (nodeId === 'total-income') {
    inspectTotalColumn('income');
    return;
  }
  if (nodeId === 'total-pocket') {
    inspectTotalColumn('pocket');
    return;
  }
  if (nodeId === 'total-expense') {
    inspectTotalColumn('expense');
    return;
  }

  const nodeClickAction = document.getElementById('nodeClickActionSelect')?.value || 'both';

  if (nodeClickAction === 'both' || nodeClickAction === 'table') {
    const rows = document.querySelectorAll('#ledgerTableBody tr[data-tx-id]');
    let firstMatch = null;
    rows.forEach(r => {
      const fromId = r.getAttribute('data-from-id');
      const toId = r.getAttribute('data-to-id');
      if (fromId === nodeId || toId === nodeId) {
        r.classList.add('row-timeline-highlight');
        if (!firstMatch) firstMatch = r;
      } else {
        r.classList.remove('row-timeline-highlight');
      }
    });
    if (firstMatch && (currentView === 'table' || currentView === 'split')) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (nodeClickAction === 'table') return;

  if (!isInspectorOpen) {
    isInspectorOpen = true;
    updateViewLayout();
  }

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

  // Retrieve attachments or provide realistic samples
  const nodeAttachments = store.getNodeAttachments(nodeId);
  const sampleAttachments = [
    {
      id: `sample_pdf_${node.id}`,
      name: `Kwitansi_${node.label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      type: 'application/pdf',
      size: '185 KB',
      date: new Date().toISOString().split('T')[0],
      txNote: `Bukti transaksi resmi ${node.label}`,
      txAmount: node.balance || node.total || 50000,
      isSample: true
    },
    {
      id: `sample_img_${node.id}`,
      name: `Struk_${node.label.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
      type: 'image/jpeg',
      size: '220 KB',
      date: new Date().toISOString().split('T')[0],
      txNote: `Foto struk / e-receipt ${node.label}`,
      txAmount: node.balance || node.total || 35000,
      isSample: true
    }
  ];
  const displayAttachments = nodeAttachments.length > 0 ? nodeAttachments : sampleAttachments;

  // Staged attachments for the quick add transaction form
  let stagedTxAttachments = [];
  let activePanelTxType = type === 'account' ? 'expense' : type;

  body.innerHTML = `
    <!-- 1. Node Statistics & Info Card -->
    <div class="inspector-node-card">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="badge-tag tag-${type}">${type.toUpperCase()} NODE</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">ID: ${node.id}</span>
      </div>
      <h3 style="margin-top: 8px; font-size: 17px; font-weight: 800; color: #f8fafc;">${node.label}</h3>

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

    <!-- 2. Direct Add Transaction in Inspector Panel -->
    <div class="inspector-node-card inspector-add-tx-card" style="border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.04);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #34d399; margin: 0; display: flex; align-items: center; gap: 6px;">
          <span>➕</span>
          <span>Catat Transaksi untuk Node Ini</span>
        </h4>
        <span class="badge-tag tag-income" style="font-size: 10px; padding: 2px 6px;">PANEL CEPAT</span>
      </div>

      <form id="formPanelAddTx" style="display: flex; flex-direction: column; gap: 10px;">
        ${type === 'account' ? `
          <div class="inspector-tx-type-toggle">
            <button type="button" class="inspector-tx-type-btn active type-expense" data-ptype="expense">💸 Pengeluaran</button>
            <button type="button" class="inspector-tx-type-btn type-income" data-ptype="income">💰 Pemasukan</button>
            <button type="button" class="inspector-tx-type-btn type-transfer" data-ptype="transfer">⇄ Transfer</button>
          </div>
        ` : ''}

        <div id="panelTxDynamicFieldsContainer">
          ${renderPanelAddTxFields(activePanelTxType, node, type)}
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Tanggal Transaksi</label>
          <input type="date" id="panelTxDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" required style="font-size: 12px;">
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: 11px;">Catatan / Deskripsi</label>
          <input type="text" id="panelTxNote" class="form-input" placeholder="Cth: Belanja mingguan, makan siang..." style="font-size: 12px;">
        </div>

        <!-- Attachments Selector in Quick Form -->
        <div class="form-group" style="margin-bottom: 4px;">
          <label class="form-label" style="font-size: 11px; display: flex; justify-content: space-between;">
            <span>Lampiran Bukti (PDF, PNG, JPG)</span>
            <span style="color: var(--text-muted); font-size: 10px;">Opsional</span>
          </label>
          <input type="file" id="panelTxFileInput" accept=".pdf,.png,.jpg,.jpeg" style="display: none;">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" id="btnPanelTxPickFile" class="btn-action" style="flex: 1; padding: 5px 8px; font-size: 11px; background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.4);">
              📎 Pilih File
            </button>
            <button type="button" id="btnPanelTxSampleReceipt" class="btn-action" style="padding: 5px 8px; font-size: 11px; background: #334155; color: #cbd5e1;">
              📄 Pakai Contoh Struk
            </button>
          </div>
          <div id="panelTxSelectedChips" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;"></div>
        </div>

        <button type="submit" class="btn-action btn-income" style="width: 100%; padding: 8px 12px; font-size: 12px; font-weight: 700; margin-top: 4px;">
          💾 Simpan & Catat Transaksi
        </button>
      </form>
    </div>

    <!-- 3. Berkas Lampiran & Dokumen Digital -->
    <div class="inspector-node-card" style="border: 1px solid rgba(139, 92, 246, 0.3);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #c084fc; margin: 0; display: flex; align-items: center; gap: 6px;">
          <span>📎</span>
          <span>Lampiran Dokumen & Bukti</span>
        </h4>
        <label for="inspectorDirectUpload" class="btn-action" style="padding: 3px 8px; font-size: 10px; background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
          <span>+ Upload File</span>
        </label>
        <input type="file" id="inspectorDirectUpload" accept=".pdf,.png,.jpg,.jpeg" style="display: none;">
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${displayAttachments.map(att => {
          const isPdf = (att.type && att.type.includes('pdf')) || (att.name && att.name.toLowerCase().endsWith('.pdf'));
          return `
            <div class="inspector-attachment-item">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <span class="${isPdf ? 'attachment-badge-pdf' : 'attachment-badge-img'}">${isPdf ? 'PDF' : 'IMG'}</span>
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <span style="font-size: 12px; font-weight: 600; color: #f1f5f9; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${att.name}
                  </span>
                  <span style="font-size: 10px; color: var(--text-muted);">
                    ${att.size || '180 KB'} &bull; ${att.date || '2026-09-05'} ${att.isSample ? '&bull; <i style="color:#a78bfa;">(Contoh)</i>' : ''}
                  </span>
                </div>
              </div>
              <button type="button" class="btn-action btn-inspect-view-att" data-att-json='${JSON.stringify(att).replace(/'/g, "&apos;")}' style="padding: 3px 8px; font-size: 10px; background: #334155; color: #38bdf8;">
                👁️ Preview
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 4. Strict Panel Data Editor -->
    <div class="inspector-node-card" style="border: 1px solid rgba(59, 130, 246, 0.3);">
      <h4 style="font-size: 13px; font-weight: 700; color: #93c5fd; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
        <span>✏️</span>
        <span>Edit Data Node (Panel Editor)</span>
      </h4>

      <form id="formPanelEditNode" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="form-group">
          <label class="form-label">Nama Node</label>
          <input type="text" id="editNodeLabelInput" class="form-input" value="${node.label}" required>
        </div>

        ${type === 'account' ? `
          <div class="form-group">
            <label class="form-label">Tipe Dompet</label>
            <select id="editNodeCategorySelect" class="form-select">
              <option value="cash" ${node.category === 'cash' ? 'selected' : ''}>Uang Tunai / Dompet Fisik</option>
              <option value="bank" ${node.category === 'bank' ? 'selected' : ''}>Rekening Bank</option>
              <option value="e_wallet" ${node.category === 'e_wallet' ? 'selected' : ''}>E-Wallet</option>
              <option value="savings" ${node.category === 'savings' ? 'selected' : ''}>Tabungan</option>
            </select>
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <button type="submit" class="btn-action btn-income" style="flex: 2; padding: 7px 12px; font-size: 12px;">
            💾 Simpan Perubahan
          </button>
          <button type="button" id="btnPanelDeleteNode" class="btn-action btn-expense" style="flex: 1; padding: 7px 12px; font-size: 12px;">
            🗑️ Hapus
          </button>
        </div>
      </form>
    </div>

    <!-- 5. Transaction History & Note Editor -->
    <div>
      <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
        <span>${i18n.t('inspector_history')} (${txs.length})</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Klik ✏️ untuk edit catatan</span>
      </h4>
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
        ${renderTxItemsHtml(txs)}
      </div>
    </div>
  `;

  // Helper: Live calculation update
  const updateLiveTotalPreview = () => {
    const amt = Number(document.getElementById('panelTxAmount')?.value) || 0;
    const admin = Number(document.getElementById('panelTxAdminFee')?.value) || 0;
    const ship = Number(document.getElementById('panelTxShippingFee')?.value) || 0;
    const totalPreview = document.getElementById('panelTxTotalPreview');
    if (totalPreview) {
      totalPreview.textContent = i18n.formatCurrency(amt + admin + ship);
    }
  };

  const bindDynamicFieldsEvents = () => {
    const amtInput = document.getElementById('panelTxAmount');
    const adminInput = document.getElementById('panelTxAdminFee');
    const shipInput = document.getElementById('panelTxShippingFee');
    [amtInput, adminInput, shipInput].forEach(inp => {
      inp?.addEventListener('input', updateLiveTotalPreview);
    });
    updateLiveTotalPreview();

    // Toggle custom category input if __new__ selected
    const destSelect = document.getElementById('panelTxDestSelect');
    const srcSelect = document.getElementById('panelTxSourceSelect');
    const newCatInput = document.getElementById('panelTxNewCategoryInput');

    const checkNew = (sel) => {
      if (sel && newCatInput) {
        newCatInput.style.display = sel.value === '__new__' ? 'block' : 'none';
        if (sel.value === '__new__') newCatInput.focus();
      }
    };

    destSelect?.addEventListener('change', () => checkNew(destSelect));
    srcSelect?.addEventListener('change', () => checkNew(srcSelect));
  };

  bindDynamicFieldsEvents();

  // Switch active tx type tabs for accounts
  body.querySelectorAll('.inspector-tx-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.inspector-tx-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePanelTxType = btn.getAttribute('data-ptype');
      const container = document.getElementById('panelTxDynamicFieldsContainer');
      if (container) {
        container.innerHTML = renderPanelAddTxFields(activePanelTxType, node, type);
        bindDynamicFieldsEvents();
      }
    });
  });

  // Staged Attachment Chips Render
  const renderStagedChips = () => {
    const chipsContainer = document.getElementById('panelTxSelectedChips');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = stagedTxAttachments.map((att, idx) => `
      <span class="tx-attachment-chip" style="font-size: 11px;">
        <span>${att.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
        <span>${att.name}</span>
        <button type="button" data-del-staged="${idx}" style="background: transparent; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 2px;">✕</button>
      </span>
    `).join('');

    chipsContainer.querySelectorAll('[data-del-staged]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-del-staged'));
        stagedTxAttachments.splice(idx, 1);
        renderStagedChips();
      });
    });
  };

  // Attachment buttons in Quick Add form
  const fileInput = document.getElementById('panelTxFileInput');
  document.getElementById('btnPanelTxPickFile')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (re) => {
      stagedTxAttachments.push({
        id: 'att_' + Date.now(),
        name: file.name,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: formatBytes(file.size),
        dataUrl: re.target.result,
        date: new Date().toISOString().split('T')[0]
      });
      renderStagedChips();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnPanelTxSampleReceipt')?.addEventListener('click', () => {
    stagedTxAttachments.push({
      id: 'att_sample_' + Date.now(),
      name: `Struk_${node.label.replace(/[^a-zA-Z0-9]/g, '_')}_Alfamart.jpg`,
      type: 'image/jpeg',
      size: '235 KB',
      date: new Date().toISOString().split('T')[0]
    });
    renderStagedChips();
  });

  // Direct Attachment Upload from Inspector Section
  const directUploadInput = document.getElementById('inspectorDirectUpload');
  directUploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (re) => {
      const newAtt = {
        id: 'att_' + Date.now(),
        name: file.name,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: formatBytes(file.size),
        dataUrl: re.target.result,
        date: new Date().toISOString().split('T')[0]
      };
      await store.addAttachmentToNode(nodeId, newAtt);
      showToast(`Berkas "${file.name}" berhasil dilampirkan ke node!`);
      inspectNode(nodeId);
    };
    reader.readAsDataURL(file);
  });

  // Preview Buttons in Attachments Card
  body.querySelectorAll('.btn-inspect-view-att').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        const json = btn.getAttribute('data-att-json');
        if (json) {
          const att = JSON.parse(json);
          openAttachmentPreview(att);
        }
      } catch (err) {
        console.warn('Error previewing attachment:', err);
      }
    });
  });

  // Form Submit: Direct Add Transaction
  document.getElementById('formPanelAddTx')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amt = Number(document.getElementById('panelTxAmount')?.value) || 0;
    const admin = Number(document.getElementById('panelTxAdminFee')?.value) || 0;
    const ship = Number(document.getElementById('panelTxShippingFee')?.value) || 0;
    const txDate = document.getElementById('panelTxDate')?.value || new Date().toISOString().split('T')[0];
    const txNote = document.getElementById('panelTxNote')?.value?.trim() || '';

    let fromId, fromLabel, toId, toLabel;

    if (activePanelTxType === 'expense') {
      if (type === 'account') {
        fromId = node.id;
        fromLabel = node.label;
        const destSel = document.getElementById('panelTxDestSelect');
        if (destSel.value === '__new__') {
          const newLabel = document.getElementById('panelTxNewCategoryInput')?.value?.trim() || 'Pengeluaran Lain';
          const cat = store.getOrCreateExpenseCategory(newLabel);
          toId = cat.id;
          toLabel = cat.label;
        } else {
          const cat = store.state.expenseCategories.find(c => c.id === destSel.value);
          toId = cat ? cat.id : destSel.value;
          toLabel = cat ? cat.label : 'Expense';
        }
      } else {
        toId = node.id;
        toLabel = node.label;
        const srcSel = document.getElementById('panelTxSourceSelect');
        const pkt = store.state.pockets.find(p => p.id === srcSel.value);
        fromId = pkt ? pkt.id : srcSel.value;
        fromLabel = pkt ? pkt.label : 'Pocket';
      }
    } else if (activePanelTxType === 'income') {
      if (type === 'account') {
        toId = node.id;
        toLabel = node.label;
        const srcSel = document.getElementById('panelTxSourceSelect');
        if (srcSel.value === '__new__') {
          const newLabel = document.getElementById('panelTxNewCategoryInput')?.value?.trim() || 'Pemasukan Lain';
          const inc = store.getOrCreateIncomeSource(newLabel);
          fromId = inc.id;
          fromLabel = inc.label;
        } else {
          const inc = store.state.incomeSources.find(i => i.id === srcSel.value);
          fromId = inc ? inc.id : srcSel.value;
          fromLabel = inc ? inc.label : 'Income';
        }
      } else {
        fromId = node.id;
        fromLabel = node.label;
        const destSel = document.getElementById('panelTxDestSelect');
        const pkt = store.state.pockets.find(p => p.id === destSel.value);
        toId = pkt ? pkt.id : destSel.value;
        toLabel = pkt ? pkt.label : 'Pocket';
      }
    } else if (activePanelTxType === 'transfer') {
      fromId = node.id;
      fromLabel = node.label;
      const destSel = document.getElementById('panelTxDestSelect');
      const pkt = store.state.pockets.find(p => p.id === destSel.value);
      toId = pkt ? pkt.id : destSel.value;
      toLabel = pkt ? pkt.label : 'Pocket';
    }

    await store.addTransaction({
      type: activePanelTxType,
      fromId,
      fromLabel,
      toId,
      toLabel,
      amount: amt,
      adminFee: admin,
      shippingFee: ship,
      date: txDate,
      note: txNote,
      attachments: stagedTxAttachments
    });

    showToast(`Transaksi sebesar ${i18n.formatCurrency(amt)} berhasil dicatat!`);

    if (flowCanvas) flowCanvas.render();
    renderTableLedger();
    inspectNode(nodeId);
  });

  // Hook Edit Node Save
  document.getElementById('formPanelEditNode')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newLabel = document.getElementById('editNodeLabelInput').value.trim();
    const categorySelect = document.getElementById('editNodeCategorySelect');
    const newCategory = categorySelect ? categorySelect.value : undefined;

    await store.updateNode(nodeId, { label: newLabel, category: newCategory });
    showToast(`Data node "${newLabel}" berhasil diperbarui!`);
    if (flowCanvas) flowCanvas.render();
    inspectNode(nodeId);
  });

  // Hook Delete Node
  document.getElementById('btnPanelDeleteNode')?.addEventListener('click', async () => {
    if (confirm(`Apakah Anda yakin ingin menghapus node "${node.label}" beserta transaksinya?`)) {
      await store.deleteNode(nodeId);
      showToast(`Node "${node.label}" berhasil dihapus.`);
      if (flowCanvas) {
        flowCanvas.selectedNodeId = null;
        flowCanvas.render();
      }
      body.innerHTML = `
        <div class="inspector-empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p>Node telah dihapus. Klik node lain untuk inspeksi.</p>
        </div>
      `;
    }
  });

  // Hook Inline Note Editors
  attachInlineNoteEditors(body, nodeId);
}

// 6. Precision Table Ledger (Brief v05: Timeline Rail + Inline Quick Add)
function updateQuickAddDropdowns() {
  const typeEl = document.getElementById('quickAddType');
  const srcEl = document.getElementById('quickAddSource');
  const tgtEl = document.getElementById('quickAddTarget');
  const pktLabelEl = document.getElementById('quickAddPocketLabel');
  if (!typeEl || !srcEl || !tgtEl) return;

  const type = typeEl.value;
  srcEl.innerHTML = '';
  tgtEl.innerHTML = '';

  const pockets = store.state.pockets || [];
  const incomes = store.state.incomeSources || [];
  const expenses = store.state.expenseCategories || [];

  if (type === 'expense') {
    pockets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} (${i18n.formatCurrency(p.balance)})`;
      srcEl.appendChild(opt);
    });
    expenses.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.label;
      tgtEl.appendChild(opt);
    });
    if (pktLabelEl) {
      const selectedPocket = pockets.find(p => p.id === srcEl.value);
      pktLabelEl.textContent = selectedPocket ? selectedPocket.label : '-';
    }
  } else if (type === 'income') {
    incomes.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.id;
      opt.textContent = i.label;
      srcEl.appendChild(opt);
    });
    pockets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} (${i18n.formatCurrency(p.balance)})`;
      tgtEl.appendChild(opt);
    });
    if (pktLabelEl) {
      const selectedPocket = pockets.find(p => p.id === tgtEl.value);
      pktLabelEl.textContent = selectedPocket ? selectedPocket.label : '-';
    }
  } else if (type === 'transfer') {
    pockets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} (${i18n.formatCurrency(p.balance)})`;
      srcEl.appendChild(opt);
    });
    pockets.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} (${i18n.formatCurrency(p.balance)})`;
      if (idx === 1 || (idx === 0 && pockets.length === 1)) opt.selected = true;
      tgtEl.appendChild(opt);
    });
    if (pktLabelEl) {
      pktLabelEl.textContent = '⇄ Antar Kantong';
    }
  }
}

function submitQuickAddTransaction() {
  const dateEl = document.getElementById('quickAddDate');
  const typeEl = document.getElementById('quickAddType');
  const amtEl = document.getElementById('quickAddAmount');
  const srcEl = document.getElementById('quickAddSource');
  const tgtEl = document.getElementById('quickAddTarget');
  const adminFeeEl = document.getElementById('quickAddAdminFee');
  const shipFeeEl = document.getElementById('quickAddShippingFee');
  const noteEl = document.getElementById('quickAddNote');

  if (!amtEl || !srcEl || !tgtEl) return;

  const amount = parseFloat(amtEl.value);
  if (!amount || amount <= 0) {
    showToast('Masukkan jumlah nominal yang valid!');
    amtEl.focus();
    return;
  }

  const type = typeEl.value;
  const date = dateEl?.value || new Date().toISOString().split('T')[0];
  const fromId = srcEl.value;
  const toId = tgtEl.value;
  const adminFee = parseFloat(adminFeeEl?.value) || 0;
  const shippingFee = parseFloat(shipFeeEl?.value) || 0;
  const note = (noteEl?.value || '').trim();

  if (type === 'transfer' && fromId === toId) {
    showToast('Sumber dan tujuan transfer tidak boleh sama!');
    return;
  }

  try {
    store.addTransaction({
      date,
      type,
      amount,
      fromId,
      toId,
      adminFee,
      shippingFee,
      note: note || (type === 'transfer' ? 'Transfer Cepat' : (type === 'income' ? 'Pemasukan Cepat' : 'Pengeluaran Cepat'))
    });

    amtEl.value = '';
    if (noteEl) noteEl.value = '';
    if (adminFeeEl) adminFeeEl.value = '0';
    if (shipFeeEl) shipFeeEl.value = '0';
    const popover = document.getElementById('quickAddFeesPopover');
    if (popover) popover.style.display = 'none';

    showToast('Transaksi berhasil dicatat!');
    updateQuickAddDropdowns();
    renderTableLedger();
  } catch (err) {
    console.error('Quick add transaction error:', err);
    showToast('Gagal mencatat transaksi: ' + err.message);
  }
}

function renderQuickAddRow() {
  const tr = document.getElementById('tableQuickAddRow');
  if (!tr) return;

  const prevDate = document.getElementById('quickAddDate')?.value || new Date().toISOString().split('T')[0];
  const prevType = document.getElementById('quickAddType')?.value || 'expense';
  const prevAmt = document.getElementById('quickAddAmount')?.value || '';
  const prevAdmin = document.getElementById('quickAddAdminFee')?.value || '0';
  const prevShip = document.getElementById('quickAddShippingFee')?.value || '0';
  const prevSrc = document.getElementById('quickAddSource')?.value;
  const prevTgt = document.getElementById('quickAddTarget')?.value;
  const prevNote = document.getElementById('quickAddNote')?.value || '';

  if (!isTableDetailedMode) {
    // Simple Mode: 10 columns
    tr.innerHTML = `
      <td style="text-align: center; color: #10b981; font-weight: 800; font-size: 14px;" title="Tambah Transaksi Cepat">⚡</td>
      <td><input type="date" id="quickAddDate" class="quick-input" title="Tanggal Transaksi" value="${prevDate}"></td>
      <td>
        <select id="quickAddType" class="quick-select" title="Jenis Transaksi">
          <option value="expense" ${prevType === 'expense' ? 'selected' : ''}>EXPENSE</option>
          <option value="income" ${prevType === 'income' ? 'selected' : ''}>INCOME</option>
          <option value="transfer" ${prevType === 'transfer' ? 'selected' : ''}>TRANSFER</option>
        </select>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center; position: relative;">
          <input type="number" id="quickAddAmount" class="quick-input" placeholder="Rp Pokok" min="1" required style="width: 80px;" value="${prevAmt}">
          <button type="button" id="btnQuickAddFeesToggle" class="quick-btn-icon" title="Rincian Admin & Ongkir">🏷️</button>
          <div id="quickAddFeesPopover" class="quick-fees-popover" style="display: none;">
            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">RINCIAN BIAYA</div>
            <label style="font-size: 9px; color: #cbd5e1;">Biaya Admin:</label>
            <input type="number" id="quickAddAdminFee" class="quick-input" placeholder="0" min="0" value="${prevAdmin}" style="margin-bottom: 4px;">
            <label style="font-size: 9px; color: #cbd5e1;">Ongkos Kirim:</label>
            <input type="number" id="quickAddShippingFee" class="quick-input" placeholder="0" min="0" value="${prevShip}">
          </div>
        </div>
      </td>
      <td style="font-size: 11px; color: var(--text-muted); font-style: italic; white-space: nowrap;">Auto-Calc</td>
      <td><select id="quickAddSource" class="quick-select" title="Sumber Dana"></select></td>
      <td><select id="quickAddTarget" class="quick-select" title="Pos / Rekening Tujuan"></select></td>
      <td id="quickAddPocketLabel" style="font-size: 11px; color: #93c5fd; white-space: nowrap;">-</td>
      <td><input type="text" id="quickAddNote" class="quick-input" placeholder="Catatan transaksi..." style="min-width: 110px;" value="${prevNote}"></td>
      <td class="sticky-action-cell" style="text-align: right; white-space: nowrap;">
        <button type="button" id="btnQuickAddSubmit" class="btn-action btn-income" style="padding: 4px 10px; font-size: 11px; font-weight: 700;">+ Catat</button>
      </td>
    `;
  } else {
    // Detailed Mode: 13 columns
    const totalKas = (Number(prevAmt) || 0) + (Number(prevAdmin) || 0) + (Number(prevShip) || 0);
    tr.innerHTML = `
      <td style="text-align: center; color: #10b981; font-weight: 800; font-size: 14px;" title="Tambah Transaksi Cepat">⚡</td>
      <td><input type="date" id="quickAddDate" class="quick-input" title="Tanggal Transaksi" value="${prevDate}"></td>
      <td>
        <select id="quickAddType" class="quick-select" title="Jenis Transaksi">
          <option value="expense" ${prevType === 'expense' ? 'selected' : ''}>EXPENSE</option>
          <option value="income" ${prevType === 'income' ? 'selected' : ''}>INCOME</option>
          <option value="transfer" ${prevType === 'transfer' ? 'selected' : ''}>TRANSFER</option>
        </select>
      </td>
      <td><input type="number" id="quickAddAmount" class="quick-input" placeholder="Rp Pokok" min="1" required style="width: 80px;" value="${prevAmt}"></td>
      <td><input type="number" id="quickAddAdminFee" class="quick-input" placeholder="Admin" min="0" value="${prevAdmin}" style="width: 65px;"></td>
      <td><input type="number" id="quickAddShippingFee" class="quick-input" placeholder="Ongkir" min="0" value="${prevShip}" style="width: 65px;"></td>
      <td id="quickAddTotalKasDisplay" style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #38bdf8; font-weight: 700; white-space: nowrap;">${i18n.formatCurrency(totalKas)}</td>
      <td style="font-size: 11px; color: var(--text-muted); font-style: italic; white-space: nowrap;">Auto-Calc</td>
      <td><select id="quickAddSource" class="quick-select" title="Sumber Dana"></select></td>
      <td><select id="quickAddTarget" class="quick-select" title="Pos / Rekening Tujuan"></select></td>
      <td id="quickAddPocketLabel" style="font-size: 11px; color: #93c5fd; white-space: nowrap;">-</td>
      <td><input type="text" id="quickAddNote" class="quick-input" placeholder="Catatan transaksi..." style="min-width: 110px;" value="${prevNote}"></td>
      <td class="sticky-action-cell" style="text-align: right; white-space: nowrap;">
        <button type="button" id="btnQuickAddSubmit" class="btn-action btn-income" style="padding: 4px 10px; font-size: 11px; font-weight: 700;">+ Catat</button>
      </td>
    `;
  }

  bindQuickAddRowEvents(prevSrc, prevTgt);
}

function bindQuickAddRowEvents(prevSrc, prevTgt) {
  const quickTypeEl = document.getElementById('quickAddType');
  const quickSrcEl = document.getElementById('quickAddSource');
  const quickTgtEl = document.getElementById('quickAddTarget');
  const pktLabelEl = document.getElementById('quickAddPocketLabel');
  const quickAmtInput = document.getElementById('quickAddAmount');
  const quickAdminInput = document.getElementById('quickAddAdminFee');
  const quickShipInput = document.getElementById('quickAddShippingFee');
  const quickTotalKas = document.getElementById('quickAddTotalKasDisplay');
  const quickNoteInput = document.getElementById('quickAddNote');
  const btnQuickSubmit = document.getElementById('btnQuickAddSubmit');
  const btnFeesToggle = document.getElementById('btnQuickAddFeesToggle');
  const feesPopover = document.getElementById('quickAddFeesPopover');

  const updateTotalKasDisplay = () => {
    if (quickTotalKas && quickAmtInput) {
      const amt = Number(quickAmtInput.value) || 0;
      const adm = Number(quickAdminInput?.value) || 0;
      const shp = Number(quickShipInput?.value) || 0;
      quickTotalKas.textContent = i18n.formatCurrency(amt + adm + shp);
    }
  };

  quickAmtInput?.addEventListener('input', updateTotalKasDisplay);
  quickAdminInput?.addEventListener('input', updateTotalKasDisplay);
  quickShipInput?.addEventListener('input', updateTotalKasDisplay);

  if (quickTypeEl) {
    quickTypeEl.addEventListener('change', () => {
      updateQuickAddDropdowns();
    });
  }

  if (quickSrcEl) {
    quickSrcEl.addEventListener('change', () => {
      if (quickTypeEl?.value === 'expense' && pktLabelEl) {
        const pocket = store.state.pockets.find(p => p.id === quickSrcEl.value);
        pktLabelEl.textContent = pocket ? pocket.label : '-';
      }
    });
  }

  if (quickTgtEl) {
    quickTgtEl.addEventListener('change', () => {
      if (quickTypeEl?.value === 'income' && pktLabelEl) {
        const pocket = store.state.pockets.find(p => p.id === quickTgtEl.value);
        pktLabelEl.textContent = pocket ? pocket.label : '-';
      }
    });
  }

  if (btnFeesToggle && feesPopover) {
    btnFeesToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      feesPopover.style.display = feesPopover.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!feesPopover.contains(e.target) && e.target !== btnFeesToggle) {
        feesPopover.style.display = 'none';
      }
    });
  }

  if (btnQuickSubmit) {
    btnQuickSubmit.addEventListener('click', () => {
      submitQuickAddTransaction();
    });
  }

  quickAmtInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitQuickAddTransaction();
    }
  });

  quickNoteInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitQuickAddTransaction();
    }
  });

  updateQuickAddDropdowns();
  if (prevSrc && quickSrcEl) quickSrcEl.value = prevSrc;
  if (prevTgt && quickTgtEl) quickTgtEl.value = prevTgt;
}

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
    btn.classList.toggle('active', btn.getAttribute('data-table-filter') === tableFilter);
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tableFilter = btn.getAttribute('data-table-filter');
      renderTableLedger();
      saveAppSettings();
    });
  });

  const nodeClickSelect = document.getElementById('nodeClickActionSelect');
  if (nodeClickSelect) {
    const saved = loadAppSettings();
    if (saved?.nodeClickAction) {
      nodeClickSelect.value = saved.nodeClickAction;
    }
    nodeClickSelect.addEventListener('change', () => {
      saveAppSettings();
    });
  }

  // Real-time synchronization with Timeline playback and scrubbing
  window.addEventListener('timelineFrameChanged', (e) => {
    const { frameIndex, tx, isLive } = e.detail;
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr[data-tx-id]');
    rows.forEach(r => {
      const isThisTx = tx && r.getAttribute('data-tx-id') === tx.id;
      r.classList.toggle('row-active-frame', isThisTx);
      const dot = r.querySelector('.timeline-rail-dot');
      if (dot) {
        dot.classList.toggle('active', isThisTx);
      }
    });

    if (tx && (currentView === 'table' || currentView === 'split')) {
      const activeRow = tbody.querySelector(`tr[data-tx-id="${tx.id}"]`);
      if (activeRow && timelineController && timelineController.isPlaying) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  // Sort Order Toggle (Latest First vs Oldest First)
  const btnToggleSortOrder = document.getElementById('btnToggleSortOrder');
  const sortOrderIcon = document.getElementById('sortOrderIcon');
  const sortOrderLabel = document.getElementById('sortOrderLabel');

  const updateSortUI = () => {
    const isLatest = tableSortOrder === 'latest';
    if (sortOrderIcon) sortOrderIcon.textContent = isLatest ? '⬇️' : '⬆️';
    if (sortOrderLabel) sortOrderLabel.textContent = isLatest ? 'Terbaru Dulu' : 'Terlama Dulu';
    const thDateSortIndicator = document.getElementById('thDateSortIndicator');
    if (thDateSortIndicator) thDateSortIndicator.textContent = isLatest ? '▼' : '▲';
    if (btnToggleSortOrder) {
      btnToggleSortOrder.classList.toggle('order-oldest', !isLatest);
      btnToggleSortOrder.title = isLatest 
        ? 'Urutan saat ini: Terbaru Dulu (Klik untuk Terlama Dulu)' 
        : 'Urutan saat ini: Terlama Dulu (Klik untuk Terbaru Dulu)';
    }
  };

  const toggleSortOrder = () => {
    tableSortOrder = tableSortOrder === 'latest' ? 'oldest' : 'latest';
    updateSortUI();
    renderTableLedger();
    saveAppSettings();
  };

  if (btnToggleSortOrder) {
    btnToggleSortOrder.addEventListener('click', toggleSortOrder);
  }

  updateSortUI();
  renderQuickAddRow();
  renderTableLedger();
}

function initTableDetailToggle() {
  const btnToggle = document.getElementById('btnToggleTableDetailMode');
  const iconEl = document.getElementById('tableDetailIcon');
  const labelEl = document.getElementById('tableDetailLabel');

  const updateUI = () => {
    if (iconEl) iconEl.textContent = isTableDetailedMode ? '📋' : '📑';
    if (labelEl) labelEl.textContent = isTableDetailedMode ? 'Simple Mode' : 'Detailed Mode';
    if (btnToggle) {
      btnToggle.style.borderColor = isTableDetailedMode ? '#38bdf8' : 'var(--border-color)';
      btnToggle.style.color = isTableDetailedMode ? '#38bdf8' : '#cbd5e1';
      btnToggle.title = isTableDetailedMode
        ? 'Tampilan saat ini: Detailed (Raw Data). Klik untuk kembali ke Mode Ringkas'
        : 'Tampilan saat ini: Simple. Klik untuk Mode Rinci (Raw Data)';
    }
  };

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      isTableDetailedMode = !isTableDetailedMode;
      updateUI();
      renderQuickAddRow();
      renderTableLedger();
      saveAppSettings();
    });
  }

  updateUI();
}

function initScopeSelect() {
  const scopeSelect = document.getElementById('scopeSelect');
  if (scopeSelect) {
    scopeSelect.value = scopeFilter;
    scopeSelect.addEventListener('change', (e) => {
      scopeFilter = e.target.value;
      renderTableLedger();
      updateKPIs();
      if (flowCanvas) flowCanvas.render();
      saveAppSettings();
    });
  }
}

function resetPanelSizes() {
  const canvasWrapper = document.getElementById('canvasWrapper');
  const inspectorSidebar = document.getElementById('inspectorSidebar');
  const tableViewContainer = document.getElementById('tableViewContainer');

  [canvasWrapper, inspectorSidebar, tableViewContainer].forEach(el => {
    if (el) {
      el.style.width = '';
      el.style.flex = '';
      el.style.maxWidth = '';
      el.style.minWidth = '';
    }
  });

  if (flowCanvas) flowCanvas.render();
}

function initPanelSplitters() {
  const container = document.getElementById('workspaceContainer');
  const splitterCanvas = document.getElementById('splitterCanvas');
  const splitterInspector = document.getElementById('splitterInspector');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const inspectorSidebar = document.getElementById('inspectorSidebar');
  const tableViewContainer = document.getElementById('tableViewContainer');

  if (!container) return;

  const bindDrag = (splitter, getLeftEl, getRightEl) => {
    if (!splitter) return;

    splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const leftEl = getLeftEl();
      const rightEl = getRightEl();
      if (!leftEl || !rightEl) return;

      container.classList.add('is-resizing');
      splitter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      // Snapshot starting dimensions at mousedown to prevent feedback loops
      const startX = e.clientX;
      const startLeftWidth = leftEl.getBoundingClientRect().width;
      const startRightWidth = rightEl.getBoundingClientRect().width;
      const combinedWidth = startLeftWidth + startRightWidth;

      const minLeftWidth = 240;
      const minRightWidth = 200;

      const onMouseMove = (moveEvt) => {
        const deltaX = moveEvt.clientX - startX;
        let newLeft = startLeftWidth + deltaX;
        let newRight = startRightWidth - deltaX;

        // Clamp within allowed bounds
        if (newLeft < minLeftWidth) {
          newLeft = minLeftWidth;
          newRight = combinedWidth - newLeft;
        } else if (newRight < minRightWidth) {
          newRight = minRightWidth;
          newLeft = combinedWidth - newRight;
        }

        leftEl.style.flex = 'none';
        rightEl.style.flex = 'none';
        leftEl.style.maxWidth = 'none';
        rightEl.style.maxWidth = 'none';
        leftEl.style.width = `${newLeft}px`;
        rightEl.style.width = `${newRight}px`;

        if (flowCanvas) flowCanvas.render();
      };

      const onMouseUp = () => {
        container.classList.remove('is-resizing');
        splitter.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        if (flowCanvas) flowCanvas.render();
        saveAppSettings();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Double-click splitter to reset panel proportions
    splitter.addEventListener('dblclick', () => {
      resetPanelSizes();
      saveAppSettings();
    });
  };

  // Splitter 1: Canvas to Inspector / Table
  bindDrag(splitterCanvas, () => canvasWrapper, () => {
    if (currentView === 'split') {
      if (isInspectorOpen && inspectorSidebar && !container.classList.contains('inspector-hidden')) {
        return inspectorSidebar;
      }
      return tableViewContainer;
    }
    return inspectorSidebar;
  });

  // Splitter 2: Inspector to Table in Split Mode
  bindDrag(splitterInspector, () => inspectorSidebar, () => tableViewContainer);
}

function openEditTransactionModal(tx) {
  const idEl = document.getElementById('editTxId');
  const dateEl = document.getElementById('editTxDate');
  const amtEl = document.getElementById('editTxAmount');
  const adminEl = document.getElementById('editTxAdminFee');
  const shipEl = document.getElementById('editTxShippingFee');
  const noteEl = document.getElementById('editTxNote');

  if (idEl) idEl.value = tx.id;
  if (dateEl) dateEl.value = tx.date || new Date().toISOString().split('T')[0];
  if (amtEl) amtEl.value = tx.amount || 0;
  if (adminEl) adminEl.value = tx.adminFee || 0;
  if (shipEl) shipEl.value = tx.shippingFee || 0;
  if (noteEl) noteEl.value = tx.note || '';

  openModal('modalEditTransaction');
}

function renderTableHeader() {
  const headerRow = document.getElementById('tableHeaderRow');
  if (!headerRow) return;

  const isLatest = tableSortOrder === 'latest';
  const sortArrow = isLatest ? '▼' : '▲';

  if (!isTableDetailedMode) {
    // Simple Mode (10 cols)
    headerRow.innerHTML = `
      <th style="width: 38px; text-align: center;" title="Rel Timeline Vertikal">TIMELINE</th>
      <th data-i18n="ledger_date" id="thSortDate" style="cursor: pointer; user-select: none;" title="Klik untuk ubah urutan tanggal (Terbaru / Terlama)">
        <span style="display: inline-flex; align-items: center; gap: 4px;">
          Tanggal
          <span id="thDateSortIndicator" style="font-size: 10px; color: #38bdf8;">${sortArrow}</span>
        </span>
      </th>
      <th data-i18n="ledger_type">Jenis</th>
      <th data-i18n="ledger_change">Perubahan</th>
      <th data-i18n="ledger_running">Saldo Berjalan</th>
      <th data-i18n="ledger_from">Dari (Sumber)</th>
      <th data-i18n="ledger_to">Tujuan</th>
      <th>Kantong Terkait</th>
      <th data-i18n="ledger_note">Catatan</th>
      <th data-i18n="ledger_actions" style="text-align: right; position: sticky; right: 0; background: #0f172a; z-index: 3;">Aksi</th>
    `;
  } else {
    // Detailed Mode (13 cols)
    headerRow.innerHTML = `
      <th style="width: 38px; text-align: center;" title="Rel Timeline Vertikal">TIMELINE</th>
      <th data-i18n="ledger_date" id="thSortDate" style="cursor: pointer; user-select: none;" title="Klik untuk ubah urutan tanggal (Terbaru / Terlama)">
        <span style="display: inline-flex; align-items: center; gap: 4px;">
          Tanggal
          <span id="thDateSortIndicator" style="font-size: 10px; color: #38bdf8;">${sortArrow}</span>
        </span>
      </th>
      <th data-i18n="ledger_type">Jenis</th>
      <th title="Nominal Pokok Tanpa Biaya Tambahan">Nominal Pokok</th>
      <th title="Biaya Transfer / Administrasi">Biaya Admin</th>
      <th title="Ongkos Kirim">Ongkos Kirim</th>
      <th title="Total Kas Riil Masuk/Keluar Termasuk Admin & Ongkir">Total Kas</th>
      <th data-i18n="ledger_running">Saldo Berjalan</th>
      <th data-i18n="ledger_from">Dari (Sumber)</th>
      <th data-i18n="ledger_to">Tujuan</th>
      <th>Kantong Terkait</th>
      <th data-i18n="ledger_note">Catatan</th>
      <th data-i18n="ledger_actions" style="text-align: right; position: sticky; right: 0; background: #0f172a; z-index: 3;">Aksi</th>
    `;
  }

  const thSortDate = document.getElementById('thSortDate');
  if (thSortDate) {
    thSortDate.addEventListener('click', () => {
      tableSortOrder = tableSortOrder === 'latest' ? 'oldest' : 'latest';
      const sortOrderIcon = document.getElementById('sortOrderIcon');
      const sortOrderLabel = document.getElementById('sortOrderLabel');
      if (sortOrderIcon) sortOrderIcon.textContent = tableSortOrder === 'latest' ? '⬇️' : '⬆️';
      if (sortOrderLabel) sortOrderLabel.textContent = tableSortOrder === 'latest' ? 'Terbaru Dulu' : 'Terlama Dulu';
      renderTableLedger();
      saveAppSettings();
    });
  }
}

function getTxRunningBalances() {
  const allTxs = [...store.state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const currentTotal = store.getTotalBalance();
  const balances = {};

  let bal = currentTotal;
  for (let i = allTxs.length - 1; i >= 0; i--) {
    const tx = allTxs[i];
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
}

function renderTableLedger() {
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  renderTableHeader();

  let list = [...store.state.transactions];

  // Apply Type Filter
  if (tableFilter !== 'all') {
    list = list.filter(t => t.type === tableFilter);
  }

  // Apply Scope Filter (All vs Filtered Pockets)
  if (scopeFilter === 'filtered' && activePocketFilterIds.size > 0) {
    list = list.filter(t => {
      if (t.type === 'expense') {
        return activePocketFilterIds.has(t.fromId);
      } else if (t.type === 'income') {
        return activePocketFilterIds.has(t.toId);
      } else if (t.type === 'transfer') {
        return activePocketFilterIds.has(t.fromId) || activePocketFilterIds.has(t.toId);
      }
      return false;
    });
  }

  // Apply Search
  if (tableSearchQuery.trim()) {
    list = list.filter(t => 
      (t.note && t.note.toLowerCase().includes(tableSearchQuery)) ||
      (t.fromLabel && t.fromLabel.toLowerCase().includes(tableSearchQuery)) ||
      (t.toLabel && t.toLabel.toLowerCase().includes(tableSearchQuery))
    );
  }

  // Sort chronological based on tableSortOrder ('latest' default | 'oldest')
  if (tableSortOrder === 'oldest') {
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else {
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const colCount = isTableDetailedMode ? 13 : 10;
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" style="text-align: center; padding: 30px; color: var(--text-muted);">
          ${i18n.t('no_transactions')}
        </td>
      </tr>
    `;
    return;
  }

  // Calculate Running Balance per transaction accurately
  const txRunningBalances = getTxRunningBalances();

  const activeTxId = (timelineController && timelineController.transactions && timelineController.currentFrame >= 0)
    ? timelineController.transactions[timelineController.currentFrame]?.id
    : null;

  const getSafeLabel = (id, label) => {
    if (label && label !== 'undefined' && label !== 'null' && label !== '[object Object]' && String(label).trim() !== '') {
      return label;
    }
    const node = store.state.pockets.find(p => p.id === id) ||
                 store.state.incomeSources.find(i => i.id === id) ||
                 store.state.expenseCategories.find(e => e.id === id);
    return node ? node.label : (id || '-');
  };

  list.forEach((tx, idx) => {
    const isFirstRow = idx === 0;
    const isLastRow = idx === list.length - 1;
    const isLatest = tableSortOrder === 'latest' ? isFirstRow : isLastRow;
    const isOldest = tableSortOrder === 'latest' ? isLastRow : isFirstRow;
    const isFrameActive = activeTxId === tx.id;
    const runningBal = txRunningBalances[tx.id] ?? store.getTotalBalance();

    const isInc = tx.type === 'income';
    const isExp = tx.type === 'expense';
    const changeClass = isInc ? 'delta-income' : (isExp ? 'delta-expense' : 'delta-transfer');
    const changeSign = isInc ? '+' : (isExp ? '-' : '⇄ ');

    const fromSafe = getSafeLabel(tx.fromId, tx.fromLabel);
    const toSafe = getSafeLabel(tx.toId, tx.toLabel);
    const assignedPocket = isExp ? fromSafe : (isInc ? toSafe : `${fromSafe} ➔ ${toSafe}`);

    const baseAmount = Number(tx.amount) || 0;
    const adminFee = Number(tx.adminFee) || 0;
    const shippingFee = Number(tx.shippingFee) || 0;
    let totalCash = baseAmount;
    if (isExp) totalCash = baseAmount + adminFee + shippingFee;
    else if (tx.type === 'transfer') totalCash = baseAmount + adminFee;

    const railTitle = isLatest ? `● Keyframe Terbaru (Latest)` : (isOldest ? `● Keyframe Awal (Oldest)` : `● Frame Transaksi`);

    const tr = document.createElement('tr');
    tr.setAttribute('data-tx-id', tx.id);
    tr.setAttribute('data-from-id', tx.fromId);
    tr.setAttribute('data-to-id', tx.toId);
    tr.setAttribute('data-type', tx.type);
    if (isFrameActive) tr.classList.add('row-active-frame');

    if (!isTableDetailedMode) {
      // Simple Mode (10 cols)
      tr.innerHTML = `
        <td class="timeline-rail-cell">
          <div class="timeline-rail-wrapper ${isFirstRow ? 'is-first' : ''} ${isLastRow ? 'is-last' : ''}">
            <div class="timeline-rail-line-top"></div>
            <div class="timeline-rail-dot ${isFrameActive ? 'active' : ''}" data-tx-id="${tx.id}" title="${railTitle}">
              <div class="timeline-rail-dot-core"></div>
            </div>
            <div class="timeline-rail-line-bottom"></div>
          </div>
        </td>
        <td style="font-weight: 600; white-space: nowrap;">${i18n.formatDate(tx.date)}</td>
        <td>
          <span class="badge-tag tag-${tx.type}">${tx.type.toUpperCase()}</span>
        </td>
        <td class="${changeClass}">
          ${changeSign}${i18n.formatCurrency(baseAmount)}
          ${(adminFee || shippingFee) ? `<span style="font-size: 10px; color: #94a3b8; display: block; font-weight: 400;">(${adminFee ? 'Adm: ' + i18n.formatCurrency(adminFee) : ''}${adminFee && shippingFee ? ', ' : ''}${shippingFee ? 'Ongkir: ' + i18n.formatCurrency(shippingFee) : ''})</span>` : ''}
        </td>
        <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #93c5fd;">
          ${i18n.formatCurrency(runningBal)}
        </td>
        <td><span style="color: #cbd5e1; font-weight: 500;">${fromSafe}</span></td>
        <td><span style="color: #cbd5e1; font-weight: 500;">${toSafe}</span></td>
        <td><span class="badge-tag tag-pocket">${assignedPocket}</span></td>
        <td style="color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${tx.note || '-'}
        </td>
        <td class="sticky-action-cell">
          <div style="display: inline-flex; align-items: center; gap: 4px;">
            <button class="btn-action-icon btn-edit-tx" data-id="${tx.id}" title="Edit Transaksi" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #38bdf8; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              ✏️
            </button>
            <button class="btn-action-icon btn-dup-tx" data-id="${tx.id}" title="Duplikasi Transaksi Hari Ini" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #a78bfa; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              📋
            </button>
            <button class="btn-action-icon btn-del-tx" data-id="${tx.id}" title="Hapus Transaksi" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #ef4444; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              🗑️
            </button>
          </div>
        </td>
      `;
    } else {
      // Detailed Mode (13 cols)
      tr.innerHTML = `
        <td class="timeline-rail-cell">
          <div class="timeline-rail-wrapper ${isFirstRow ? 'is-first' : ''} ${isLastRow ? 'is-last' : ''}">
            <div class="timeline-rail-line-top"></div>
            <div class="timeline-rail-dot ${isFrameActive ? 'active' : ''}" data-tx-id="${tx.id}" title="${railTitle}">
              <div class="timeline-rail-dot-core"></div>
            </div>
            <div class="timeline-rail-line-bottom"></div>
          </div>
        </td>
        <td style="font-weight: 600; white-space: nowrap;">${i18n.formatDate(tx.date)}</td>
        <td>
          <span class="badge-tag tag-${tx.type}">${tx.type.toUpperCase()}</span>
        </td>
        <td class="${changeClass}" style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">
          ${changeSign}${i18n.formatCurrency(baseAmount)}
        </td>
        <td style="color: ${adminFee ? '#f59e0b' : '#64748b'}; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
          ${adminFee ? i18n.formatCurrency(adminFee) : '-'}
        </td>
        <td style="color: ${shippingFee ? '#f59e0b' : '#64748b'}; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
          ${shippingFee ? i18n.formatCurrency(shippingFee) : '-'}
        </td>
        <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: ${isInc ? '#34d399' : (isExp ? '#f87171' : '#60a5fa')};">
          ${changeSign}${i18n.formatCurrency(totalCash)}
        </td>
        <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #93c5fd;">
          ${i18n.formatCurrency(runningBal)}
        </td>
        <td><span style="color: #cbd5e1; font-weight: 500;">${fromSafe}</span></td>
        <td><span style="color: #cbd5e1; font-weight: 500;">${toSafe}</span></td>
        <td><span class="badge-tag tag-pocket">${assignedPocket}</span></td>
        <td style="color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${tx.note || '-'}
        </td>
        <td class="sticky-action-cell">
          <div style="display: inline-flex; align-items: center; gap: 4px;">
            <button class="btn-action-icon btn-edit-tx" data-id="${tx.id}" title="Edit Transaksi" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #38bdf8; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              ✏️
            </button>
            <button class="btn-action-icon btn-dup-tx" data-id="${tx.id}" title="Duplikasi Transaksi Hari Ini" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #a78bfa; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              📋
            </button>
            <button class="btn-action-icon btn-del-tx" data-id="${tx.id}" title="Hapus Transaksi" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #ef4444; cursor: pointer; padding: 3px 6px; font-size: 11px;">
              🗑️
            </button>
          </div>
        </td>
      `;
    }

    // Click on timeline rail dot jumps timeline scrubber
    const railDot = tr.querySelector('.timeline-rail-dot');
    if (railDot) {
      railDot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (timelineController && timelineController.transactions) {
          const tIdx = timelineController.transactions.findIndex(t => t.id === tx.id);
          if (tIdx >= 0) {
            timelineController.jumpTo(tIdx, true);
          }
        }
      });
    }

    // Click on row inspects the node
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.sticky-action-cell') || e.target.closest('.timeline-rail-dot')) return;
      const targetNodeId = tx.type === 'expense' ? tx.toId : (tx.type === 'income' ? tx.fromId : tx.toId);
      if (targetNodeId) {
        inspectNode(targetNodeId);
      }
    });

    // Hook Edit
    tr.querySelector('.btn-edit-tx')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditTransactionModal(tx);
    });

    // Hook Duplicate
    tr.querySelector('.btn-dup-tx')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const today = new Date().toISOString().split('T')[0];
      const dupNote = tx.note ? `${tx.note} (Salinan)` : 'Salinan Transaksi';
      await store.addTransaction({
        type: tx.type,
        fromId: tx.fromId,
        fromLabel: fromSafe,
        toId: tx.toId,
        toLabel: toSafe,
        amount: tx.amount,
        adminFee: tx.adminFee || 0,
        shippingFee: tx.shippingFee || 0,
        date: today,
        note: dupNote,
        attachments: tx.attachments ? [...tx.attachments] : []
      });
      showToast('Transaksi berhasil diduplikasi untuk hari ini!');
      renderTableLedger();
      updateKPIs();
      if (flowCanvas) flowCanvas.render();
      if (timelineController) timelineController.refresh();
    });

    // Hook Delete
    tr.querySelector('.btn-del-tx')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('confirm_delete') || 'Apakah Anda yakin ingin menghapus transaksi ini?')) {
        await store.deleteTransaction(tx.id);
        showToast(i18n.t('toast_deleted') || 'Transaksi telah dihapus');
        renderTableLedger();
        updateKPIs();
        if (flowCanvas) flowCanvas.render();
        if (timelineController) timelineController.refresh();
      }
    });

    tbody.appendChild(tr);
  });
}

// 7. View Tabs & Responsive Workspace Layout (Brief v05)
function updateViewLayout(shouldReset = false) {
  const container = document.querySelector('.workspace-container');
  if (!container) return;

  if (shouldReset) {
    resetPanelSizes();
  }

  container.classList.remove('mode-flow', 'mode-table', 'mode-split', 'inspector-hidden');

  if (currentView === 'flow') {
    container.classList.add('mode-flow');
    if (!isInspectorOpen) container.classList.add('inspector-hidden');
    if (flowCanvas) flowCanvas.render();
  } else if (currentView === 'table') {
    container.classList.add('mode-table');
    renderTableLedger();
  } else if (currentView === 'split') {
    container.classList.add('mode-split');
    if (!isInspectorOpen) container.classList.add('inspector-hidden');
    if (flowCanvas) flowCanvas.render();
    renderTableLedger();
  }
}

function initViewTabs() {
  const tabs = document.querySelectorAll('[data-view-tab]');

  tabs.forEach(tab => {
    const tabView = tab.getAttribute('data-view-tab');
    tab.classList.toggle('active', tabView === currentView);

    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.getAttribute('data-view-tab');
      updateViewLayout(true);
      saveAppSettings();
    });
  });

  updateViewLayout(false);
}

function initModeToggle() {
  const modeSelect = document.getElementById('canvasModeSelect');
  const btnSimple = document.getElementById('btnModeSimple');
  const btnIRL = document.getElementById('btnModeIRL');
  const btnBoth = document.getElementById('btnModeBoth');

  const setModeActive = (mode, save = true) => {
    if (modeSelect && modeSelect.value !== mode) {
      modeSelect.value = mode;
    }
    [btnSimple, btnIRL, btnBoth].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (mode === 'simple' && btnSimple) btnSimple.classList.add('active');
    if (mode === 'irl' && btnIRL) btnIRL.classList.add('active');
    if (mode === 'both' && btnBoth) btnBoth.classList.add('active');

    if (flowCanvas) flowCanvas.setMode(mode);
    if (save) saveAppSettings();
  };

  const saved = loadAppSettings();
  if (saved?.canvasMode) {
    setModeActive(saved.canvasMode, false);
  }

  modeSelect?.addEventListener('change', (e) => {
    setModeActive(e.target.value);
  });

  btnSimple?.addEventListener('click', () => setModeActive('simple'));
  btnIRL?.addEventListener('click', () => setModeActive('irl'));
  btnBoth?.addEventListener('click', () => setModeActive('both'));
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

  document.getElementById('formEditTransaction')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editTxId').value;
    const date = document.getElementById('editTxDate').value;
    const amount = document.getElementById('editTxAmount').value;
    const adminFee = document.getElementById('editTxAdminFee').value;
    const shippingFee = document.getElementById('editTxShippingFee').value;
    const note = document.getElementById('editTxNote').value;

    await store.updateTransaction(id, {
      date,
      amount: Number(amount) || 0,
      adminFee: Number(adminFee) || 0,
      shippingFee: Number(shippingFee) || 0,
      note
    });

    closeAllModals();
    showToast('Transaksi berhasil diperbarui!');
    renderTableLedger();
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    if (timelineController) timelineController.refresh();
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
