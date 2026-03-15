import React, { useState, useEffect } from 'react';

const STUDY_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

/**
 * Pomodoro timer — controlled modal.
 * Triggered from the mascota menu, not a floating button.
 */
export default function Timer({ open, onClose }) {
  const [timeLeft, setTimeLeft] = useState(STUDY_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  // Pause when closed
  useEffect(() => {
    if (!open) setIsActive(false);
  }, [open]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) setIsActive(false);
  }, [timeLeft]);

  const toggle = () => setIsActive(a => !a);

  const reset = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? BREAK_TIME : STUDY_TIME);
  };

  const toggleMode = () => {
    const next = !isBreak;
    setIsBreak(next);
    setIsActive(false);
    setTimeLeft(next ? BREAK_TIME : STUDY_TIME);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const pct = timeLeft / (isBreak ? BREAK_TIME : STUDY_TIME);
  const r = 54;
  const circ = 2 * Math.PI * r;

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'mascota-pop 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20, 14, 40, 0.95)',
          border: '1px solid rgba(167, 139, 250, 0.25)',
          borderRadius: '28px',
          padding: '32px 28px 28px',
          width: '100%',
          maxWidth: '300px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(140,100,255,0.1)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '22px',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>

        {/* Title */}
        <div style={{
          fontFamily: "'Silkscreen', cursive",
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: 'rgba(167,139,250,0.8)',
          marginBottom: '24px',
          textTransform: 'uppercase',
        }}>
          🍅 {isBreak ? 'Descanso' : 'Pomodoro'}
        </div>

        {/* SVG ring + time */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle
              cx="64" cy="64" r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            {/* Progress */}
            <circle
              cx="64" cy="64" r={r}
              fill="none"
              stroke={isBreak ? '#34d399' : '#a78bfa'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}>
            <span style={{
              fontFamily: "'Silkscreen', cursive",
              fontSize: '26px',
              fontWeight: 700,
              color: timeLeft === 0 ? '#f87171' : '#fff',
              letterSpacing: '0.04em',
            }}>
              {fmt(timeLeft)}
            </span>
            {isActive && (
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Silkscreen', cursive" }}>
                EN CURSO
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={toggle}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              background: isActive
                ? 'rgba(248,113,113,0.2)'
                : 'rgba(167,139,250,0.2)',
              border: `1px solid ${isActive ? 'rgba(248,113,113,0.4)' : 'rgba(167,139,250,0.4)'}`,
              color: isActive ? '#fca5a5' : '#c4b5fd',
              fontFamily: "'Silkscreen', cursive",
              fontSize: '11px',
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            {isActive ? '⏸ PAUSAR' : timeLeft < (isBreak ? BREAK_TIME : STUDY_TIME) ? '▶ SEGUIR' : '▶ INICIAR'}
          </button>
          <button
            onClick={reset}
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🔄
          </button>
        </div>

        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '10px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontFamily: "'Silkscreen', cursive",
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          CAMBIAR A {isBreak ? 'ESTUDIO (25m)' : 'DESCANSO (5m)'}
        </button>
      </div>
    </div>
  );
}
