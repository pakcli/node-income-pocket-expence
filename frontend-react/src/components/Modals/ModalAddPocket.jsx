import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';

export function ModalAddPocket({ isOpen, onClose, showToast }) {
  const { addPocket } = useStore();

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#3b82f6');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      showToast('Masukkan nama kantong!');
      return;
    }

    const initBal = parseFloat(initialBalance) || 0;
    const newPocket = {
      id: `pkt_${Date.now()}`,
      label: label.trim(),
      category,
      balance: initBal,
      initialBalance: initBal,
      color: color || '#3b82f6'
    };

    addPocket(newPocket);
    showToast(`Kantong "${label}" berhasil dibuat!`);
    onClose();
  };

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Tambah Kantong / Rekening Baru</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Kantong</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cth: Dompet Harian, Tabungan Jenius, GoPay"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Kantong</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="cash">Dompet Fisik (Cash)</option>
                <option value="bank">Rekening Bank (BCA, Mandiri, BNI, dll)</option>
                <option value="e_wallet">E-Wallet (GoPay, OVO, ShopeePay, Dana)</option>
                <option value="savings">Pos Tabungan / Dana Darurat</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Saldo Awal (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warna Aksen Node</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: 44, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Pilih warna representasi pada canvas diagram</span>
              </div>
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
              Buat Kantong
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
