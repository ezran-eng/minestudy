import React from 'react';

const ConfirmModal = ({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, dangerous = false }) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}
  >
    <div style={{
      background: 'var(--s1)', borderRadius: '16px',
      padding: '22px 20px', width: '100%', maxWidth: '320px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '20px' }}>
        {message}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600,
            background: 'var(--s2)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
          }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '11px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600,
            background: dangerous ? '#c0392b' : 'var(--gold)',
            border: 'none',
            color: dangerous ? '#fff' : '#000',
            cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
