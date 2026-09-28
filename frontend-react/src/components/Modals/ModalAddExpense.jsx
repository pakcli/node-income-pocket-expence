import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';

export function ModalAddExpense({ isOpen, onClose, showToast }) {
  const { pockets, expenseCategories, store, addTransaction } = useStore();

  const [categoryName, setCategoryName] = useState('');
  const [sourceAccount, setSourceAccount] = useState(() => pockets[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [adminFee, setAdminFee] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
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

    const cat = store.getOrCreateExpenseCategory(categoryName.trim() || 'Pengeluaran');
    const pkt = pockets.find(p => p.id === sourceAccount) || pockets[0];

    addTransaction({
      type: 'expense',
      fromId: pkt ? pkt.id : sourceAccount,
      fromLabel: pkt ? pkt.label : 'Kantong',
      toId: cat.id,
      toLabel: cat.label,
      amount: numAmount,
      adminFee: parseFloat(adminFee) || 0,
      shippingFee: parseFloat(shippingFee) || 0,
      date: date || new Date().toISOString().split('T')[0],
      note: note.trim() || 'Pengeluaran'
    });

    showToast('Transaksi pengeluaran berhasil dicatat!');
    onClose();
  };

  const totalKas = (Number(amount) || 0) + (Number(adminFee) || 0) + (Number(shippingFee) || 0);

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Catat Pengeluaran Baru</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Pos Pengeluaran</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cth: Makanan, Transport, Modul Kuliah, Kopi"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bayar dari Kantong</label>
              <select
                className="form-select"
                required
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
              >
                {pockets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} (Saldo: Rp {p.balance?.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nominal Pokok (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Cth: 25000"
                min="500"
                step="500"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Admin and shipping fees */}
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
              Total Kas Terpotong: Rp {totalKas.toLocaleString('id-ID')}
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
            <button type="submit" className="btn-action btn-expense">
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
