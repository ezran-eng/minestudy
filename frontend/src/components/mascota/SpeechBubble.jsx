import React from 'react';

export default React.forwardRef(function SpeechBubble({ bubble, displayed, hint, onSkip, above, left }, ref) {
  if (!bubble) return null;

  return (
    <div
      ref={ref}
      key={bubble.id}
      onClick={onSkip}
      style={{
        position: 'absolute',
        [above ? 'bottom' : 'top']: '72px',
        [left ? 'right' : 'left']: '0',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
        position: 'absolute',
      }}
    >
      {/* IA badge — solo en respuestas generadas por la IA */}
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

      {hint && hint.flashcards_due > 0 && bubble.text.includes('flashcard') && displayed === bubble.text && (
        <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
          Tocame →
        </div>
      )}
    </div>
  );
});
