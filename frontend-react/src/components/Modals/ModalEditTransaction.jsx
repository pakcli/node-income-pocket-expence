import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore.js';

export function ModalEditTransaction({ transaction, isOpen, onClose, showToast }) {
  const { updateTransaction } = useStore();

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [adminFee, setAdminFee] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setAmount(transaction.amount || '');
      setAdminFee(transaction.adminFee || 0);
      setShippingFee(transaction.shippingFee || 0);
      setNote(transaction.note || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Masukkan nominal yang valid!');
      return;
    }

    updateTransaction(transaction.id, {
      date,
      amount: numAmount,
      adminFee: parseFloat(adminFee) || 0,
      shippingFee: parseFloat(shippingFee) || 0,
      note: note.trim()
    });

    showToast('Transaksi berhasil diperbarui!');
    onClose();
  };

  const totalKas = (Number(amount) || 0) + (Number(adminFee) || 0) + (Number(shippingFee) || 0);

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Transaksi</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span>ID: <strong style={{ color: '#cbd5e1' }}>{transaction.id}</strong></span>
              <span className={`badge-tag tag-${transaction.type}`}>{transaction.type?.toUpperCase()}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal Transaksi</label>
              <input
                type="date"
                className="form-input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nominal Pokok (Rp)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Biaya Admin (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={adminFee}
                  onChange={(e) => setAdminFee(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Ongkos Kirim (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 12, background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: 4 }}>
              Total Kas Terhitung: Rp {totalKas.toLocaleString('id-ID')}
            </div>

            <div className="form-group">
              <label className="form-label">Catatan / Deskripsi</label>
              <input
                type="text"
                className="form-input"
                placeholder="Catatan transaksi..."
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
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
