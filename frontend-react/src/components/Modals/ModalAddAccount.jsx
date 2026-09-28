import React, { useState } from 'react';
import { useAccounts } from '../../hooks/useAccounts.js';

export function ModalAddAccount({ isOpen, onClose, showToast }) {
  const { addAccount } = useAccounts();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      showToast('Lengkapi semua data profil!');
      return;
    }

    const initials = displayName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
    const bgGradients = {
      student: 'linear-gradient(135deg, #10b981, #059669)',
      parent: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      mentor: 'linear-gradient(135deg, #f59e0b, #d97706)'
    };

    const newAcc = {
      userId: `usr_${Date.now()}`,
      displayName: displayName.trim(),
      email: email.trim(),
      role,
      avatarInitials: initials,
      avatarBg: bgGradients[role] || 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      lastActive: Date.now()
    };

    addAccount(newAcc);
    showToast(`Profil "${displayName}" berhasil ditambahkan!`);
    onClose();
  };

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Tambah Profil Akun Baru</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cth: Siti Rahma (Ibu), Kak Dimas"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="nama@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Peran (Role)</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Mahasiswa / Pelajar (Student)</option>
                <option value="parent">Orang Tua / Wali (Parent)</option>
                <option value="mentor">Mentor / Wali Dosen</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn-action"
              style={{ background: '#334155', color: 'white' }}
              onClick={onClose}
            >
              Batal
            </button>
            <button type="submit" className="btn-action btn-account">
              Tambah Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
