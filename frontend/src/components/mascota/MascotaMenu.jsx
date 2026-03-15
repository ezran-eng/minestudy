import React, { useState } from 'react';

const OPCIONES = [
  { emoji: '🔴', label: 'APAGAR ASISTENTE', id: 'apagar' },
  { emoji: '🍅', label: 'POMODORO',          id: 'pomodoro' },
  { emoji: '🔔', label: 'NOTIFICACIONES',    id: 'notificaciones' },
  { emoji: '❓', label: 'AYUDA',             id: 'ayuda' },
];

const BTN_STYLE = {
  fontFamily: "'Silkscreen', cursive",
  fontSize: '11px',
  color: 'rgba(255,255,255,0.6)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
  width: '100%',
  textAlign: 'center',
};

export default function MascotaMenu({ onApagar, onProximamente, onNotificaciones, above, left }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideClass, setSlideClass] = useState('');
  const [animKey, setAnimKey] = useState(0);

  const go = (dir) => {
    setSlideClass(dir === 'up' ? 'mascota-slide-up' : 'mascota-slide-down');
    setAnimKey(k => k + 1);
    setActiveIndex(i =>
      dir === 'up'
        ? (i - 1 + OPCIONES.length) % OPCIONES.length
        : (i + 1) % OPCIONES.length
    );
  };

  const handleSelect = () => {
    const { id } = OPCIONES[activeIndex];
    if (id === 'apagar') onApagar();
    else if (id === 'notificaciones') onNotificaciones();
    else onProximamente();
  };

  const opcion = OPCIONES[activeIndex];

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
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        padding: '12px 16px',
        minWidth: '200px',
        zIndex: 1002,
        animation: 'mascota-pop 0.18s ease-out',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {/* ▲ */}
      <button onClick={() => go('up')} style={BTN_STYLE}>▲</button>

      {/* Opción activa con slide */}
      <div style={{ overflow: 'hidden', height: '36px', width: '100%', display: 'flex', alignItems: 'center' }}>
        <div
          key={animKey}
          className={slideClass}
          onClick={handleSelect}
          style={{
            fontFamily: "'Silkscreen', cursive",
            fontSize: '13px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          <span>{opcion.emoji}</span>
          <span>{opcion.label}</span>
        </div>
      </div>

      {/* ▼ */}
      <button onClick={() => go('down')} style={BTN_STYLE}>▼</button>
    </div>
  );
}
