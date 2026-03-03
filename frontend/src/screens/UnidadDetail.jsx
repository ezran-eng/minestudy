import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';
import Timer from '../components/Timer';
import { useTelegram } from '../hooks/useTelegram';
import api, { registrarActividad } from '../services/api';
import { useToast } from '../components/Toast';

const UnidadDetail = () => {
  const { id, idx } = useParams(); // idx here is actually the unidad id
  const { user } = useTelegram();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // From navigation state if possible
  const [materia, setMateria] = useState(location.state?.materia || null);
  const [unidad, setUnidad] = useState(location.state?.unidad || null);

  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(!materia || !unidad);

  useEffect(() => {
    const fetchUnidadData = async () => {
      try {
        if (!materia || !unidad) {
             const mRes = await api.get('/materias');
             const foundM = mRes.data.find(m => m.id === parseInt(id));
             if (foundM) {
                setMateria(foundM);
                const foundU = foundM.unidades.find(u => u.id === parseInt(idx));
                if (foundU) setUnidad(foundU);
             }
        }

        // Fetch flashcards ordered by SRS due date
        const userId = user?.id;
        const fcEndpoint = userId
          ? `/flashcards/due?id_unidad=${idx}&id_usuario=${userId}`
          : `/unidades/${idx}/flashcards`;
        const fcRes = await api.get(fcEndpoint);
        setFlashcards(fcRes.data);

        const qRes = await api.get(`/unidades/${idx}/quiz`);
        setQuizQuestions(qRes.data);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
    };
    fetchUnidadData();
  }, [id, idx, materia, unidad]);

  if (loading) return <div className="screen active" style={{ padding: '20px' }}>Cargando unidad...</div>;
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  if (!unidad) return <div className="screen active" style={{ padding: '20px' }}>Unidad no encontrada</div>;

  const topicsArray = unidad.temas.map(t => t.nombre);

  const handleMarkComplete = async () => {
    if (user && user.id) {
      try {
        // Create progreso entry if complete
        await api.put('/progreso', {
            id_usuario: user.id,
            id_materia: materia.id,
            id_unidad: unidad.id,
            porcentaje: 100
        });

        const fechaLocal = new Date().toISOString().split('T')[0];
        const res = await registrarActividad(user.id, 'unidad', fechaLocal);

        if (res.primer_dia) {
          showToast('⚡ ¡Comenzaste tu racha! Estudia cada día para mantenerla viva.');
        } else if (res.nueva_racha) {
          showToast(`🔥 ¡Racha de ${res.racha} días! ¡Sigue así!`);
        } else {
          showToast('¡Unidad marcada como completa!');
        }
      } catch (err) {
        console.error('Error registering activity:', err);
        showToast('Error al marcar unidad');
      }
    } else {
      showToast('¡Unidad marcada como completa!');
    }
  };

  return (
    <>
      <div className="screen active screen-container" id="screen-unidad">
        <div className="fab-back-btn">
          <div className="btn-back" onClick={() => navigate(`/materia/${id}`)}>‹</div>
        </div>
        <div className="detail-body detail-body-pad">
          <div className="pu-topics-box">
            {topicsArray.map((t, i) => (
              <span key={i} style={{ display: 'inline-block', background: 'var(--s3)', borderRadius: '8px', padding: '5px 12px', margin: '3px 3px', fontSize: '11px', color: 'var(--text2)', fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
          <div className="section-head" style={{ marginTop: '18px', marginBottom: '10px' }}>
            <div className="section-title">Recursos</div>
          </div>
          <div className="resources-grid">
            <div className="resource-card flash" onClick={() => setIsFlashOpen(true)}>
              <div className="resource-icon-wrap">🃏</div>
              <div className="resource-info">
                <div className="resource-name">Flashcards</div>
                <div className="resource-sub">Repaso con spaced repetition</div>
              </div>
              <div className="resource-badge">
                {flashcards.length > 0 ? `${flashcards.length} tarjetas` : 'Sin tarjetas'}
              </div>
            </div>
            <div className="resource-card quiz" onClick={() => setIsQuizOpen(true)}>
              <div className="resource-icon-wrap">🎯</div>
              <div className="resource-info">
                <div className="resource-name">Quiz IA</div>
                <div className="resource-sub">Preguntas desde tus PDFs</div>
              </div>
              <div className="resource-badge">
                {quizQuestions.length > 0 ? `${quizQuestions.length} preguntas` : 'Nuevo'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold' }}
              onClick={handleMarkComplete}
            >
              Marcar como completa
            </button>
          </div>
        </div>
      </div>

      <Flashcard
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        materiaName={materia.nombre}
        userId={user?.id}
        customCards={flashcards.length > 0 ? flashcards.map(f => ({ id: f.id, q: f.pregunta, a: f.respuesta })) : null}
      />
      <Quiz
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        customQuestions={quizQuestions.length > 0 ? quizQuestions : null}
      />
      <Timer />
    </>
  );
};

export default UnidadDetail;
