import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';

export function ModalAddIncome({ isOpen, onClose, showToast }) {
  const { pockets, store, addTransaction } = useStore();

  const [sourceName, setSourceName] = useState('');
  const [destAccount, setDestAccount] = useState(() => pockets[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Masukkan nominal yang valid!');
      return;
    }

    const source = store.getOrCreateIncomeSource(sourceName.trim() || 'Pemasukan');
    const pkt = pockets.find(p => p.id === destAccount) || pockets[0];

    addTransaction({
      type: 'income',
      fromId: source.id,
      fromLabel: source.label,
      toId: pkt ? pkt.id : destAccount,
      toLabel: pkt ? pkt.label : 'Kantong',
      amount: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      note: note.trim() || 'Pemasukan'
    });

    showToast('Transaksi pemasukan berhasil dicatat!');
    onClose();
  };

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Catat Pemasukan Baru</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Sumber Pemasukan</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cth: Uang Saku Ortu, Gaji Freelance, Beasiswa"
                required
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Masuk ke Kantong Mana</label>
              <select
                className="form-select"
                required
                value={destAccount}
                onChange={(e) => setDestAccount(e.target.value)}
              >
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} (Saldo: Rp {p.balance?.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nominal (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Cth: 500000"
                min="1000"
                step="500"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input
                type="date"
                className="form-input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Catatan Tambahan</label>
              <input
                type="text"
                className="form-input"
                placeholder="Keterangan opsional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
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
            <button type="submit" className="btn-action btn-income">
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
