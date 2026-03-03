import React, { useState, useRef } from 'react';

const InfografiaCarousel = ({ isOpen, onClose, images, startIndex = 0 }) => {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const touchStartX = useRef(null);

  if (!isOpen || !images || images.length === 0) return null;

  const img = images[currentIdx];

  const prev = () => setCurrentIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrentIdx(i => (i + 1) % images.length);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ color: 'var(--text2)', fontSize: '13px' }}>
          {currentIdx + 1} / {images.length}
        </span>
        <span style={{
          color: 'var(--text)', fontSize: '14px', fontWeight: 600,
          flex: 1, textAlign: 'center', padding: '0 12px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {img.titulo}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text)',
            fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
          }}
        >✕</button>
      </div>

      {/* Image */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px', position: 'relative', overflow: 'hidden',
      }}>
        {images.length > 1 && (
          <button onClick={prev} style={arrowStyle('left')}>‹</button>
        )}
        <img
          key={img.url}
          src={img.url}
          alt={img.titulo}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', borderRadius: '8px',
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
          draggable={false}
        />
        {images.length > 1 && (
          <button onClick={next} style={arrowStyle('right')}>›</button>
        )}
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '14px' }}>
          {images.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: i === currentIdx ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === currentIdx ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const arrowStyle = (side) => ({
  position: 'absolute',
  [side]: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '50%',
  width: '40px', height: '40px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text)', fontSize: '24px', cursor: 'pointer',
  zIndex: 1,
});

export default InfografiaCarousel;
