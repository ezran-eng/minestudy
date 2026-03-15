import React from 'react';
import { usePomodoro } from '../context/PomodoroContext';

/**
 * Mini floating indicator — visible when timer is active and panel is closed.
 * Bottom-left corner (mascota is bottom-right).
 */
export default function PomodoroFloating() {
  const { secondsLeft, isRunning, mode, totalTime, panelOpen, hasStarted, openPanel } = usePomodoro();

  // Only show when timer has been started and panel is closed
  if (panelOpen || !hasStarted) return null;

  const pct = secondsLeft / totalTime;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const color = mode === 'study' ? '#a78bfa' : '#34d399';

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const time = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div
      onClick={openPanel}
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${isRunning ? color + '55' : 'rgba(255,255,255,0.15)'}`,
        boxShadow: isRunning
          ? `0 4px 16px rgba(0,0,0,0.3), 0 0 12px ${color}22`
          : '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: 998,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'mascota-pop 0.18s ease-out',
      }}
    >
      {/* SVG ring */}
      <svg
        width="52" height="52"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>

      {/* Time */}
      <span style={{
        fontFamily: "'Silkscreen', cursive",
        fontSize: '8px',
        fontWeight: 700,
        color: secondsLeft === 0 ? '#f87171' : '#fff',
        letterSpacing: '0.02em',
        zIndex: 1,
      }}>
        {time}
      </span>

      {/* Pulsing dot when running */}
      {isRunning && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          animation: 'pomodoro-pulse 1.5s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}
