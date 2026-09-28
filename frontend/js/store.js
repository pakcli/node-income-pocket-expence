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
      date: '2026-09-01',
      note: 'Transfer bulanan awal bulan'
    },
    {
      id: 'tx_2',
      type: 'transfer',
      fromId: 'pkt_bca',
      fromLabel: 'Bank BCA',
      toId: 'pkt_cash',
      toLabel: 'Dompet Fisik (Cash)',
      amount: 300000,
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
      date: '2026-09-03',
      note: 'Top up GoPay'
    },
    {
      id: 'tx_4',
      type: 'expense',
      fromId: 'pkt_cash',
      fromLabel: 'Dompet Fisik (Cash)',
      toId: 'exp_food',
      toLabel: 'Makan & Minum Harian',
      amount: 45000,
      date: '2026-09-04',
      note: 'Makan siang Nasi Padang'
    },
    {
      id: 'tx_5',
      type: 'expense',
      fromId: 'pkt_gopay',
      fromLabel: 'GoPay / E-Wallet',
      toId: 'exp_transport',
      toLabel: 'Bensin & Transport',
      amount: 35000,
      date: '2026-09-05',
      note: 'Gojek ke kampus'
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
      if (tx.type === 'income') {
        const inc = this.state.incomeSources.find(i => i.id === tx.fromId);
        if (inc) inc.total += amt;
        const pkt = this.state.pockets.find(p => p.id === tx.toId);
        if (pkt) {
          pkt.inflow += amt;
          pkt.balance += amt;
        }
      } else if (tx.type === 'expense') {
        const pkt = this.state.pockets.find(p => p.id === tx.fromId);
        if (pkt) {
          pkt.outflow += amt;
          pkt.balance -= amt;
        }
        const exp = this.state.expenseCategories.find(e => e.id === tx.toId);
        if (exp) exp.total += amt;
      } else if (tx.type === 'transfer') {
        const fromPkt = this.state.pockets.find(p => p.id === tx.fromId);
        const toPkt = this.state.pockets.find(p => p.id === tx.toId);
        if (fromPkt) {
          fromPkt.outflow += amt;
          fromPkt.balance -= amt;
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

  async addTransaction({ type, fromId, fromLabel, toId, toLabel, amount, date, note }) {
    const tx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type,
      fromId,
      fromLabel,
      toId,
      toLabel,
      amount: Number(amount) || 0,
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
}

export const store = new Store();
