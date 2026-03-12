import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';
import Timer from '../components/Timer';
import InfografiaCarousel from '../components/InfografiaCarousel';
import PDFViewer from '../components/PDFViewer';
import { useTelegram } from '../hooks/useTelegram';
import api, { registrarPdfVisto, registrarInfografiaVista, registrarQuizResultado, registrarVista, getProgresoUnidad } from '../services/api';
import { useMaterias, useMateriasSeguidas, useInfografias, usePdfs, useVistasUnidad, useInvalidate } from '../hooks/useQueryHooks';
import VistaBadge from '../components/VistaBadge';
import { useActividad } from '../hooks/useActividad';
import { useToast } from '../components/Toast';
import { useMascotaUpdate } from '../context/MascotaContext';

const CircularProgress = ({ pct }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--s3)" strokeWidth="6" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--gold)" strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 34 34)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="34" y="39" textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

const UnidadDetail = () => {
  const { id, idx } = useParams();
  const { user } = useTelegram();
  const { showToast } = useToast();
  const { registrarHoy } = useActividad(user?.id, showToast);
  const navigate = useNavigate();
  const location = useLocation();
  const invalidate = useInvalidate();

  const updateMascota = useMascotaUpdate();
  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [progreso, setProgreso] = useState(null);
  // Local sets for immediate feedback before API refetch
  const [pdfsVistos, setPdfsVistos] = useState(new Set());
  const [infografiasVistas, setInfografiasVistas] = useState(new Set());

  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cached queries
  const { data: allMaterias } = useMaterias();
  const { data: seguidasRes } = useMateriasSeguidas(user?.id);
  const { data: infografias = [] } = useInfografias(idx);
  const { data: pdfs = [] } = usePdfs(idx);
  const { data: vistasRes } = useVistasUnidad(idx);
  const vistas = vistasRes?.total ?? null;

  const materia = location.state?.materia || allMaterias?.find(m => m.id === parseInt(id)) || null;
  const unidad = location.state?.unidad || materia?.unidades?.find(u => u.id === parseInt(idx)) || null;

  // Register a view when user enters the unit
  useEffect(() => {
    if (!user?.id) return;
    registrarVista(idx, user.id).catch(err => console.error('[vista]', err));
  }, [idx, user?.id]);

  // Mascota context — update on enter and on modal open/close
  useEffect(() => {
    if (!updateMascota || !unidad) return;
    updateMascota({
      pantalla: 'unidad',
      datos: {
        unidad_nombre: unidad.nombre,
        unidad_progreso: progreso?.porcentaje_total ?? 0,
        temas_count: unidad.temas?.length ?? 0,
      },
    });
  }, [unidad?.id, progreso?.porcentaje_total]); // eslint-disable-line

  useEffect(() => {
    if (!updateMascota || !unidad) return;
    if (isFlashOpen) {
      updateMascota({
        pantalla: 'flashcards',
        datos: { cards_restantes: flashcards.length, unidad_nombre: unidad.nombre },
      });
    } else {
      updateMascota({
        pantalla: 'unidad',
        datos: {
          unidad_nombre: unidad.nombre,
          unidad_progreso: progreso?.porcentaje_total ?? 0,
          temas_count: unidad.temas?.length ?? 0,
        },
      });
    }
  }, [isFlashOpen]); // eslint-disable-line

  useEffect(() => {
    if (!updateMascota || !unidad) return;
    if (isQuizOpen) {
      updateMascota({
        pantalla: 'quiz',
        datos: { total_preguntas: quizQuestions.length, unidad_nombre: unidad.nombre },
      });
    } else {
      updateMascota({
        pantalla: 'unidad',
        datos: {
          unidad_nombre: unidad.nombre,
          unidad_progreso: progreso?.porcentaje_total ?? 0,
          temas_count: unidad.temas?.length ?? 0,
        },
      });
    }
  }, [isQuizOpen]); // eslint-disable-line

  // Access guard: redirect if user doesn't follow this materia
  useEffect(() => {
    if (!seguidasRes || !user?.id) return;
    if (!seguidasRes.materia_ids.includes(parseInt(id))) {
      navigate(`/materia/${id}`, { replace: true });
    }
  }, [seguidasRes, user?.id, id, navigate]);

  // Keep stable refs so callbacks inside child components never go stale
  const idxRef = useRef(idx);
  const userIdRef = useRef(user?.id);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const refreshProgreso = async () => {
    if (!userIdRef.current) return;
    try {
      const res = await getProgresoUnidad(idxRef.current, userIdRef.current);
      setProgreso(res);
      setPdfsVistos(new Set(res.pdfs?.ids_vistos || []));
      setInfografiasVistas(new Set(res.infografias?.ids_vistas || []));
    } catch (e) {
      console.error(e);
    }
  };

  // Stable ref so child components (Flashcard) always call the latest version
  const refreshProgresoRef = useRef(refreshProgreso);
  useEffect(() => { refreshProgresoRef.current = refreshProgreso; });

  // Fetch flashcards + quiz (not cached — unit-specific and lightweight)
  useEffect(() => {
    const fetchUnitResources = async () => {
      try {
        const userId = user?.id;
        const fcEndpoint = userId
          ? `/flashcards/due?id_unidad=${idx}&id_usuario=${userId}`
          : `/unidades/${idx}/flashcards`;
        const [fcRes, qRes] = await Promise.all([
          api.get(fcEndpoint),
          api.get(`/unidades/${idx}/quiz`),
        ]);
        setFlashcards(fcRes.data);
        setQuizQuestions(qRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUnitResources();
  }, [idx, user?.id]);

  // Fetch progreso once after main data loads
  useEffect(() => {
    if (!loading && user?.id) refreshProgreso();
  }, [loading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="screen active" style={{ padding: '20px' }}>Cargando unidad...</div>;
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  if (!unidad) return <div className="screen active" style={{ padding: '20px' }}>Unidad no encontrada</div>;

  const topicsArray = unidad.temas.map(t => t.nombre);

  const openCarousel = (i) => {
    setCarouselStart(i);
    setIsCarouselOpen(true);
    registrarHoy();
  };

  const openPdf = async (pdf) => {
    setSelectedPdf(pdf);
    setIsPdfOpen(true);
    registrarHoy();
    if (user?.id) {
      setPdfsVistos(prev => new Set([...prev, pdf.id]));
      try {
        await registrarPdfVisto(pdf.id, user.id);
        await refreshProgreso();
      } catch (e) { console.error(e); }
    }
  };

  const handleInfografiaVista = async (infId) => {
    if (!user?.id || infografiasVistas.has(infId)) return;
    setInfografiasVistas(prev => new Set([...prev, infId]));
    try {
      await registrarInfografiaVista(infId, user.id);
      await refreshProgreso();
    } catch (e) { console.error(e); }
  };

  const handleQuizFinish = async (correctas, total) => {
    if (!user?.id) return;
    try {
      await registrarQuizResultado(user.id, parseInt(idx), correctas, total);
      await refreshProgreso();
    } catch (e) { console.error(e); }
  };

  const handleCardReviewed = () => {
    refreshProgresoRef.current();
  };

  // Badge helpers
  const flashBadge = progreso?.flashcards.total > 0
    ? `${progreso.flashcards.dominadas}/${progreso.flashcards.total} dominadas`
    : flashcards.length > 0 ? `${flashcards.length} tarjetas` : 'Sin tarjetas';

  const quizBadge = progreso?.cuestionario.total > 0 && progreso?.cuestionario.correctas > 0
    ? `${progreso.cuestionario.correctas}/${progreso.cuestionario.total}`
    : quizQuestions.length > 0 ? `${quizQuestions.length} preguntas` : 'Nuevo';

  return (
    <>
      <div className="screen active screen-container" id="screen-unidad">
        <div className="fab-back-btn">
          <div className="btn-back" onClick={() => navigate(`/materia/${id}`)}>‹</div>
        </div>
        <div className="detail-body detail-body-pad">

          {/* Progress bar */}
          {progreso && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              background: 'var(--s2)', borderRadius: '14px',
              padding: '14px 16px', marginBottom: '20px',
              border: '1px solid var(--border)',
            }}>
              <CircularProgress pct={progreso.porcentaje_total} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Progreso de la unidad</span>
                  {vistas !== null && <VistaBadge vistas={vistas} />}
                </div>
                {progreso.flashcards.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>
                    🃏 {progreso.flashcards.dominadas}/{progreso.flashcards.total} flashcards dominadas
                  </div>
                )}
                {progreso.cuestionario.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>
                    🎯 {progreso.cuestionario.correctas}/{progreso.cuestionario.total} respuestas correctas
                  </div>
                )}
                {progreso.pdfs.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    📄 {progreso.pdfs.vistos}/{progreso.pdfs.total} apuntes vistos
                  </div>
                )}
              </div>
            </div>
          )}

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
              <div className="resource-badge">{flashBadge}</div>
            </div>
            <div className="resource-card quiz" onClick={() => setIsQuizOpen(true)}>
              <div className="resource-icon-wrap">🎯</div>
              <div className="resource-info">
                <div className="resource-name">Cuestionario</div>
                <div className="resource-sub">Preguntas desde tus PDFs</div>
              </div>
              <div className="resource-badge">{quizBadge}</div>
            </div>
          </div>

          {infografias.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">Infografías</div>
              </div>
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
                    <img src={inf.url} alt={inf.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {infografiasVistas.has(inf.id) && (
                      <div style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: 'rgba(0,0,0,0.55)', borderRadius: '50%',
                        width: '20px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px',
                      }}>✅</div>
                    )}
                  </div>
                ))}
              </div>
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
                    {pdfsVistos.has(pdf.id)
                      ? <span style={{ fontSize: '16px' }}>✅</span>
                      : <span style={{ fontSize: '18px', color: 'var(--text2)' }}>›</span>
                    }
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
        onImageView={handleInfografiaVista}
      />
      <Flashcard
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        materiaName={materia.nombre}
        userId={user?.id}
        customCards={flashcards.length > 0 ? flashcards.map(f => ({ id: f.id, q: f.pregunta, a: f.respuesta })) : null}
        onFirstAction={registrarHoy}
        onCardReviewed={handleCardReviewed}
      />
      <Quiz
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        customQuestions={quizQuestions.length > 0 ? quizQuestions : null}
        onFirstAnswer={registrarHoy}
        onQuizFinish={handleQuizFinish}
      />
      <Timer />
    </>
  );
};

export default UnidadDetail;
