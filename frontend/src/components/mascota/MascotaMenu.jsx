import React from 'react';

export default function MascotaMenu({ onApagar, above, left }) {
  return (
    <div
      style={{
        position: 'absolute',
        [above ? 'bottom' : 'top']: '72px',
        [left ? 'right' : 'left']: '0',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        padding: '6px',
        minWidth: '160px',
        zIndex: 1002,
        animation: 'mascota-pop 0.18s ease-out',
      }}
    >
      <button
        onClick={onApagar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          fontFamily: "'Silkscreen', cursive",
          color: '#ff6b6b',
          cursor: 'pointer',
          textAlign: 'left',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        🔴 Apagar asistente
      </button>
    </div>
  );
}
