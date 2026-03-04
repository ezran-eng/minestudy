import React, { useState, useEffect } from 'react';

const formatVistas = (n) => {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.floor(n / 1000)}k`;
};

// phase: 'compact' → click → 'counting' → animation done → 'full' → 3s → 'compact'
const VistaBadge = ({ vistas, style = {} }) => {
  const [phase, setPhase] = useState('compact');
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (phase !== 'counting') return;
    if (vistas === 0) { setPhase('full'); return; }
    const duration = 800;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCounter(Math.round(progress * vistas));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setPhase('full');
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, vistas]);

  useEffect(() => {
    if (phase !== 'full') return;
    const t = setTimeout(() => setPhase('compact'), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (phase !== 'compact') return;
    setCounter(0);
    setPhase('counting');
  };

  const text =
    phase === 'compact' ? formatVistas(vistas) :
    phase === 'counting' ? String(counter) :
    String(vistas);

  return (
    <span
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        fontSize: '12px',
        color: 'var(--text2)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        userSelect: 'none',
        ...style,
      }}
    >
      👁️ {text}
    </span>
  );
};

export default VistaBadge;
