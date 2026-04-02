import React from 'react';

// Convert hex (#rrggbb) to rgba string
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return `rgba(200,180,100,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const MateriaList = ({ materias, isOwnProfile, navigate }) => (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {materias.map(m => {
      const rawColor = m.color || null;
      const color = rawColor || 'var(--gold)';
      const hasGift = !!m.gift_image;
      const hasColor = !!rawColor;

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
            background: hasColor
              ? `linear-gradient(135deg, ${hexToRgba(rawColor, 0.15)} 0%, ${hexToRgba(rawColor, 0.05)} 100%)`
              : 'var(--s2)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: `1px solid ${hasColor ? hexToRgba(rawColor, 0.3) : 'var(--border)'}`,
            cursor: isOwnProfile && navigate ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          {/* Gift image watermark */}
          {hasGift && (
            <img
              src={m.gift_image}
              alt=""
              style={{
                position: 'absolute',
                right: '-5px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '85px',
                height: '85px',
                objectFit: 'contain',
                opacity: 0.2,
                pointerEvents: 'none',
                filter: 'saturate(1.3)',
              }}
            />
          )}

          {/* Emoji badge */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '11px',
            background: hasColor ? hexToRgba(rawColor, 0.15) : `${color}22`,
            border: `1.5px solid ${hasColor ? hexToRgba(rawColor, 0.35) : `${color}55`}`,
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
              <span style={{
                fontSize: '13px', fontWeight: 700, flexShrink: 0, marginLeft: '8px',
                color: hasColor ? rawColor : color,
              }}>
                {Math.round(m.porcentaje)}%
              </span>
            </div>
            <div style={{
              background: hasColor ? hexToRgba(rawColor, 0.12) : 'var(--s3)',
              borderRadius: '4px', height: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(m.porcentaje, 100)}%`, height: '100%',
                background: hasColor
                  ? `linear-gradient(90deg, ${rawColor}, ${hexToRgba(rawColor, 0.5)})`
                  : `linear-gradient(90deg, ${color}, ${color}88)`,
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
