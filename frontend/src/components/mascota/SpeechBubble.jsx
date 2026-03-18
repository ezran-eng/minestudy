import React, { useState, useEffect, useCallback } from 'react';

const ACTION_LABELS = {
  repaso: 'Ir a repasar →',
  quiz: 'Hacer quiz →',
  explorar: 'Explorar →',
};

const SPEED = 40;

export default React.forwardRef(function SpeechBubble({ bubble, hint, onAction, above, left }, ref) {
  if (!bubble) return null;

  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    const text = bubble?.text ?? '';
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, SPEED);
    return () => clearInterval(interval);
  }, [bubble?.id]); // eslint-disable-line

  const skip = useCallback(() => setDisplayed(bubble?.text ?? ''), [bubble]);

  const isComplete = displayed === bubble.text;
  const accionTipo = typeof bubble.accion === 'object' ? bubble.accion?.tipo : bubble.accion;
  const hasAction = accionTipo && ACTION_LABELS[accionTipo];

  return (
    <div
      ref={ref}
      key={bubble.id}
      onClick={hasAction && isComplete ? undefined : skip}
      style={{
        position: 'absolute',
        bottom: above ? '110%' : 'auto',
        top: above ? 'auto' : '110%',
        [left ? 'right' : 'left']: '0',
        maxHeight: '40vh',
        overflowY: 'auto',
        background: 'rgba(20, 18, 40, 0.92)',
        border: bubble.fromAI
          ? '1px solid rgba(160, 130, 255, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        boxShadow: bubble.fromAI
          ? '0 4px 24px rgba(0,0,0,0.3), 0 0 12px rgba(140,100,255,0.12)'
          : '0 4px 24px rgba(0,0,0,0.3)',
        padding: '14px 18px',
        paddingTop: bubble.fromAI ? '22px' : '14px',
        fontSize: '13px',
        fontFamily: "'Silkscreen', cursive",
        color: '#fff',
        maxWidth: 'min(320px, 80vw)',
        minWidth: '200px',
        width: 'fit-content',
        lineHeight: 1.6,
        animation: 'mascota-pop 0.18s ease-out',
        cursor: 'pointer',
        whiteSpace: 'normal',
      }}
    >
      {/* IA badge */}
      {bubble.fromAI && (
        <span style={{
          position: 'absolute',
          top: '7px',
          right: '12px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          background: 'linear-gradient(90deg, #a78bfa, #818cf8, #60a5fa, #a78bfa)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'ai-shimmer 3s linear infinite',
        }}>
          ✦ IA
        </span>
      )}

      {displayed}

      {/* Action button — Redo's decision */}
      {hasAction && isComplete && (
        <div
          onClick={(e) => { e.stopPropagation(); onAction?.(bubble.accion); }}
          style={{
            marginTop: '8px',
            padding: '6px 14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(96,165,250,0.25))',
            border: '1px solid rgba(167,139,250,0.4)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#c4b5fd',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'transform 120ms ease, background 120ms ease',
            animation: 'mascota-pop 0.25s ease-out',
          }}
          onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
          onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {ACTION_LABELS[accionTipo]}
        </div>
      )}

      {/* Legacy hint (non-AI) */}
      {!hasAction && hint && hint.flashcards_due > 0 && bubble.text.includes('flashcard') && isComplete && (
        <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
          Tocame →
        </div>
      )}
    </div>
  );
});
