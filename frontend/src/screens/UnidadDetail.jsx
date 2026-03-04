import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';
import Timer from '../components/Timer';
import InfografiaCarousel from '../components/InfografiaCarousel';
import PDFViewer from '../components/PDFViewer';
import { useTelegram } from '../hooks/useTelegram';
import api, { getInfografias, getPdfs } from '../services/api';
import { useActividad } from '../hooks/useActividad';
import { useToast } from '../components/Toast';

const UnidadDetail = () => {
  const { id, idx } = useParams(); // idx here is actually the unidad id
  const { user } = useTelegram();
  const { showToast } = useToast();
  const { registrarHoy } = useActividad(user?.id, showToast);
  const navigate = useNavigate();
  const location = useLocation();

  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);
  const [infografias, setInfografias] = useState([]);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfs, setPdfs] = useState([]);

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

        const infRes = await getInfografias(idx);
        setInfografias(infRes);

        const pdfRes = await getPdfs(idx);
        setPdfs(pdfRes);
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

  const openCarousel = (i) => {
    setCarouselStart(i);
    setIsCarouselOpen(true);
    registrarHoy();
  };

  const openPdf = (pdf) => {
    setSelectedPdf(pdf);
    setIsPdfOpen(true);
    registrarHoy();
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
                <div className="resource-name">Cuestionario</div>
                <div className="resource-sub">Preguntas desde tus PDFs</div>
              </div>
              <div className="resource-badge">
                {quizQuestions.length > 0 ? `${quizQuestions.length} preguntas` : 'Nuevo'}
              </div>
            </div>
          </div>

          {infografias.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">Infografías</div>
              </div>

              {infografias.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {infografias.map((inf, i) => (
                    <div
                      key={inf.id}
                      onClick={() => openCarousel(i)}
                      style={{
                        aspectRatio: '1', borderRadius: '10px', overflow: 'hidden',
                        background: 'var(--s2)', cursor: 'pointer', position: 'relative',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <img
                        src={inf.url}
                        alt={inf.titulo}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text2)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                  Sin infografías aún
                </div>
              )}
            </div>
          )}

          {pdfs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">📄 Apuntes</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    onClick={() => openPdf(pdf)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'var(--s2)', borderRadius: '10px',
                      padding: '12px 14px', cursor: 'pointer',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>📄</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>
                      {pdf.titulo}
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--text2)' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <PDFViewer
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        pdf={selectedPdf}
      />
      <InfografiaCarousel
        isOpen={isCarouselOpen}
        onClose={() => setIsCarouselOpen(false)}
        images={infografias}
        startIndex={carouselStart}
      />
      <Flashcard
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        materiaName={materia.nombre}
        userId={user?.id}
        customCards={flashcards.length > 0 ? flashcards.map(f => ({ id: f.id, q: f.pregunta, a: f.respuesta })) : null}
        onFirstAction={registrarHoy}
      />
      <Quiz
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        customQuestions={quizQuestions.length > 0 ? quizQuestions : null}
        onFirstAnswer={registrarHoy}
      />
      <Timer />
    </>
  );
};

export default UnidadDetail;
