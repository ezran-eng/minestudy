import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materiasData } from '../data/materias';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';

const UnidadDetail = () => {
  const { id, idx } = useParams();
  const navigate = useNavigate();

  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const materia = materiasData[id];
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;

  const unidad = materia.unidades[parseInt(idx, 10)];
  if (!unidad) return <div className="screen active" style={{ padding: '20px' }}>Unidad no encontrada</div>;

  const topicsArray = unidad.topics.split(' · ');

  return (
    <>
      <div className="screen active" id="screen-unidad">
        <div className="detail-header">
          <div className="btn-back" onClick={() => navigate(`/materia/${id}`)}>‹</div>
          <div className="detail-title">{unidad.name}</div>
        </div>
        <div className="detail-body">
          <div className="pu-topics-box">
            {topicsArray.map((t, i) => (
              <span key={i} style={{ display: 'inline-block', background: 'var(--s3)', borderRadius: '6px', padding: '3px 10px', margin: '3px 3px', fontSize: '12px', color: 'var(--text2)' }}>
                {t}
              </span>
            ))}
          </div>
          <div className="section-head" style={{ marginTop: '18px' }}>
            <div className="section-title">Recursos</div>
          </div>
          <div className="resources-grid">
            <div className="resource-card flash" onClick={() => setIsFlashOpen(true)}>
              <div className="resource-icon-wrap">🃏</div>
              <div className="resource-info">
                <div className="resource-name">Flashcards</div>
                <div className="resource-sub">Repaso con tarjetas · spaced repetition</div>
              </div>
              <div className="resource-badge">12 tarjetas</div>
            </div>
            <div className="resource-card quiz" onClick={() => setIsQuizOpen(true)}>
              <div className="resource-icon-wrap">🎯</div>
              <div className="resource-info">
                <div className="resource-name">Quiz IA</div>
                <div className="resource-sub">Preguntas generadas desde tus PDFs</div>
              </div>
              <div className="resource-badge">Nuevo</div>
            </div>
          </div>
        </div>
      </div>

      <Flashcard
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        materiaName={materia.name}
      />
      <Quiz
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
      />
    </>
  );
};

export default UnidadDetail;
