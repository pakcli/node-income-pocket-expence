import { useState, useEffect } from 'react';
import { accountManager } from '../services/accounts.js';

export function useAccounts() {
  const [activeAccount, setActiveAccount] = useState(() => accountManager.getActiveAccount());
  const [accounts, setAccounts] = useState(() => accountManager.accounts);

  useEffect(() => {
    const handleAccountChange = (e) => {
      setActiveAccount(e.detail);
      setAccounts([...accountManager.accounts]);
    };

    window.addEventListener('accountChanged', handleAccountChange);
    return () => window.removeEventListener('accountChanged', handleAccountChange);
  }, []);

  const switchAccount = (userId) => {
    accountManager.switchAccount(userId);
  };

  const addAccount = (newAcc) => {
    accountManager.addAccount(newAcc);
    setAccounts([...accountManager.accounts]);
  };

  return { activeAccount, accounts, switchAccount, addAccount };
}
