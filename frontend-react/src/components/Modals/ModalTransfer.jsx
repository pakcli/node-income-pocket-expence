import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';

export function ModalTransfer({ isOpen, onClose, showToast }) {
  const { pockets, addTransaction } = useStore();

  const [fromAccount, setFromAccount] = useState(() => pockets[0]?.id || '');
  const [toAccount, setToAccount] = useState(() => pockets[1]?.id || pockets[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [adminFee, setAdminFee] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Masukkan nominal transfer yang valid!');
      return;
    }

    if (fromAccount === toAccount) {
      showToast('Kantong asal dan tujuan tidak boleh sama!');
      return;
    }

    const fromPkt = pockets.find(p => p.id === fromAccount) || pockets[0];
    const toPkt = pockets.find(p => p.id === toAccount) || pockets[1];

    addTransaction({
      type: 'transfer',
      fromId: fromPkt.id,
      fromLabel: fromPkt.label,
      toId: toPkt.id,
      toLabel: toPkt.label,
      amount: numAmount,
      adminFee: parseFloat(adminFee) || 0,
      shippingFee: 0,
      date: date || new Date().toISOString().split('T')[0],
      note: note.trim() || 'Transfer Antar Kantong'
    });

    showToast('Transfer antar kantong berhasil dicatat!');
    onClose();
  };

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Pindah Saldo (Transfer)</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Dari Kantong Asal</label>
              <select
                className="form-select"
                required
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
              >
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} (Saldo: Rp {p.balance?.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ke Kantong Tujuan</label>
              <select
                className="form-select"
                required
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
              >
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} (Saldo: Rp {p.balance?.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nominal Transfer (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Cth: 100000"
                min="1000"
                step="500"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Biaya Admin Transfer (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                value={adminFee}
                onChange={(e) => setAdminFee(e.target.value)}
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
            <button type="submit" className="btn-action btn-transfer">
              Lakukan Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
