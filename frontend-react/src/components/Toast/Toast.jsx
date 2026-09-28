import React from 'react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div id="toastNotification" className={`toast-notification ${toast ? 'show' : ''}`}>
      <span className="toast-icon">ℹ️</span>
      <span id="toastMessage">{toast}</span>
      <button 
        type="button" 
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: 8 }}
      >
        ✕
      </button>
    </div>
  );
}
