// Multi-Saved-Account Switcher (Brief v04 Section 2.2)
// Enables 1-click switching between Student, Dad, Mom, or other family profiles

const ACCOUNTS_STORAGE_KEY = 'spm_saved_accounts_v1';
const ACTIVE_USER_KEY = 'spm_active_user_id';
const ACTIVE_TOKEN_KEY = 'spm_auth_token';

const DEFAULT_ACCOUNTS = [
  {
    userId: 'usr_student_1',
    email: 'budi.pratama@student.id',
    displayName: 'Budi Pratama',
    role: 'student',
    avatarInitials: 'BP',
    avatarBg: 'linear-gradient(135deg, #10b981, #059669)',
    sessionToken: '',
    lastActive: Date.now()
  },
  {
    userId: 'usr_parent_dad',
    email: 'hendra.pratama@gmail.com',
    displayName: 'Hendra Pratama (Ayah)',
    role: 'parent',
    avatarInitials: 'HP',
    avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    sessionToken: '',
    lastActive: Date.now() - 3600000
  },
  {
    userId: 'usr_parent_mom',
    email: 'dewi.pratama@gmail.com',
    displayName: 'Dewi Pratama (Ibu)',
    role: 'parent',
    avatarInitials: 'DP',
    avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
    sessionToken: '',
    lastActive: Date.now() - 7200000
  }
];

class AccountManager {
  constructor() {
    this.accounts = this.loadAccounts();
    this.activeUserId = localStorage.getItem(ACTIVE_USER_KEY) || this.accounts[0].userId;
    this.token = localStorage.getItem(ACTIVE_TOKEN_KEY) || '';
    this.syncWithBackend();
  }

  loadAccounts() {
    try {
      const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load accounts from storage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }

  saveAccounts() {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
      localStorage.setItem(ACTIVE_USER_KEY, this.activeUserId);
      if (this.token) {
        localStorage.setItem(ACTIVE_TOKEN_KEY, this.token);
      }
    } catch (e) {
      console.warn('Could not save accounts:', e);
    }
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: this.getActiveAccount() }));
  }

  getActiveAccount() {
    const acc = this.accounts.find(a => a.userId === this.activeUserId);
    return acc || this.accounts[0];
  }

  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  async syncWithBackend() {
    try {
      const res = await fetch('/api/auth/saved-accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          const merged = data.accounts.map(u => {
            const initials = u.displayName
              .split(' ')
              .map(w => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            const existing = this.accounts.find(a => a.userId === u.userId);
            return {
              userId: u.userId,
              email: u.email,
              displayName: u.displayName,
              role: u.role,
              avatarInitials: initials || 'U',
              avatarBg: u.role === 'parent' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)',
              sessionToken: existing ? existing.sessionToken : '',
              lastActive: existing ? existing.lastActive : Date.now()
            };
          });

          this.accounts = merged;
          this.saveAccounts();
        }
      }

      // If no token or token expired, auto-switch to active profile to fetch token
      if (!this.token) {
        await this.switchAccount(this.activeUserId);
      }
    } catch (e) {
      // Backend might be offline (pure static mode)
      console.log('Running in local static mode or backend connecting...');
    }
  }

  async switchAccount(userId) {
    const target = this.accounts.find(a => a.userId === userId);
    if (!target) return;
    this.activeUserId = userId;
    target.lastActive = Date.now();

    // Call backend switch-account if available
    try {
      const res = await fetch('/api/auth/switch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const data = await res.json();
        this.token = data.token;
      }
    } catch (e) {
      console.log('Backend switch not reachable, using offline switch.');
    }

    this.saveAccounts();
  }

  async addAccount({ displayName, email, role }) {
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
      sessionToken: '',
      lastActive: Date.now()
    };

    // Try creating on backend
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email: newAcc.email,
          password: 'pass_' + Math.random().toString(36).substring(2),
          role
        })
      });
      if (res.ok) {
        const data = await res.json();
        newAcc.userId = data.user.id;
        this.token = data.token;
      }
    } catch (e) {
      console.log('Offline account addition.');
    }

    this.accounts.push(newAcc);
    this.activeUserId = newAcc.userId;
    this.saveAccounts();
    return newAcc;
  }
}

export const accountManager = new AccountManager();
