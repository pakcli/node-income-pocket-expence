// Master Application Coordinator (Brief v04)
import { i18n } from './i18n.js?v=04.2';
import { store } from './store.js?v=04.2';
import { accountManager } from './accounts.js?v=04.2';
import { FlowCanvas } from './flow.js?v=04.2';
import { TimelineController } from './timeline.js?v=04.2';

let flowCanvas = null;
let timelineController = null;
let currentView = 'flow'; // 'flow' | 'table' | 'split'
let tableFilter = 'all'; // 'all' | 'income' | 'expense' | 'transfer'
let tableSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initFlowCanvas();
  initUserSwitcher();
  initKPIs();
  initModals();
  initInspector();
  initTableLedger();
  initViewTabs();
  initModeToggle();
  initExportMenu();

  // Listen to store updates
  window.addEventListener('storeUpdated', () => {
    updateKPIs();
    if (flowCanvas) flowCanvas.render();
    if (timelineController) timelineController.refresh();
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
    if (timelineController) timelineController.refresh();
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

// 2. Flow Canvas & Timeline Initialization
function initFlowCanvas() {
  const container = document.getElementById('flowViewport');
  if (!container) return;

  flowCanvas = new FlowCanvas('flowViewport', (nodeId) => {
    inspectNode(nodeId);
  });
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

// 5. Node Inspector & Strict Panel Editing
function initInspector() {
  const btnAdd = document.getElementById('btnPanelAddNode');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      renderPanelCreateNodeForm();
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
  const btnBoth = document.getElementById('btnModeBoth');

  const setModeActive = (mode) => {
    [btnSimple, btnIRL, btnBoth].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (mode === 'simple' && btnSimple) btnSimple.classList.add('active');
    if (mode === 'irl' && btnIRL) btnIRL.classList.add('active');
    if (mode === 'both' && btnBoth) btnBoth.classList.add('active');

    if (flowCanvas) flowCanvas.setMode(mode);
  };

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
