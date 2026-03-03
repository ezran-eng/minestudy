import React, { useState, useRef, useEffect } from 'react';

const InfografiaCarousel = ({ isOpen, onClose, images, startIndex = 0 }) => {
  const [currentIdx, setCurrentIdx] = useState(startIndex);

  // Rendering state
  const [scale, setScale]   = useState(1);
  const [panX,  setPanX]    = useState(0);
  const [panY,  setPanY]    = useState(0);

  // Refs — source of truth inside touch handlers (state reads are stale there)
  const scaleRef  = useRef(1);
  const panXRef   = useRef(0);
  const panYRef   = useRef(0);
  const containerRef = useRef(null);

  // Pinch gesture state
  const isPinching        = useRef(false);
  const pinchStartDist    = useRef(null);
  const pinchStartScale   = useRef(1);
  const pinchStartPanX    = useRef(0);
  const pinchStartPanY    = useRef(0);
  const pinchStartMid     = useRef({ x: 0, y: 0 });

  // Swipe / pan gesture state
  const dragStartX  = useRef(null);
  const dragStartY  = useRef(null);
  const dragPanX0   = useRef(0);
  const dragPanY0   = useRef(0);

  const resetTransform = () => {
    scaleRef.current = 1; panXRef.current = 0; panYRef.current = 0;
    setScale(1); setPanX(0); setPanY(0);
  };

  // Sync when carousel opens or startIndex changes
  useEffect(() => {
    if (isOpen) { setCurrentIdx(startIndex); resetTransform(); }
  }, [isOpen, startIndex]);

  // Reset transform on image change
  useEffect(() => { resetTransform(); }, [currentIdx]);

  if (!isOpen || !images || images.length === 0) return null;

  const img     = images[currentIdx];
  const isZoomed = scale > 1;
  const goPrev  = () => setCurrentIdx(i => (i - 1 + images.length) % images.length);
  const goNext  = () => setCurrentIdx(i => (i + 1) % images.length);

  // Safe area: use Telegram WebApp API value, fallback 48
  const topOffset = window.Telegram?.WebApp?.contentSafeAreaInset?.top ?? 48;

  // ─── Touch helpers ────────────────────────────────────────────────
  const pinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const pinchMid = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const containerCenter = () => {
    const r = containerRef.current.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // ─── Touch handlers ───────────────────────────────────────────────
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPinching.current     = true;
      dragStartX.current     = null;           // cancel any swipe/pan
      pinchStartDist.current = pinchDist(e.touches);
      pinchStartScale.current = scaleRef.current;
      pinchStartPanX.current  = panXRef.current;
      pinchStartPanY.current  = panYRef.current;
      pinchStartMid.current   = pinchMid(e.touches);
    } else if (e.touches.length === 1 && !isPinching.current) {
      dragStartX.current  = e.touches[0].clientX;
      dragStartY.current  = e.touches[0].clientY;
      dragPanX0.current   = panXRef.current;
      dragPanY0.current   = panYRef.current;
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      // ── Pinch: zoom at finger midpoint ──────────────────────────
      const dist     = pinchDist(e.touches);
      const mid      = pinchMid(e.touches);
      const s0       = pinchStartScale.current;
      const s1       = Math.min(5, Math.max(1, s0 * (dist / pinchStartDist.current)));
      const px0      = pinchStartPanX.current;
      const py0      = pinchStartPanY.current;
      const m0       = pinchStartMid.current;    // fixed: where fingers started
      const c        = containerCenter();

      // The image-local point under m0 (in the coordinate system where
      // the image center is the origin, before pan and scale):
      //   screen = local * s0 + c + (px0, py0)
      //   local  = (m0 - c - (px0, py0)) / s0
      //
      // Keep that same local point under the current midpoint `mid`:
      //   mid = local * s1 + c + (px1, py1)
      //   px1 = mid - c - local * s1
      const localX = (m0.x - c.x - px0) / s0;
      const localY = (m0.y - c.y - py0) / s0;
      const newPanX = mid.x - c.x - localX * s1;
      const newPanY = mid.y - c.y - localY * s1;

      scaleRef.current = s1; panXRef.current = newPanX; panYRef.current = newPanY;
      setScale(s1); setPanX(newPanX); setPanY(newPanY);

    } else if (e.touches.length === 1 && dragStartX.current !== null && scaleRef.current > 1) {
      // ── Pan: drag while zoomed ───────────────────────────────────
      const newPanX = dragPanX0.current + (e.touches[0].clientX - dragStartX.current);
      const newPanY = dragPanY0.current + (e.touches[0].clientY - dragStartY.current);
      panXRef.current = newPanX; panYRef.current = newPanY;
      setPanX(newPanX); setPanY(newPanY);
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      if (isPinching.current) {
        isPinching.current     = false;
        pinchStartDist.current = null;
        if (scaleRef.current < 1.1) resetTransform();   // snap back
        return;
      }
      // ── Swipe to navigate (only when not zoomed) ─────────────────
      if (dragStartX.current !== null && scaleRef.current <= 1) {
        const dx = e.changedTouches[0].clientX - dragStartX.current;
        if (Math.abs(dx) > 50) dx < 0 ? goNext() : goPrev();
      }
      dragStartX.current = null;
    } else if (e.touches.length === 1 && isPinching.current) {
      // One finger lifted during pinch — don't start a swipe
      dragStartX.current = null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.96)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: `${topOffset + 14}px`,
        paddingBottom: '14px',
        paddingLeft: '16px',
        paddingRight: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--text2)', fontSize: '13px', minWidth: '36px' }}>
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
            fontSize: '22px', cursor: 'pointer', lineHeight: 1,
            padding: '2px 6px', minWidth: '36px', textAlign: 'right',
          }}
        >✕</button>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px', position: 'relative', overflow: 'hidden',
          touchAction: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!isZoomed && images.length > 1 && (
          <button onClick={goPrev} style={arrowStyle('left')}>‹</button>
        )}
        <img
          key={img.url}
          src={img.url}
          alt={img.titulo}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', borderRadius: '8px',
            userSelect: 'none', WebkitUserSelect: 'none',
            transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
            transformOrigin: 'center center',
            // No transition during active gestures for instant response
            transition: isPinching.current || (dragStartX.current !== null && isZoomed)
              ? 'none'
              : 'transform 0.15s ease',
          }}
          draggable={false}
        />
        {!isZoomed && images.length > 1 && (
          <button onClick={goNext} style={arrowStyle('right')}>›</button>
        )}
      </div>

      {/* Dots — hidden when zoomed */}
      {!isZoomed && images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '14px', flexShrink: 0 }}>
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
