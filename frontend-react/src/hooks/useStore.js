import { useState, useEffect } from 'react';
import { store } from '../services/store.js';

export function useStore() {
  const [state, setState] = useState(() => store.state);

  useEffect(() => {
    const handleUpdate = () => {
      setState({ ...store.state });
    };

    window.addEventListener('storeUpdated', handleUpdate);
    return () => window.removeEventListener('storeUpdated', handleUpdate);
  }, []);

  return {
    state,
    store,
    pockets: state.pockets || [],
    incomeSources: state.incomeSources || [],
    expenseCategories: state.expenseCategories || [],
    transactions: state.transactions || [],
    totalBalance: store.getTotalBalance(),
    totalIncome: store.getTotalIncome(),
    totalExpense: store.getTotalExpense(),
    addTransaction: (tx) => store.addTransaction(tx),
    updateTransaction: (id, updates) => store.updateTransaction(id, updates),
    deleteTransaction: (id) => store.deleteTransaction(id),
    addPocket: (pkt) => store.addPocket(pkt),
    updatePocket: (id, updates) => store.updatePocket(id, updates),
    deletePocket: (id) => store.deletePocket(id),
    getNodeLedger: (id) => store.getNodeLedger(id),
    getNodeAttachments: (id) => store.getNodeAttachments(id)
  };
}
