import React, { useState, useRef, useEffect } from 'react';

const InfografiaCarousel = ({ isOpen, onClose, images, startIndex = 0 }) => {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [scale, setScale] = useState(1);

  const touchStartX = useRef(null);
  const isPinching = useRef(false);
  const pinchStartDist = useRef(null);
  const pinchStartScale = useRef(1);

  // Sync startIndex when carousel opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(startIndex);
      setScale(1);
    }
  }, [isOpen, startIndex]);

  // Reset zoom when navigating
  useEffect(() => { setScale(1); }, [currentIdx]);

  if (!isOpen || !images || images.length === 0) return null;

  const img = images[currentIdx];
  const prev = () => setCurrentIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrentIdx(i => (i + 1) % images.length);

  const getPinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // All touch logic lives here — distinguishes swipe (1 finger) from pinch (2 fingers)
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      touchStartX.current = null;
      pinchStartDist.current = getPinchDist(e.touches);
      pinchStartScale.current = scale;
    } else if (e.touches.length === 1 && !isPinching.current) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dist = getPinchDist(e.touches);
      const next = Math.min(4, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)));
      setScale(next);
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      if (isPinching.current) {
        isPinching.current = false;
        pinchStartDist.current = null;
        if (scale < 1.1) setScale(1);
        return;
      }
      if (touchStartX.current !== null) {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        // Only swipe when not zoomed in
        if (Math.abs(dx) > 50 && scale <= 1) {
          dx < 0 ? next() : prev();
        }
        touchStartX.current = null;
      }
    } else if (e.touches.length === 1 && isPinching.current) {
      // Second finger lifted — don't treat remaining finger as swipe start
      touchStartX.current = null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.96)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — padded for Telegram safe area */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'calc(env(safe-area-inset-top, 48px) + 14px)',
        paddingBottom: '14px',
        paddingLeft: '16px',
        paddingRight: '16px',
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

      {/* Image area — handles all touch gestures */}
      <div
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px', position: 'relative', overflow: 'hidden',
          touchAction: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPinching.current ? 'none' : 'transform 0.15s ease',
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
