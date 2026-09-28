// Local Store and Mock Data Engine
// Manages accounts (pockets), income nodes, expense nodes, and transactions with localStorage persistence.

const STORAGE_KEY = 'spm_data_v1';

const DEFAULT_DATA = {
  pockets: [
    { id: 'pkt_cash', label: 'Dompet Fisik (Cash)', category: 'cash', balance: 175000, initialBalance: 50000, color: '#10b981' },
    { id: 'pkt_bca', label: 'Bank BCA', category: 'bank', balance: 1850000, initialBalance: 500000, color: '#3b82f6' },
    { id: 'pkt_gopay', label: 'GoPay / E-Wallet', category: 'e_wallet', balance: 125000, initialBalance: 25000, color: '#8b5cf6' }
  ],
  incomeSources: [
    { id: 'inc_allowance', label: 'Uang Saku Ortu (Mom/Dad)', total: 2000000 },
    { id: 'inc_freelance', label: 'Projek Desain / Freelance', total: 750000 },
    { id: 'inc_campus', label: 'Asisten Lab Kampus', total: 300000 }
  ],
  expenseCategories: [
    { id: 'exp_food', label: 'Makan & Minum Harian', total: 425000, icon: 'utensils' },
    { id: 'exp_transport', label: 'Bensin & Transport', total: 115000, icon: 'car' },
    { id: 'exp_campus', label: 'Fotokopi & Buku Kuliah', total: 85000, icon: 'book' },
    { id: 'exp_internet', label: 'Paket Data & WiFi', total: 100000, icon: 'wifi' },
    { id: 'exp_hangout', label: 'Kopi & Hangout', total: 150000, icon: 'coffee' }
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
      note: 'Transfer bulanan awal bulan dari Ibu'
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
      note: 'Tarik tunai di ATM Indomaret'
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
      note: 'Top up GoPay untuk ongkos ojek'
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
      note: 'Makan siang Nasi Padang + Es Teh'
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
      note: 'Gojek ke kampus pagi'
    },
    {
      id: 'tx_6',
      type: 'income',
      fromId: 'inc_freelance',
      fromLabel: 'Projek Desain / Freelance',
      toId: 'pkt_bca',
      toLabel: 'Bank BCA',
      amount: 750000,
      date: '2026-09-12',
      note: 'Pelunasan desain banner UKM'
    },
    {
      id: 'tx_7',
      type: 'expense',
      fromId: 'pkt_bca',
      fromLabel: 'Bank BCA',
      toId: 'exp_internet',
      toLabel: 'Paket Data & WiFi',
      amount: 100000,
      date: '2026-09-15',
      note: 'Beli kuota Telkomsel 50GB'
    },
    {
      id: 'tx_8',
      type: 'expense',
      fromId: 'pkt_cash',
      fromLabel: 'Dompet Fisik (Cash)',
      toId: 'exp_campus',
      toLabel: 'Fotokopi & Buku Kuliah',
      amount: 85000,
      date: '2026-09-18',
      note: 'Jilid modul praktikum semester'
    },
    {
      id: 'tx_9',
      type: 'expense',
      fromId: 'pkt_gopay',
      fromLabel: 'GoPay / E-Wallet',
      toId: 'exp_hangout',
      toLabel: 'Kopi & Hangout',
      amount: 65000,
      date: '2026-09-22',
      note: 'Kopi Susu Senja + snack tugas bareng'
    }
  ]
};

class Store {
  constructor() {
    this.state = this.loadState();
    this.recalculateBalances();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using default data:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveState() {
    this.recalculateBalances();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
    window.dispatchEvent(new CustomEvent('storeUpdated', { detail: this.state }));
  }

  resetToDefault() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.saveState();
  }

  recalculateBalances() {
    // Reset balances to initial balances
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

    // Replay transactions sorted by date
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

  // Pocket CRUD
  addPocket({ label, category, initialBalance = 0, color }) {
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
    return newPocket;
  }

  // Income Node Helper
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

  // Expense Node Helper
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

  // Add Transaction
  addTransaction({ type, fromId, fromLabel, toId, toLabel, amount, date, note }) {
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
    return tx;
  }

  deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter(t => t.id !== id);
    this.saveState();
  }

  // Aggregation Getters
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
    // Find all transactions touching this node
    const txs = this.state.transactions.filter(t => t.fromId === nodeId || t.toId === nodeId);
    // Sort chronological
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

export const store = new Store();
