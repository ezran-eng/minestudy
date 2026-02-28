import React, { useState, useEffect } from 'react';

const Timer = () => {
  const STUDY_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [timeLeft, setTimeLeft] = useState(STUDY_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Auto-switch modes when timer ends
      // setIsBreak(!isBreak);
      // setTimeLeft(!isBreak ? BREAK_TIME : STUDY_TIME);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? BREAK_TIME : STUDY_TIME);
  };

  const toggleMode = () => {
    const newIsBreak = !isBreak;
    setIsBreak(newIsBreak);
    setIsActive(false);
    setTimeLeft(newIsBreak ? BREAK_TIME : STUDY_TIME);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // FAB Style (floating action button)
  const fabStyle = {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    backgroundColor: 'var(--s2)',
    border: '1px solid var(--gold)',
    borderRadius: '24px',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    zIndex: 90,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    transition: 'transform 0.2s',
  };

  // Overlay Style
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 200,
    display: isExpanded ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  };

  const modalStyle = {
    backgroundColor: 'var(--s1)',
    border: '1px solid var(--gold)',
    borderRadius: '20px',
    padding: '24px',
    width: '100%',
    maxWidth: '320px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
    position: 'relative'
  };

  const closeBtnStyle = {
    position: 'absolute',
    top: '12px',
    right: '16px',
    fontSize: '24px',
    color: 'var(--text2)',
    cursor: 'pointer',
    lineHeight: 1
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isExpanded && (
        <div style={fabStyle} onClick={() => setIsExpanded(true)}>
          <span style={{ fontSize: '18px' }}>⏱️</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--gold)' }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* Expanded Overlay */}
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={closeBtnStyle} onClick={() => setIsExpanded(false)}>&times;</div>

          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '1px', marginBottom: '8px' }}>
            {isBreak ? 'Descanso' : 'Estudio'} (Pomodoro)
          </div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '56px',
            fontWeight: 700,
            color: 'var(--gold)',
            margin: '20px 0',
            lineHeight: 1
          }}>
            {formatTime(timeLeft)}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={toggleTimer}
              className="btn-primary"
              style={{ flex: 1, padding: '12px', fontSize: '15px' }}
            >
              {isActive ? 'Pausar' : 'Iniciar'}
            </button>
            <button
              onClick={resetTimer}
              style={{
                backgroundColor: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                padding: '12px 16px',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600
              }}
            >
              🔄
            </button>
          </div>

          <button
            onClick={toggleMode}
            style={{
              backgroundColor: 'transparent',
              border: '1px dashed var(--text2)',
              borderRadius: '8px',
              color: 'var(--text2)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '12px',
              width: '100%'
            }}
          >
            Cambiar a modo {isBreak ? 'Estudio (25m)' : 'Descanso (5m)'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Timer;
