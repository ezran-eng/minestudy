import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Study = () => {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterias = async () => {
      try {
        const response = await api.get('/materias');

        // Compute total percentage from progresos if needed,
        // For now, let's grab user progress specifically
        const tg = window.Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id || 1; // Default to 1 for local testing
        const userRes = await api.get(`/users/${userId}`);
        const userProgresos = userRes.data.progresos || [];

        // Map progress to materias
        const materiasWithProgress = response.data.map(materia => {
          // Average percentage of all units for this materia
          const materiaProgresos = userProgresos.filter(p => p.id_materia === materia.id);
          const totalUnits = materia.unidades.length;

          let pct = 0;
          if (totalUnits > 0) {
            const sumPct = materiaProgresos.reduce((acc, p) => acc + p.porcentaje, 0);
            pct = Math.round(sumPct / totalUnits);
          }

          return { ...materia, pct };
        });

        setMaterias(materiasWithProgress);
      } catch (error) {
        console.error('Error fetching materias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterias();
  }, []);

  const handleMateriaClick = (materia) => {
    navigate(`/materia/${materia.id}`, { state: { materia } });
  };

  if (loading) {
    return (
      <div className="screen active screen-container" id="screen-study">
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text2)' }}>
          Cargando materias...
        </div>
      </div>
    );
  }

  return (
    <div className="screen active screen-container" id="screen-study">
      <button className="fab-new-btn">+ Nueva</button>
      <div className="materias-list study-body-pad">
        {materias.map((materia) => {
          const color = materia.color || 'var(--gold)';
          return (
            <div
              key={materia.id}
              className="materia-row"
              style={{ borderLeftColor: color }}
              onClick={() => handleMateriaClick(materia)}
            >
              <div className="materia-emoji-big">{materia.emoji}</div>
              <div className="materia-info">
                <div className="materia-name-row">{materia.nombre}</div>
                <div className="materia-bottom">
                  <span className="materia-pct">{materia.pct}%</span>
                  <div className="mini-bar-wrap">
                    <div className="mini-bar" style={{ width: `${materia.pct}%`, background: color }}></div>
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
