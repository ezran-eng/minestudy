import React from 'react';
import { useNavigate } from 'react-router-dom';
import { materiasData } from '../data/materias';

const Study = () => {
  const navigate = useNavigate();

  const handleMateriaClick = (id) => {
    navigate(`/materia/${id}`);
  };

  const materiaStyles = {
    'm1': { color: 'var(--gold)', cClass: 'c1' },
    'm2': { color: 'var(--rust)', cClass: 'c2' },
    'm3': { color: 'var(--blue)', cClass: 'c3' },
    'm4': { color: 'var(--green)', cClass: 'c4' },
    'm5': { color: '#b06fd4', cClass: 'c5' },
    'm6': { color: '#7a9e8a', cClass: 'c6' },
  };

  return (
    <div className="screen active" id="screen-study">
      <div className="study-header">
        <div className="study-title">Mis Materias</div>
        <button className="btn-new">+ Nueva</button>
      </div>
      <div className="materias-list">
        {Object.entries(materiasData).map(([id, materia]) => {
          const styleInfo = materiaStyles[id] || { color: 'var(--gold)', cClass: 'c1' };
          return (
            <div key={id} className={`materia-row ${styleInfo.cClass}`} onClick={() => handleMateriaClick(id)}>
              <div className="materia-emoji-big">{materia.emoji}</div>
              <div className="materia-info">
                <div className="materia-name-row">{materia.name}</div>
                <div className="materia-bottom">
                  <span className="materia-pct">{materia.pct}%</span>
                  <div className="mini-bar-wrap">
                    <div className="mini-bar" style={{ width: `${materia.pct}%`, background: styleInfo.color }}></div>
                  </div>
                </div>
              </div>
              <div className="materia-arrow">›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Study;
