import React from 'react';

const MateriaList = ({ materias, isOwnProfile, navigate }) => (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {materias.map(m => {
      const color = m.color || 'var(--gold)';
      return (
        <div
          key={m.id}
          onClick={() => {
            if (!(isOwnProfile && navigate)) return;
            navigate(`/materia/${m.id}`, { state: { siguiendo: true } });
          }}
          style={{
            background: 'var(--s2)', borderRadius: '14px',
            padding: '14px 16px', border: '1px solid var(--border)',
            cursor: isOwnProfile && navigate ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          {/* Emoji badge */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '11px',
            background: `${color}22`,
            border: `1.5px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>
            {m.emoji || '📚'}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
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
              background: 'var(--s3)', borderRadius: '4px', height: '4px',
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
