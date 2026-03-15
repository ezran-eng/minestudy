import React from 'react';

export default function BlurOverlay({ isFading, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        inset: 0,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(0,0,0,0.25)',
        zIndex: 999,
        animation: isFading
          ? 'mascota-blur-out 0.55s ease-out forwards'
          : 'mascota-blur-in 0.3s ease-out',
      }}
    />
  );
}
