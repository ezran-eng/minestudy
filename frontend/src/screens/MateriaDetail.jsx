import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { materiasData } from '../data/materias';

const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const materia = materiasData[id];

  if (!materia) {
    return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  }

  return (
    <div className="screen active screen-container" id="screen-materia">
      <div className="detail-header">
        <div className="btn-back" onClick={() => navigate('/study')}>‹</div>
        <div className="detail-title">{materia.emoji} {materia.name}</div>
      </div>
      <div className="detail-body">
        <div className="detail-prog">
          <div className="detail-prog-top">
            <span className="detail-prog-label">Progreso general</span>
            <span className="detail-prog-pct">{materia.pct}%</span>
          </div>
          <div className="detail-bar-wrap">
            <div className="detail-bar" style={{ width: `${materia.pct}%` }}></div>
          </div>
        </div>

        <div className="section-head" style={{ marginBottom: '10px' }}>
          <div className="section-title">Programa</div>
        </div>
        <div className="unidades-list">
          {materia.unidades.map((u, i) => {
            const isPending = u.status === 'pending' || u.status === 'pend';
            const statusClass = u.status === 'done' ? 'done' : (u.status === 'active' || u.status === 'cur') ? 'cur' : 'pend';
            const badgeClass = u.status === 'done' ? 'done' : (u.status === 'active' || u.status === 'cur') ? 'cur' : 'pend';
            const badgeText = u.status === 'done' ? '✓ Completa' : (u.status === 'active' || u.status === 'cur') ? 'En curso' : 'Pendiente';

            if (isPending) {
              return (
                <div key={i} className={`unit-item ${statusClass}`}>
                  <div className="pu-left">
                    <div className="pu-name" style={{ marginBottom: '4px' }}>{u.name}</div>
                    <div className="pu-topics">{u.topics}</div>
                  </div>
                  <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              );
            }

            return (
              <Link to={`/materia/${id}/unidad/${i}`} key={i} className={`unit-item ${statusClass}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="pu-left">
                  <div className="pu-name" style={{ marginBottom: '4px' }}>{u.name}</div>
                  <div className="pu-topics">{u.topics}</div>
                </div>
                <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MateriaDetail;
