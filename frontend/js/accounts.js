// Multi-Saved-Account Switcher (Brief v04 Section 2.2)
// Enables 1-click switching between Student, Dad, Mom, or other family profiles without re-login

const ACCOUNTS_STORAGE_KEY = 'spm_saved_accounts_v1';
const ACTIVE_USER_KEY = 'spm_active_user_id';

const DEFAULT_ACCOUNTS = [
  {
    userId: 'usr_student_1',
    email: 'budi.pratama@student.id',
    displayName: 'Budi Pratama',
    role: 'student',
    avatarInitials: 'BP',
    avatarBg: 'linear-gradient(135deg, #10b981, #059669)',
    sessionToken: 'tok_mock_student_123',
    lastActive: Date.now()
  },
  {
    userId: 'usr_parent_dad',
    email: 'hendra.pratama@gmail.com',
    displayName: 'Hendra Pratama (Ayah)',
    role: 'parent',
    avatarInitials: 'HP',
    avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    sessionToken: 'tok_mock_dad_456',
    lastActive: Date.now() - 3600000
  },
  {
    userId: 'usr_parent_mom',
    email: 'dewi.pratama@gmail.com',
    displayName: 'Dewi Pratama (Ibu)',
    role: 'parent',
    avatarInitials: 'DP',
    avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
    sessionToken: 'tok_mock_mom_789',
    lastActive: Date.now() - 7200000
  }
];

class AccountManager {
  constructor() {
    this.accounts = this.loadAccounts();
    this.activeUserId = localStorage.getItem(ACTIVE_USER_KEY) || this.accounts[0].userId;
  }

  loadAccounts() {
    try {
      const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load saved accounts from storage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }

  saveAccounts() {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
      localStorage.setItem(ACTIVE_USER_KEY, this.activeUserId);
    } catch (e) {
      console.warn('Could not save accounts:', e);
    }
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: this.getActiveAccount() }));
  }

  getActiveAccount() {
    const acc = this.accounts.find(a => a.userId === this.activeUserId);
    return acc || this.accounts[0];
  }

  switchAccount(userId) {
    const target = this.accounts.find(a => a.userId === userId);
    if (!target) return;
    this.activeUserId = userId;
    target.lastActive = Date.now();
    this.saveAccounts();
  }

  addAccount({ displayName, email, role }) {
    const userId = 'usr_' + Date.now();
    const initials = displayName
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const newAcc = {
      userId,
      email: email || `${displayName.toLowerCase().replace(/\s+/g, '.')}@family.id`,
      displayName,
      role: role || 'student',
      avatarInitials: initials,
      avatarBg: role === 'parent' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)',
      sessionToken: 'tok_' + Math.random().toString(36).substring(2),
      lastActive: Date.now()
    };

    this.accounts.push(newAcc);
    this.activeUserId = userId;
    this.saveAccounts();
    return newAcc;
  }

  removeAccount(userId) {
    if (this.accounts.length <= 1) return;
    this.accounts = this.accounts.filter(a => a.userId !== userId);
    if (this.activeUserId === userId) {
      this.activeUserId = this.accounts[0].userId;
    }
    this.saveAccounts();
  }
}

export const accountManager = new AccountManager();
