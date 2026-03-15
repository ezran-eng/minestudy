import React, { useState, useMemo } from 'react';
import { usePomodoro } from '../context/PomodoroContext';
import { useMascotaHint, useMateriasSeguidas } from '../hooks/useQueryHooks';
import { usePomodoroMascota } from '../hooks/usePomodoroMascota';
import { useTelegram } from '../hooks/useTelegram';
import { useTypewriter } from './mascota/useTypewriter';

/**
 * Panel de sugerencia — se muestra antes del timer cuando no hay objetivo.
 * La mascota analiza datos y sugiere qué estudiar.
 */
export default function PomodoroSugerencia() {
  const { user } = useTelegram();
  const userId = user?.id;
  const { panelOpen, objetivo, hasStarted, startWithObjetivo, closePanel } = usePomodoro();
  const { data: hint } = useMascotaHint(userId);
  const { data: materiasSeguidas } = useMateriasSeguidas(userId);
  const { getSugerencia } = usePomodoroMascota();
  const [showPicker, setShowPicker] = useState(false);

  // Generate suggestion
  const sugerencia = useMemo(() => {
    if (!panelOpen || objetivo || hasStarted) return null;
    return getSugerencia(hint, materiasSeguidas);
  }, [panelOpen, objetivo, hasStarted, hint, materiasSeguidas, getSugerencia]);

  // Typewriter effect for suggestion text
  const bubble = useMemo(() => {
    if (!sugerencia) return null;
    return { text: sugerencia.text, id: Date.now() };
  }, [sugerencia?.text]); // eslint-disable-line
  const { displayed, skip } = useTypewriter(bubble);

  // Don't show if: panel closed, already has objetivo, or timer already started
  if (!panelOpen || objetivo || hasStarted) return null;

  const handleConfirm = () => {
    if (sugerencia?.objetivo) {
      startWithObjetivo(sugerencia.objetivo);
    }
  };

  const handlePickManual = (mat, uni) => {
    startWithObjetivo({
      materia_id: mat.id,
      materia_nombre: mat.nombre,
      unidad_id: uni.id,
      unidad_nombre: uni.nombre,
      razon: 'manual',
    });
    setShowPicker(false);
  };

  return (
    <div
      onClick={closePanel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'mascota-pop 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20, 14, 40, 0.95)',
          border: '1px solid rgba(167, 139, 250, 0.25)',
          borderRadius: '28px',
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: '320px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(140,100,255,0.1)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={closePanel}
          style={{
            position: 'absolute', top: '14px', right: '16px',
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: '22px',
            cursor: 'pointer', lineHeight: 1, padding: 0,
          }}
        >×</button>

        {/* Title */}
        <div style={{
          fontFamily: "'Silkscreen', cursive",
          fontSize: '11px',
          letterSpacing: '0.12em',
          color: 'rgba(167,139,250,0.8)',
          marginBottom: '20px',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          🍅 POMODORO
        </div>

        {!showPicker ? (
          <>
            {/* Mascota suggestion bubble */}
            <div
              onClick={skip}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(167,139,250,0.2)',
                borderRadius: '16px',
                padding: '14px 16px',
                marginBottom: '20px',
                fontFamily: "'Silkscreen', cursive",
                fontSize: '12px',
                color: '#fff',
                lineHeight: 1.6,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              <span style={{
                fontSize: '16px',
                marginRight: '8px',
                verticalAlign: 'middle',
              }}>🐕</span>
              {displayed || '...'}
            </div>

            {/* Objective label */}
            {sugerencia?.objetivo && (
              <div style={{
                textAlign: 'center',
                marginBottom: '16px',
                fontFamily: "'Silkscreen', cursive",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
              }}>
                {sugerencia.objetivo.materia_nombre} → {sugerencia.objetivo.unidad_nombre}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {sugerencia?.objetivo && (
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'rgba(167,139,250,0.2)',
                    border: '1px solid rgba(167,139,250,0.4)',
                    color: '#c4b5fd',
                    fontFamily: "'Silkscreen', cursive",
                    fontSize: '10px',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  ✅ ESTUDIAR ESTO
                </button>
              )}
              <button
                onClick={() => setShowPicker(true)}
                style={{
                  flex: sugerencia?.objetivo ? undefined : 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: "'Silkscreen', cursive",
                  fontSize: '10px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                🔄 ELEGIR OTRO
              </button>
            </div>
          </>
        ) : (
          /* ── Manual picker ──────────────────────────────────────────── */
          <>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {materiasSeguidas && materiasSeguidas.length > 0 ? (
                materiasSeguidas.map(mat => (
                  <div key={mat.id}>
                    <div style={{
                      fontFamily: "'Silkscreen', cursive",
                      fontSize: '10px',
                      color: 'rgba(167,139,250,0.7)',
                      padding: '6px 0 4px',
                      letterSpacing: '0.06em',
                    }}>
                      {mat.emoji || '📚'} {mat.nombre}
                    </div>
                    {mat.unidades?.map(uni => (
                      <button
                        key={uni.id}
                        onClick={() => handlePickManual(mat, uni)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#fff',
                          fontFamily: "'Silkscreen', cursive",
                          fontSize: '10px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          marginBottom: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{uni.nombre}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>
                          {uni.progreso ?? 0}%
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <div style={{
                  fontFamily: "'Silkscreen', cursive",
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  textAlign: 'center',
                  padding: '20px 0',
                }}>
                  No seguís ninguna materia todavía
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: "'Silkscreen', cursive",
                fontSize: '9px',
                cursor: 'pointer',
              }}
            >
              ← VOLVER
            </button>
          </>
        )}
      </div>
    </div>
  );
}
