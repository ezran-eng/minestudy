import React, { useState } from 'react';

const OPCIONES = [
  { emoji: '💬', label: 'PREGUNTARLE ALGO',  id: 'chat' },
  { emoji: '🍅', label: 'POMODORO',          id: 'pomodoro' },
  { emoji: '🔔', label: 'NOTIFICACIONES',    id: 'notificaciones' },
  { emoji: '🧬', label: 'SINAPSIS',          id: 'sinapsis' },
  { emoji: '🔴', label: 'APAGAR ASISTENTE',  id: 'apagar' },
];

// Spring easing: fast press (80ms), springy release (420ms overshoot)
const pressTransition  = 'transform 80ms ease-out, background 80ms ease-out, box-shadow 80ms ease-out';
const springTransition = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), background 220ms ease-out, box-shadow 220ms ease-out';

function NavButton({ dir, onPress }) {
  const [pressed, setPressed] = useState(false);

  const handleDown = () => { setPressed(true); onPress(); };
  const handleUp   = () => setPressed(false);

  return (
    <button
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      style={{
        fontFamily: "'Silkscreen', cursive",
        fontSize: '13px',
        fontWeight: 700,
        color: pressed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
        background: pressed
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(255,255,255,0.06)',
        border: '1px solid',
        borderColor: pressed
          ? 'rgba(255,255,255,0.35)'
          : 'rgba(255,255,255,0.1)',
        borderRadius: '14px',
        cursor: 'pointer',
        padding: '10px 0',
        width: '100%',
        textAlign: 'center',
        transform: pressed ? 'scale(0.9) scaleY(0.88)' : 'scale(1)',
        boxShadow: pressed
          ? 'inset 0 3px 10px rgba(0,0,0,0.25)'
          : '0 2px 8px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.08)',
        transition: pressed ? pressTransition : springTransition,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  );
}

export default function MascotaMenu({ onApagar, onPomodoro, onNotificaciones, onChat, onSinapsis, onProximamente, above, left }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideClass, setSlideClass] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [optionPressed, setOptionPressed] = useState(false);

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
    if (id === 'chat') onChat?.();
    else if (id === 'apagar') onApagar();
    else if (id === 'pomodoro') onPomodoro?.();
    else if (id === 'notificaciones') onNotificaciones();
    else if (id === 'sinapsis') onSinapsis?.();
    else onProximamente?.();
  };

  const opcion = OPCIONES[activeIndex];

  return (
    <div
      style={{
        position: 'absolute',
        [above ? 'bottom' : 'top']: '72px',
        [left ? 'right' : 'left']: '0',
        background: 'rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
        padding: '10px 12px',
        minWidth: '210px',
        zIndex: 1002,
        animation: 'mascota-pop 0.18s ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* ▲ */}
      <NavButton dir="up" onPress={() => go('up')} />

      {/* Active option */}
      <div
        style={{
          overflow: 'hidden',
          height: '44px',
          borderRadius: '12px',
          background: optionPressed
            ? 'rgba(255,255,255,0.14)'
            : 'rgba(255,255,255,0.07)',
          border: '1px solid',
          borderColor: optionPressed
            ? 'rgba(255,255,255,0.3)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: optionPressed
            ? 'inset 0 3px 10px rgba(0,0,0,0.2)'
            : '0 2px 8px rgba(0,0,0,0.15)',
          transform: optionPressed ? 'scale(0.96) scaleY(0.93)' : 'scale(1)',
          transition: optionPressed ? pressTransition : springTransition,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
        onPointerDown={() => setOptionPressed(true)}
        onPointerUp={() => { setOptionPressed(false); handleSelect(); }}
        onPointerLeave={() => setOptionPressed(false)}
      >
        <div
          key={animKey}
          className={slideClass}
          style={{
            fontFamily: "'Silkscreen', cursive",
            fontSize: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '0 14px',
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontSize: '16px' }}>{opcion.emoji}</span>
          <span>{opcion.label}</span>
        </div>
      </div>

      {/* ▼ */}
      <NavButton dir="down" onPress={() => go('down')} />

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', paddingTop: '2px' }}>
        {OPCIONES.map((_, i) => (
          <div
            key={i}
            style={{
              width:  i === activeIndex ? '14px' : '5px',
              height: '5px',
              borderRadius: '3px',
              background: i === activeIndex
                ? 'rgba(255,255,255,0.8)'
                : 'rgba(255,255,255,0.2)',
              transition: 'all 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
