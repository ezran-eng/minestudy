import React from 'react';

// Determine if a hex color is light (luminance > 0.5)
const isLightColor = (hex) => {
  if (!hex || !hex.startsWith('#')) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6;
};

const MateriaList = ({ materias, isOwnProfile, navigate }) => (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {materias.map(m => {
      const rawColor = m.color || null;
      const color = rawColor || 'var(--gold)';
      const hasGift = !!m.gift_image && !!rawColor;
      // For light colors on dark theme, use a darker variant for the bg tint
      const light = rawColor ? isLightColor(rawColor) : false;
      // Card background: solid tint when gift applied
      const cardBg = hasGift
        ? light
          ? `rgba(30,30,40,0.95)` // dark card so light watermark pops
          : `linear-gradient(135deg, ${rawColor}28 0%, ${rawColor}10 100%)`
        : 'var(--s2)';
      const cardBorder = hasGift ? `${rawColor}50` : 'var(--border)';

      return (
        <div
          key={m.id}
          onClick={() => {
            if (!(isOwnProfile && navigate)) return;
            navigate(`/materia/${m.id}`, { state: { siguiendo: true } });
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: cardBg,
            borderRadius: '14px',
            padding: '14px 16px',
            border: `1px solid ${cardBorder}`,
            cursor: isOwnProfile && navigate ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          {/* Gift image watermark — right side, large and visible */}
          {hasGift && (
            <img
              src={m.gift_image}
              alt=""
              style={{
                position: 'absolute',
                right: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                opacity: light ? 0.18 : 0.22,
                pointerEvents: 'none',
                filter: `saturate(1.4) ${light ? 'brightness(1.2)' : 'brightness(1)'}`,
              }}
            />
          )}

          {/* Emoji badge */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '11px',
            background: `${color}22`,
            border: `1.5px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
            position: 'relative', zIndex: 1,
          }}>
            {m.emoji || '📚'}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '6px',
            }}>
              <span style={{
                fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {m.nombre}
              </span>
              <span style={{ fontSize: '13px', color, fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>
                {Math.round(m.porcentaje)}%
              </span>
            </div>
            <div style={{
              background: hasGift ? `${color}20` : 'var(--s3)',
              borderRadius: '4px', height: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(m.porcentaje, 100)}%`, height: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            {isOwnProfile && navigate && (
              <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--text2)' }}>
                Ir a la materia ›
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default MateriaList;
