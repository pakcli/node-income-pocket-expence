// Local-First + Backend Synced Store Engine (Brief v04)
import { accountManager } from './accounts.js';

const STORAGE_KEY = 'spm_data_v1';

const DEFAULT_DATA = {
  pockets: [
    { id: 'pkt_cash', label: 'Dompet Fisik (Cash)', category: 'cash', balance: 175000, initialBalance: 50000, color: '#10b981' },
    { id: 'pkt_bca', label: 'Bank BCA', category: 'bank', balance: 1850000, initialBalance: 500000, color: '#3b82f6' },
    { id: 'pkt_gopay', label: 'GoPay / E-Wallet', category: 'e_wallet', balance: 125000, initialBalance: 25000, color: '#8b5cf6' }
  ],
  incomeSources: [
    { id: 'inc_allowance', label: 'Uang Saku Ortu (Mom/Dad)', total: 2000000 },
    { id: 'inc_freelance', label: 'Projek Desain / Freelance', total: 750000 }
  ],
  expenseCategories: [
    { id: 'exp_food', label: 'Makan & Minum Harian', total: 425000 },
    { id: 'exp_transport', label: 'Bensin & Transport', total: 115000 },
    { id: 'exp_campus', label: 'Fotokopi & Buku Kuliah', total: 85000 }
  ],
  transactions: [
    {
      id: 'tx_1',
      type: 'income',
      fromId: 'inc_allowance',
      fromLabel: 'Uang Saku Ortu (Mom/Dad)',
      toId: 'pkt_bca',
      toLabel: 'Bank BCA',
      amount: 2000000,
      adminFee: 0,
      shippingFee: 0,
      date: '2026-09-01',
      note: 'Transfer bulanan awal bulan',
      attachments: [
        {
          id: 'att_1',
          name: 'Bukti_Transfer_Ortu.pdf',
          type: 'application/pdf',
          size: '148 KB',
          date: '2026-09-01'
        }
      ]
    },
    {
      id: 'tx_2',
      type: 'transfer',
      fromId: 'pkt_bca',
      fromLabel: 'Bank BCA',
      toId: 'pkt_cash',
      toLabel: 'Dompet Fisik (Cash)',
      amount: 300000,
      adminFee: 0,
      shippingFee: 0,
      date: '2026-09-02',
      note: 'Tarik tunai ATM'
    },
    {
      id: 'tx_3',
      type: 'transfer',
      fromId: 'pkt_bca',
      fromLabel: 'Bank BCA',
      toId: 'pkt_gopay',
      toLabel: 'GoPay / E-Wallet',
      amount: 200000,
      adminFee: 1000,
      shippingFee: 0,
      date: '2026-09-03',
      note: 'Top up GoPay (Admin Rp 1.000)',
      attachments: [
        {
          id: 'att_3',
          name: 'Bukti_TopUp_BCA_GoPay.pdf',
          type: 'application/pdf',
          size: '182 KB',
          date: '2026-09-03'
        }
      ]
    },
    {
      id: 'tx_4',
      type: 'expense',
      fromId: 'pkt_cash',
      fromLabel: 'Dompet Fisik (Cash)',
      toId: 'exp_food',
      toLabel: 'Makan & Minum Harian',
      amount: 45000,
      adminFee: 0,
      shippingFee: 0,
      date: '2026-09-04',
      note: 'Makan siang Nasi Padang',
      attachments: [
        {
          id: 'att_4',
          name: 'Struk_Makan_Padang.jpg',
          type: 'image/jpeg',
          size: '225 KB',
          date: '2026-09-04'
        }
      ]
    },
    {
      id: 'tx_5',
      type: 'expense',
      fromId: 'pkt_gopay',
      fromLabel: 'GoPay / E-Wallet',
      toId: 'exp_transport',
      toLabel: 'Bensin & Transport',
      amount: 25000,
      adminFee: 2000,
      shippingFee: 8000,
      date: '2026-09-05',
      note: 'Gojek ke kampus (Tarif + Ongkir + Jasa Aplikasi)',
      attachments: [
        {
          id: 'att_5',
          name: 'E-Receipt_Gojek.png',
          type: 'image/png',
          size: '135 KB',
          date: '2026-09-05'
        }
      ]
    }
  ]
};

class Store {
  constructor() {
    this.state = this.loadState();
    this.recalculateBalances();

    // Re-sync when active account changes
    window.addEventListener('accountChanged', () => {
      this.syncWithBackend();
    });

    this.syncWithBackend();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveState() {
    this.recalculateBalances();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Local storage write error:', e);
    }
    window.dispatchEvent(new CustomEvent('storeUpdated', { detail: this.state }));
  }

  recalculateBalances() {
    this.state.pockets.forEach(pkt => {
      pkt.inflow = 0;
      pkt.outflow = 0;
      pkt.balance = pkt.initialBalance || 0;
    });

    this.state.incomeSources.forEach(inc => {
      inc.total = 0;
    });

    this.state.expenseCategories.forEach(exp => {
      exp.total = 0;
    });

    const sorted = [...this.state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const adminFee = Number(tx.adminFee) || 0;
      const shippingFee = Number(tx.shippingFee) || 0;

      if (tx.type === 'income') {
        const inc = this.state.incomeSources.find(i => i.id === tx.fromId);
        if (inc) inc.total += amt;
        const pkt = this.state.pockets.find(p => p.id === tx.toId);
        if (pkt) {
          pkt.inflow += amt;
          pkt.balance += amt;
        }
      } else if (tx.type === 'expense') {
        const totalExp = amt + adminFee + shippingFee;
        const pkt = this.state.pockets.find(p => p.id === tx.fromId);
        if (pkt) {
          pkt.outflow += totalExp;
          pkt.balance -= totalExp;
        }
        const exp = this.state.expenseCategories.find(e => e.id === tx.toId);
        if (exp) exp.total += totalExp;
      } else if (tx.type === 'transfer') {
        const fromPkt = this.state.pockets.find(p => p.id === tx.fromId);
        const toPkt = this.state.pockets.find(p => p.id === tx.toId);
        if (fromPkt) {
          fromPkt.outflow += (amt + adminFee);
          fromPkt.balance -= (amt + adminFee);
        }
        if (toPkt) {
          toPkt.inflow += amt;
          toPkt.balance += amt;
        }
      }
    });
  }

  async syncWithBackend() {
    const headers = accountManager.getAuthHeader();
    if (!headers.Authorization) return;

    try {
      const [resNodes, resTxs] = await Promise.all([
        fetch('/api/nodes', { headers }),
        fetch('/api/transactions', { headers })
      ]);

      if (resNodes.ok && resTxs.ok) {
        const dataNodes = await resNodes.json();
        const dataTxs = await resTxs.json();

        if (dataNodes.pockets && dataNodes.pockets.length > 0) {
          this.state.pockets = dataNodes.pockets;
        }
        if (dataNodes.incomeSources && dataNodes.incomeSources.length > 0) {
          this.state.incomeSources = dataNodes.incomeSources;
        }
        if (dataNodes.expenseCategories && dataNodes.expenseCategories.length > 0) {
          this.state.expenseCategories = dataNodes.expenseCategories;
        }
        if (dataTxs.transactions) {
          this.state.transactions = dataTxs.transactions;
        }

        this.saveState();
      }
    } catch (e) {
      console.log('Backend sync bypassed (offline / static mode active)');
    }
  }

  async addPocket({ label, category, initialBalance = 0, color }) {
    const id = 'pkt_' + Date.now();
    const newPocket = {
      id,
      label,
      category: category || 'cash',
      initialBalance: Number(initialBalance) || 0,
      balance: Number(initialBalance) || 0,
      color: color || '#3b82f6',
      inflow: 0,
      outflow: 0
    };
    this.state.pockets.push(newPocket);
    this.saveState();

    // Sync to backend if online
    try {
      const headers = { 'Content-Type': 'application/json', ...accountManager.getAuthHeader() };
      await fetch('/api/nodes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ label, type: 'account', accountCategory: category, initialBalance, color })
      });
    } catch (e) {}

    return newPocket;
  }

  getOrCreateIncomeSource(label) {
    let source = this.state.incomeSources.find(i => i.label.toLowerCase() === label.trim().toLowerCase());
    if (!source) {
      source = {
        id: 'inc_' + Date.now(),
        label: label.trim(),
        total: 0
      };
      this.state.incomeSources.push(source);
    }
    return source;
  }

  getOrCreateExpenseCategory(label) {
    let cat = this.state.expenseCategories.find(e => e.label.toLowerCase() === label.trim().toLowerCase());
    if (!cat) {
      cat = {
        id: 'exp_' + Date.now(),
        label: label.trim(),
        total: 0
      };
      this.state.expenseCategories.push(cat);
    }
    return cat;
  }

  async addTransaction({ type, fromId, fromLabel, toId, toLabel, amount, date, note, adminFee = 0, shippingFee = 0, attachments = [] }) {
    const tx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type,
      fromId,
      fromLabel,
      toId,
      toLabel,
      amount: Number(amount) || 0,
      adminFee: Number(adminFee) || 0,
      shippingFee: Number(shippingFee) || 0,
      attachments: Array.isArray(attachments) ? attachments : [],
      date: date || new Date().toISOString().split('T')[0],
      note: note || ''
    };
    this.state.transactions.push(tx);
    this.saveState();

    // Sync to backend if online
    try {
      const headers = { 'Content-Type': 'application/json', ...accountManager.getAuthHeader() };
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, fromId, fromLabel, toId, toLabel, amount, date, note })
      });
      if (res.ok) {
        const data = await res.json();
        tx.id = data.transaction.id;
      }
    } catch (e) {}

    return tx;
  }

  getNodeAttachments(nodeId) {
    const txs = this.getNodeLedger(nodeId);
    const list = [];
    txs.forEach(t => {
      if (Array.isArray(t.attachments)) {
        t.attachments.forEach(att => {
          list.push({
            ...att,
            txId: t.id,
            txNote: t.note,
            txAmount: t.amount,
            txDate: t.date,
            txType: t.type
          });
        });
      }
    });
    return list;
  }

  async addAttachmentToNode(nodeId, attachment) {
    const txs = this.getNodeLedger(nodeId);
    if (txs.length > 0) {
      const targetTx = txs[0];
      if (!Array.isArray(targetTx.attachments)) targetTx.attachments = [];
      targetTx.attachments.push(attachment);
      this.saveState();
      return targetTx;
    } else {
      const node = this.state.pockets.find(p => p.id === nodeId)
        || this.state.incomeSources.find(i => i.id === nodeId)
        || this.state.expenseCategories.find(e => e.id === nodeId);
      const isPocket = this.state.pockets.some(p => p.id === nodeId);
      const isInc = this.state.incomeSources.some(i => i.id === nodeId);
      const tx = await this.addTransaction({
        type: isPocket ? 'transfer' : (isInc ? 'income' : 'expense'),
        fromId: nodeId,
        fromLabel: node ? node.label : 'Node',
        toId: nodeId,
        toLabel: node ? node.label : 'Node',
        amount: 0,
        note: `Lampiran: ${attachment.name}`,
        attachments: [attachment]
      });
      return tx;
    }
  }

  async deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter(t => t.id !== id);
    this.saveState();

    try {
      const headers = accountManager.getAuthHeader();
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {}
  }

  async addNode({ type, label, category, initialBalance = 0, color }) {
    const id = (type === 'account' ? 'pkt_' : (type === 'income' ? 'inc_' : 'exp_')) + Date.now();
    const balance = Number(initialBalance) || 0;

    if (type === 'account') {
      this.state.pockets.push({
        id,
        label,
        category: category || 'cash',
        initialBalance: balance,
        balance,
        color: color || '#3b82f6',
        inflow: 0,
        outflow: 0
      });
    } else if (type === 'income') {
      this.state.incomeSources.push({
        id,
        label,
        total: 0
      });
    } else if (type === 'expense') {
      this.state.expenseCategories.push({
        id,
        label,
        total: 0
      });
    }

    this.saveState();

    try {
      const headers = { 'Content-Type': 'application/json', ...accountManager.getAuthHeader() };
      await fetch('/api/nodes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ label, type, accountCategory: category, initialBalance: balance, color })
      });
    } catch (e) {}

    return id;
  }

  async updateNode(id, { label, category, color }) {
    let found = false;

    // Search pockets
    const pkt = this.state.pockets.find(p => p.id === id);
    if (pkt) {
      if (label) pkt.label = label;
      if (category) pkt.category = category;
      if (color) pkt.color = color;
      found = true;
    }

    // Search incomes
    const inc = this.state.incomeSources.find(i => i.id === id);
    if (inc) {
      if (label) inc.label = label;
      found = true;
    }

    // Search expenses
    const exp = this.state.expenseCategories.find(e => e.id === id);
    if (exp) {
      if (label) exp.label = label;
      found = true;
    }

    if (found) {
      // Also update labels in transactions
      if (label) {
        this.state.transactions.forEach(t => {
          if (t.fromId === id) t.fromLabel = label;
          if (t.toId === id) t.toLabel = label;
        });
      }
      this.saveState();

      try {
        const headers = { 'Content-Type': 'application/json', ...accountManager.getAuthHeader() };
        await fetch(`/api/nodes/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ label, accountCategory: category, color })
        });
      } catch (e) {}
    }
  }

  async deleteNode(id) {
    this.state.pockets = this.state.pockets.filter(p => p.id !== id);
    this.state.incomeSources = this.state.incomeSources.filter(i => i.id !== id);
    this.state.expenseCategories = this.state.expenseCategories.filter(e => e.id !== id);

    // Remove transactions attached to this node
    this.state.transactions = this.state.transactions.filter(t => t.fromId !== id && t.toId !== id);

    this.saveState();

    try {
      const headers = accountManager.getAuthHeader();
      await fetch(`/api/nodes/${id}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {}
  }

  async updateTransactionNote(txId, newNote) {
    const tx = this.state.transactions.find(t => t.id === txId);
    if (tx) {
      tx.note = newNote;
      this.saveState();

      try {
        const headers = { 'Content-Type': 'application/json', ...accountManager.getAuthHeader() };
        await fetch(`/api/transactions/${txId}/note`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ note: newNote })
        });
      } catch (e) {}
    }
  }

  getTotalBalance() {
    return this.state.pockets.reduce((sum, p) => sum + (p.balance || 0), 0);
  }

  getTotalIncome() {
    return this.state.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getTotalExpense() {
    return this.state.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getNodeLedger(nodeId) {
    const txs = this.state.transactions.filter(t => t.fromId === nodeId || t.toId === nodeId);
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  subscribe(callback) {
    const handler = (e) => callback(e.detail || this.state);
    window.addEventListener('storeUpdated', handler);
    return () => window.removeEventListener('storeUpdated', handler);
  }
}

export const store = new Store();
