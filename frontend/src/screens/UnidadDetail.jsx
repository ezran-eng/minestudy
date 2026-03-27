import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';
import InfografiaCarousel from '../components/InfografiaCarousel';
import PDFViewer from '../components/PDFViewer';
import ConfirmModal from '../components/ConfirmModal';
import { useTelegram } from '../hooks/useTelegram';
import api, { registrarPdfVisto, registrarInfografiaVista, registrarQuizResultado, registrarVista, getProgresoUnidad, createTema, updateTema, deleteTema, createQuizPregunta, updateQuizPregunta, deleteQuizPregunta } from '../services/api';
import { useMaterias, useMateriasSeguidas, useInfografias, usePdfs, useVistasUnidad, useInvalidate } from '../hooks/useQueryHooks';
import VistaBadge from '../components/VistaBadge';
import { useActividad } from '../hooks/useActividad';
import { useToast } from '../components/Toast';
import { useMascotaUpdate } from '../context/MascotaContext';

// ─── Help bubble ────────────────────────────────────────────────────────────
const HelpBubble = ({ message }) => (
  <div style={{
    background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '12px 16px', marginBottom: '12px',
    position: 'relative', fontSize: '13px', color: 'var(--text2)',
    lineHeight: 1.5,
  }}>
    <div style={{
      position: 'absolute', top: '-6px', left: '24px',
      width: '12px', height: '12px', background: 'var(--s2)',
      border: '1px solid var(--border)', borderRight: 'none', borderBottom: 'none',
      transform: 'rotate(45deg)',
    }} />
    {message}
  </div>
);

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

// ─── Blank question template ────────────────────────────────────────────────
const blankQuestion = {
  pregunta: '', opcion_a: '', opcion_b: '', opcion_c: '', opcion_d: '',
  respuesta_correcta: 'a', justificacion: '',
};

const UnidadDetail = () => {
  const { id, idx } = useParams();
  const { user } = useTelegram();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { registrarHoy } = useActividad(user?.id, showToast);
  const navigate = useNavigate();
  const location = useLocation();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  const updateMascota = useMascotaUpdate();
  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStart, setCarouselStart] = useState(0);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [pdfsVistos, setPdfsVistos] = useState(new Set());
  const [infografiasVistas, setInfografiasVistas] = useState(new Set());

  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Topic CRUD state
  const [showAddTema, setShowAddTema] = useState(false);
  const [newTemaNombre, setNewTemaNombre] = useState('');
  const [editingTemaId, setEditingTemaId] = useState(null);
  const [editingTemaNombre, setEditingTemaNombre] = useState('');
  const [deleteTemaId, setDeleteTemaId] = useState(null);

  // Quiz management state
  const [showQuizManager, setShowQuizManager] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState({ ...blankQuestion });
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Cached queries
  const { data: allMaterias } = useMaterias(user?.id);
  const { data: seguidasRes } = useMateriasSeguidas(user?.id);
  const { data: infografias = [] } = useInfografias(idx);
  const { data: pdfs = [] } = usePdfs(idx);
  const { data: vistasRes } = useVistasUnidad(idx);
  const vistas = vistasRes?.total ?? null;

  const materia = location.state?.materia || allMaterias?.find(m => m.id === parseInt(id)) || null;
  const unidad = location.state?.unidad || materia?.unidades?.find(u => u.id === parseInt(idx)) || null;

  const isOwner = user?.id && materia && String(materia.creador_id) === String(user.id);

  useEffect(() => {
    if (!user?.id) return;
    registrarVista(idx, user.id).catch(err => console.error('[vista]', err));
  }, [idx, user?.id]);

  useEffect(() => {
    if (!updateMascota || !unidad) return;
    const datos = {
      unidad_nombre: unidad.nombre,
      unidad_progreso: progreso?.porcentaje_total ?? 0,
      temas_count: unidad.temas?.length ?? 0,
    };
    updateMascota({ pantalla: 'unidad', datos });
    window.dispatchEvent(new CustomEvent('mascota:event', {
      detail: { accion: 'enter', pantalla: 'unidad', datos },
    }));
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

  useEffect(() => {
    if (!seguidasRes || !user?.id) return;
    if (!seguidasRes.materia_ids.includes(parseInt(id))) {
      navigate(`/materia/${id}`, { replace: true });
    }
  }, [seguidasRes, user?.id, id, navigate]);

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

  const refreshProgresoRef = useRef(refreshProgreso);
  useEffect(() => { refreshProgresoRef.current = refreshProgreso; });

  const fetchQuizQuestions = async () => {
    try {
      const qRes = await api.get(`/unidades/${idx}/quiz`);
      setQuizQuestions(qRes.data);
    } catch (e) { console.error(e); }
  };

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

  useEffect(() => {
    if (!loading && user?.id) refreshProgreso();
  }, [loading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Topic CRUD handlers ──────────────────────────────────────────────
  const handleAddTema = async () => {
    if (!newTemaNombre.trim()) return;
    try {
      await createTema(parseInt(idx), newTemaNombre.trim());
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setNewTemaNombre('');
      setShowAddTema(false);
    } catch (err) { alert(err.message); }
  };

  const handleEditTema = async (temaId) => {
    if (!editingTemaNombre.trim()) return;
    try {
      await updateTema(temaId, { nombre: editingTemaNombre.trim() });
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setEditingTemaId(null);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteTema = async () => {
    if (!deleteTemaId) return;
    try {
      await deleteTema(deleteTemaId);
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setDeleteTemaId(null);
    } catch (err) { alert(err.message); }
  };

  // ─── Quiz question CRUD handlers ─────────────────────────────────────
  const handleSaveQuestion = async () => {
    const f = questionForm;
    if (!f.pregunta.trim() || !f.opcion_a.trim() || !f.opcion_b.trim() || !f.opcion_c.trim() || !f.opcion_d.trim()) return;
    setSavingQuestion(true);
    try {
      if (editingQuestionId) {
        await updateQuizPregunta(editingQuestionId, f);
      } else {
        await createQuizPregunta(parseInt(idx), f);
      }
      await fetchQuizQuestions();
      setShowQuestionForm(false);
      setEditingQuestionId(null);
      setQuestionForm({ ...blankQuestion });
    } catch (err) { alert(err.message); }
    finally { setSavingQuestion(false); }
  };

  const handleEditQuestion = (q) => {
    setQuestionForm({
      pregunta: q.pregunta, opcion_a: q.opcion_a, opcion_b: q.opcion_b,
      opcion_c: q.opcion_c, opcion_d: q.opcion_d,
      respuesta_correcta: q.respuesta_correcta, justificacion: q.justificacion || '',
    });
    setEditingQuestionId(q.id);
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId) return;
    try {
      await deleteQuizPregunta(deleteQuestionId);
      await fetchQuizQuestions();
      setDeleteQuestionId(null);
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="screen active" style={{ padding: '20px' }}>{t('unit.loadingUnit')}</div>;
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>{t('unit.subjectNotFound')}</div>;
  if (!unidad) return <div className="screen active" style={{ padding: '20px' }}>{t('unit.unitNotFound')}</div>;

  const topicsArray = unidad.temas || [];

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

  const flashBadge = progreso?.flashcards.total > 0
    ? t('unit.dominatedCount', { n: progreso.flashcards.dominadas, total: progreso.flashcards.total })
    : flashcards.length > 0 ? t('unit.cards', { n: flashcards.length }) : t('unit.noCards');

  const quizBadge = progreso?.cuestionario.total > 0 && progreso?.cuestionario.correctas > 0
    ? `${progreso.cuestionario.correctas}/${progreso.cuestionario.total}`
    : quizQuestions.length > 0 ? t('unit.questions', { n: quizQuestions.length }) : t('unit.new');

  // ─── Input style reused in forms ──────────────────────────────────────
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 12px',
    fontSize: '13px', color: 'var(--text)', outline: 'none',
  };

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
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{t('unit.unitProgress')}</span>
                  {vistas !== null && <VistaBadge vistas={vistas} />}
                </div>
                {progreso.flashcards.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>
                    🃏 {t('unit.flashcardsDominated', { n: progreso.flashcards.dominadas, total: progreso.flashcards.total })}
                  </div>
                )}
                {progreso.cuestionario.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '2px' }}>
                    🎯 {t('unit.correctAnswers', { n: progreso.cuestionario.correctas, total: progreso.cuestionario.total })}
                  </div>
                )}
                {progreso.pdfs.total > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    📄 {t('unit.notesViewed', { n: progreso.pdfs.vistos, total: progreso.pdfs.total })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Topics section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('unit.topics', 'Temas')}
            </span>
            {isOwner && (
              <button
                onClick={() => setShowAddTema(true)}
                style={{
                  width: '26px', height: '26px', borderRadius: '6px',
                  border: '1px solid var(--border)', background: 'var(--s2)',
                  color: 'var(--text)', fontSize: '15px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={t('unit.addTopic')}
              >
                +
              </button>
            )}
          </div>

          {isOwner && topicsArray.length === 0 && (
            <HelpBubble message={t('unit.noTopicsHint')} />
          )}

          <div className="pu-topics-box">
            {topicsArray.map((tema) => {
              if (editingTemaId === tema.id) {
                return (
                  <span key={tema.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '3px' }}>
                    <input
                      type="text" value={editingTemaNombre}
                      onChange={e => setEditingTemaNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditTema(tema.id); if (e.key === 'Escape') setEditingTemaId(null); }}
                      autoFocus
                      style={{
                        background: 'var(--s2)', border: '1px solid var(--border)',
                        borderRadius: '6px', padding: '4px 8px', fontSize: '11px',
                        color: 'var(--text)', outline: 'none', width: '100px',
                      }}
                    />
                    <button onClick={() => handleEditTema(tema.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px' }}>✓</button>
                    <button onClick={() => setEditingTemaId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px', color: 'var(--text2)' }}>✕</button>
                  </span>
                );
              }
              return (
                <span
                  key={tema.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'var(--s3)', borderRadius: '8px', padding: '5px 12px',
                    margin: '3px', fontSize: '11px', color: 'var(--text2)', fontWeight: 500,
                  }}
                >
                  {isOwner ? (
                    <span onClick={() => { setEditingTemaId(tema.id); setEditingTemaNombre(tema.nombre); }} style={{ cursor: 'pointer' }}>
                      {tema.nombre}
                    </span>
                  ) : tema.nombre}
                  {isOwner && (
                    <button
                      onClick={() => setDeleteTemaId(tema.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '10px', color: 'var(--text2)', padding: '0 0 0 4px',
                        opacity: 0.6,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}

            {/* Inline add topic */}
            {showAddTema && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '3px' }}>
                <input
                  type="text" value={newTemaNombre}
                  onChange={e => setNewTemaNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTema(); if (e.key === 'Escape') { setShowAddTema(false); setNewTemaNombre(''); } }}
                  placeholder={t('unit.topicName')}
                  autoFocus
                  maxLength={60}
                  style={{
                    background: 'var(--s2)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '4px 8px', fontSize: '11px',
                    color: 'var(--text)', outline: 'none', width: '120px',
                  }}
                />
                <button onClick={handleAddTema} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px' }}>✓</button>
                <button onClick={() => { setShowAddTema(false); setNewTemaNombre(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px', color: 'var(--text2)' }}>✕</button>
              </span>
            )}
          </div>

          <div className="section-head" style={{ marginTop: '18px', marginBottom: '10px' }}>
            <div className="section-title">{t('unit.resources')}</div>
          </div>
          <div className="resources-grid">
            <div className="resource-card flash" onClick={() => setIsFlashOpen(true)}>
              <div className="resource-icon-wrap">🃏</div>
              <div className="resource-info">
                <div className="resource-name">{t('unit.flashcards')}</div>
                <div className="resource-sub">{t('unit.spacedRepetition')}</div>
              </div>
              <div className="resource-badge">{flashBadge}</div>
            </div>
            <div className="resource-card quiz" onClick={() => setIsQuizOpen(true)}>
              <div className="resource-icon-wrap">🎯</div>
              <div className="resource-info">
                <div className="resource-name">{t('unit.questionnaire')}</div>
                <div className="resource-sub">{t('unit.questionsFromPdfs')}</div>
              </div>
              <div className="resource-badge">{quizBadge}</div>
            </div>
          </div>

          {/* Quiz management button for owner */}
          {isOwner && (
            <button
              onClick={() => setShowQuizManager(true)}
              style={{
                width: '100%', marginTop: '10px', padding: '10px',
                borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                border: '1px solid var(--border)', background: 'var(--s2)',
                color: 'var(--text)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              📝 {t('unit.manageQuiz')}
            </button>
          )}

          {infografias.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">{t('unit.infographics')}</div>
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
                <div className="section-title">📄 {t('unit.notes')}</div>
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

      {/* ─── Quiz Manager Modal ──────────────────────────────────────────── */}
      {showQuizManager && (
        <div className="overlay show" id="quiz-mgr-overlay" onClick={e => { if (e.target.id === 'quiz-mgr-overlay') setShowQuizManager(false); }}>
          <div className="sheet" style={{ maxHeight: '85vh', overflow: 'auto' }}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="sheet-title" style={{ margin: 0 }}>{t('unit.manageQuiz')}</div>
              <button
                onClick={() => { setQuestionForm({ ...blankQuestion }); setEditingQuestionId(null); setShowQuestionForm(true); }}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer',
                }}
              >
                + {t('unit.addQuestion')}
              </button>
            </div>

            {quizQuestions.length === 0 && (
              <HelpBubble message={t('unit.noQuestionsHint')} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quizQuestions.map((q, i) => (
                <div key={q.id} style={{
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        {i + 1}. {q.pregunta}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                        A: {q.opcion_a} | B: {q.opcion_b} | C: {q.opcion_c} | D: {q.opcion_d}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '2px' }}>
                        Correcta: {q.respuesta_correcta.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleEditQuestion(q)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text2)', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✏️</button>
                      <button
                        onClick={() => setDeleteQuestionId(q.id)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          border: '1px solid rgba(255,80,80,0.3)', background: 'transparent',
                          color: 'var(--text2)', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Question Form Modal ─────────────────────────────────────────── */}
      {showQuestionForm && (
        <div className="overlay show" id="q-form-overlay" onClick={e => { if (e.target.id === 'q-form-overlay') { setShowQuestionForm(false); setEditingQuestionId(null); } }}>
          <div className="sheet" style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <div className="sheet-handle" />
            <div className="sheet-title">
              {editingQuestionId ? t('unit.editQuestion') : t('unit.addQuestion')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 4px' }}>
              <textarea
                placeholder={t('unit.questionText')}
                value={questionForm.pregunta}
                onChange={e => setQuestionForm(p => ({ ...p, pregunta: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              {['a', 'b', 'c', 'd'].map(opt => (
                <div key={opt} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setQuestionForm(p => ({ ...p, respuesta_correcta: opt }))}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                      border: questionForm.respuesta_correcta === opt ? '2px solid var(--gold)' : '1px solid var(--border)',
                      background: questionForm.respuesta_correcta === opt ? 'rgba(255,215,0,0.2)' : 'transparent',
                      color: 'var(--text)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {opt.toUpperCase()}
                  </button>
                  <input
                    type="text"
                    placeholder={t(`unit.option${opt.toUpperCase()}`)}
                    value={questionForm[`opcion_${opt}`]}
                    onChange={e => setQuestionForm(p => ({ ...p, [`opcion_${opt}`]: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              ))}
              <input
                type="text"
                placeholder={t('unit.justification')}
                value={questionForm.justificacion}
                onChange={e => setQuestionForm(p => ({ ...p, justificacion: e.target.value }))}
                style={inputStyle}
              />
              <button
                onClick={handleSaveQuestion}
                disabled={savingQuestion || !questionForm.pregunta.trim() || !questionForm.opcion_a.trim() || !questionForm.opcion_b.trim() || !questionForm.opcion_c.trim() || !questionForm.opcion_d.trim()}
                style={{
                  padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  background: 'var(--gold)', color: '#000', border: 'none', cursor: 'pointer',
                  opacity: savingQuestion ? 0.6 : 1, marginTop: '4px',
                }}
              >
                {savingQuestion ? '...' : t('unit.saveQuestion')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modals */}
      {deleteTemaId && (
        <ConfirmModal
          title={t('unit.deleteTopic')}
          message={t('unit.deleteTopicMessage')}
          confirmLabel={t('unit.deleteTopicConfirm')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={handleDeleteTema}
          onCancel={() => setDeleteTemaId(null)}
        />
      )}

      {deleteQuestionId && (
        <ConfirmModal
          title={t('unit.deleteQuestion')}
          message={t('unit.deleteQuestionMessage')}
          confirmLabel={t('unit.deleteQuestionConfirm')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={handleDeleteQuestion}
          onCancel={() => setDeleteQuestionId(null)}
        />
      )}

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
        userId={user?.id}
        unidadId={parseInt(idx)}
      />
    </>
  );
};

export default UnidadDetail;
