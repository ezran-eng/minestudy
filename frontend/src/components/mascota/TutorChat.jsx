import React, { useState, useRef, useEffect } from 'react';
import { tutorAccion, getUnidadTemas } from '../../services/api';

const ACCIONES = [
  { id: 'concepto_clave', icon: '🧠', label: 'Concepto clave' },
  { id: 'punto_debil',    icon: '📌', label: 'Punto débil' },
  { id: 'practica',       icon: '❓', label: 'Pregunta de práctica' },
  { id: 'explicar_tema',  icon: '📖', label: 'Explicame un tema', hasTemas: true },
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '5px', padding: '12px 14px', alignSelf: 'flex-start' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'rgba(167,139,250,0.6)',
          animation: `ob-fade-up 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

function ResponseCard({ accion, content }) {
  const a = ACCIONES.find(x => x.id === accion) || {};
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '14px',
      animation: 'ob-fade-up 0.25s ease-out',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>{a.icon}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700,
          color: 'rgba(167,139,250,0.7)', letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>REDO · {a.label}</span>
      </div>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: '14px', lineHeight: 1.6,
        color: 'rgba(255,255,255,0.88)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{content}</div>
    </div>
  );
}

function TemaPicker({ temas, onSelect, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,16,0.96)',
      zIndex: 10,
      display: 'flex', flexDirection: 'column',
      padding: '20px 16px',
      animation: 'ob-fade-up 0.2s ease-out',
    }}>
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: '15px', fontWeight: 600, color: '#fff',
        marginBottom: '6px',
      }}>¿Qué tema querés que te explique?</div>
      <div style={{
        fontSize: '12px', color: 'rgba(255,255,255,0.35)',
        marginBottom: '16px',
      }}>Elegí uno de los temas de esta unidad</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {temas.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.nombre)}
            style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px', color: 'rgba(167,139,250,0.9)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >{t.nombre}</button>
        ))}
        {temas.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', paddingTop: '20px' }}>
            Esta unidad no tiene temas cargados
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '12px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '13px', color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
        }}
      >Cancelar</button>
    </div>
  );
}

export default function TutorChat({ userId, unidadId, unidadNombre, materiaNombre, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [temas, setTemas] = useState([]);
  const [resolvedUnidad, setResolvedUnidad] = useState(unidadNombre || null);
  const [resolvedMateria, setResolvedMateria] = useState(materiaNombre || null);
  const [temaPickerOpen, setTemaPickerOpen] = useState(false);
  const scrollRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  // Load temas + names for the unidad
  useEffect(() => {
    if (!unidadId) return;
    getUnidadTemas(unidadId).then(data => {
      setTemas(data.temas ?? []);
      if (!unidadNombre && data.unidad_nombre) setResolvedUnidad(data.unidad_nombre);
      if (!materiaNombre && data.materia_nombre) setResolvedMateria(data.materia_nombre);
    }).catch(() => {});
  }, [unidadId]); // eslint-disable-line

  // Scroll to bottom on new responses
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses, loading]);

  const runAccion = async (accionId, temaNombre = null) => {
    if (loading) return;
    setLoading(true);
    try {
      const { respuesta } = await tutorAccion(userId, unidadId, accionId, temaNombre);
      setResponses(prev => [...prev, { accion: accionId, content: respuesta, id: Date.now() }]);
    } catch (e) {
      setResponses(prev => [...prev, {
        accion: accionId,
        content: 'Perdón, hubo un error. Intentá de nuevo.',
        id: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccion = (a) => {
    if (a.hasTemas) {
      setTemaPickerOpen(true);
    } else {
      runAccion(a.id);
    }
  };

  const handleTemaSelect = (nombre) => {
    setTemaPickerOpen(false);
    runAccion('explicar_tema', nombre);
  };

  const contextLabel = resolvedMateria && resolvedUnidad
    ? `${resolvedMateria} → ${resolvedUnidad}`
    : resolvedMateria || resolvedUnidad || 'General';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000000',
      zIndex: 2500,
      display: 'flex', flexDirection: 'column',
      animation: 'ob-fade-up 0.25s ease-out',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: `${safeTop + 12}px 16px 12px`,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '18px', lineHeight: 1,
            padding: '6px 10px', cursor: 'pointer',
          }}
        >←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '15px', fontWeight: 600, color: '#fff',
          }}>Estudiar con Redo</div>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '11px',
            color: 'rgba(167,139,250,0.7)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{contextLabel}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: '10px',
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.25)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '10px', fontWeight: 600,
          color: 'rgba(167,139,250,0.8)', letterSpacing: '0.04em',
        }}>IA</div>
      </div>

      {/* Scrollable response area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '16px', display: 'flex',
          flexDirection: 'column', gap: '12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {responses.length === 0 && !loading && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: '10px', padding: '20px',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '13px', textAlign: 'center', lineHeight: 1.6,
          }}>
            <div style={{ fontSize: '34px' }}>🐾</div>
            <div>
              {resolvedUnidad
                ? `Elegí una acción para que te ayude con ${resolvedUnidad}`
                : 'Entrá a una unidad para que pueda ayudarte a estudiar'
              }
            </div>
          </div>
        )}

        {responses.map(r => (
          <ResponseCard key={r.id} accion={r.accion} content={r.content} />
        ))}

        {loading && <TypingDots />}
      </div>

      {/* Action buttons */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: `max(12px, env(safe-area-inset-bottom, 12px))`,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(5,5,16,0.97)',
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        {ACCIONES.map(a => (
          <button
            key={a.id}
            onClick={() => handleAccion(a)}
            disabled={loading || !unidadId}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 14px',
              background: (loading || !unidadId) ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.08)',
              border: `1px solid ${(loading || !unidadId) ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.2)'}`,
              borderRadius: '14px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '12px', fontWeight: 500,
              color: (loading || !unidadId) ? 'rgba(255,255,255,0.25)' : 'rgba(167,139,250,0.9)',
              cursor: (loading || !unidadId) ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Tema picker overlay */}
      {temaPickerOpen && (
        <TemaPicker
          temas={temas}
          onSelect={handleTemaSelect}
          onClose={() => setTemaPickerOpen(false)}
        />
      )}
    </div>
  );
}
