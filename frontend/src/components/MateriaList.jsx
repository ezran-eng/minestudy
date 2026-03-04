import React from 'react';

const MateriaList = ({ materias, isOwnProfile, navigate }) => (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {materias.map(m => (
      <div
        key={m.id}
        onClick={() => isOwnProfile && navigate ? navigate(`/materia/${m.id}`, { state: { materia: m } }) : undefined}
        style={{
          background: 'var(--s2)', borderRadius: '12px',
          padding: '12px 14px', border: '1px solid var(--border)',
          borderLeft: `4px solid ${m.color || 'var(--gold)'}`,
          cursor: isOwnProfile && navigate ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {m.emoji} {m.nombre}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>
            {Math.round(m.porcentaje)}%
          </span>
        </div>
        <div style={{ background: 'var(--s3)', borderRadius: '4px', height: '4px' }}>
          <div style={{
            width: `${Math.min(m.porcentaje, 100)}%`, height: '100%',
            background: m.color || 'var(--gold)', borderRadius: '4px',
          }} />
        </div>
        {isOwnProfile && navigate && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text2)' }}>Ir a la materia ›</div>
        )}
      </div>
    ))}
  </div>
);

export default MateriaList;
