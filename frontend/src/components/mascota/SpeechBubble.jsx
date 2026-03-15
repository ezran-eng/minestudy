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
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        padding: '14px 18px',
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
      {displayed}
      {hint && hint.flashcards_due > 0 && bubble.text.includes('flashcard') && displayed === bubble.text && (
        <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
          Tocame →
        </div>
      )}
    </div>
  );
});
