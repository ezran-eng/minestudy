import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';
import { completeOnboarding } from '../services/api';

// ── Lottie segments (read-only, same values as constants.js) ────────────────
const SEG_FULL = [60, 240];
const SEG_IDLE = [67, 89];

// ── Typewriter ──────────────────────────────────────────────────────────────
function useTypewriter(text, id, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!text) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [id]); // eslint-disable-line
  const skip = useCallback(() => setDisplayed(text || ''), [text]);
  const isComplete = displayed === text;
  return { displayed, skip, isComplete };
}

// ── Weather fetcher ─────────────────────────────────────────────────────────
async function fetchWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-24.7821&longitude=-65.4232&current=temperature_2m,weathercode&timezone=America/Argentina/Salta'
    );
    const data = await res.json();
    return Math.round(data.current.temperature_2m);
  } catch {
    return null;
  }
}

// ── Slide definitions ───────────────────────────────────────────────────────
const SLIDES = [
  { text: 'Hola, soy Redo. Tu asistente de estudio personal.', segment: 'full' },
  { text: null, segment: 'idle' }, // dynamic (weather)
  {
    text: 'Conozco tu progreso, tus flashcards vencidas, tus materias. Soy tu copiloto.',
    segment: 'idle',
    features: [
      { emoji: '🧠', label: 'Flashcards SM2' },
      { emoji: '📊', label: 'Progreso real' },
      { emoji: '🍅', label: 'Pomodoro guiado' },
    ],
  },
  { text: 'Arrastrame por la app. Puedo hablarte de cualquier materia que toque.', segment: 'idle', showDragDemo: true },
  { text: 'Estoy en versión beta. Puedo equivocarme, pero aprendo con vos. Reportá cualquier error.', segment: 'idle', showBeta: true },
  { text: '¿Arrancamos? 💪', segment: 'full', isFinal: true },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CinematicOnboarding({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [noMostrar, setNoMostrar] = useState(false);
  const [weather, setWeather] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [lottieKey, setLottieKey] = useState(0);
  const lottieRef = useRef(null);
  const idleDirRef = useRef(1);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  // ── Fetch weather on mount ────────────────────────────────────────────────
  useEffect(() => { fetchWeather().then(setWeather); }, []);

  // ── Build slide text ──────────────────────────────────────────────────────
  const slideText = useMemo(() => {
    if (step === 1) {
      return weather !== null
        ? `Ya sé que estás en Salta... Hoy hay ${weather}°C. Así de conectado estoy. 🌡️`
        : 'Estoy conectado a todo lo que importa para tu estudio.';
    }
    return SLIDES[step].text;
  }, [step, weather]);

  // ── Typewriter ────────────────────────────────────────────────────────────
  const { displayed, skip, isComplete } = useTypewriter(slideText, slideKey, 35);

  // ── Lottie control (runs after each remount via lottieKey) ────────────────
  useEffect(() => {
    // Small delay to ensure lottieRef is ready after remount
    const t = setTimeout(() => {
      const l = lottieRef.current;
      if (!l) return;
      const slide = SLIDES[step];
      if (slide.segment === 'full') {
        l.setSpeed(1);
        l.playSegments(SEG_FULL, true);
      } else {
        l.setSpeed(0.22);
        l.playSegments(SEG_IDLE, true);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [lottieKey]); // eslint-disable-line

  // ── Idle ping-pong via onComplete callback ────────────────────────────────
  const handleLottieComplete = useCallback(() => {
    if (SLIDES[step]?.segment !== 'idle') return;
    const l = lottieRef.current;
    if (!l) return;
    idleDirRef.current *= -1;
    l.setDirection(idleDirRef.current);
    l.playSegments(SEG_IDLE, true);
  }, [step]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (step < SLIDES.length - 1) {
      setStep(s => s + 1);
      setSlideKey(k => k + 1);
      setLottieKey(k => k + 1);
    }
  }, [step]);

  const handleFinish = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    localStorage.setItem('onboarding_completado', 'true');
    if (noMostrar) localStorage.setItem('onboarding_no_mostrar', 'true');

    setExiting(true);

    try {
      await completeOnboarding(user.id, {
        mostrar_foto: true,
        mostrar_nombre: true,
        mostrar_username: true,
        mostrar_progreso: true,
        mostrar_cursos: true,
      });
    } catch (e) {
      console.error('[Onboarding]', e);
    }

    setTimeout(() => onComplete(), 500);
  }, [saving, noMostrar, user, onComplete]);

  const handleBubbleTap = useCallback(() => {
    if (!isComplete) skip();
  }, [isComplete, skip]);

  const slide = SLIDES[step];

  // ── Redo style (separate to avoid conflicting animation props) ────────────
  const redoStyle = { width: 120, height: 120 };
  if (step === 0) {
    redoStyle.animation = 'onboarding-zoom-in 0.6s ease-out both, aurora-pulse 1.5s ease-in-out infinite alternate 0.6s';
  } else if (slide.showDragDemo) {
    redoStyle.animation = 'onboarding-drag-demo 2.5s ease-in-out infinite';
    redoStyle.filter = 'drop-shadow(0 0 16px rgba(120, 180, 255, 0.9)) drop-shadow(0 0 32px rgba(120, 160, 255, 0.5))';
  } else {
    redoStyle.animation = 'aurora-pulse 1.5s ease-in-out infinite alternate';
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${safeTop + 24}px 24px 40px`,
      opacity: exiting ? 0 : 1,
      transform: exiting ? 'scale(0.95)' : 'scale(1)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>

      {/* ── Progress dots ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '280px' }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            height: '3px', flex: 1, borderRadius: '2px',
            background: i <= step ? 'rgba(167, 139, 250, 0.8)' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.4s',
          }} />
        ))}
      </div>

      {/* ── Center area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '24px', width: '100%', maxWidth: '340px',
      }}>

        {/* Beta badge */}
        {slide.showBeta && (
          <div style={{
            fontFamily: "'Silkscreen', cursive", fontSize: '13px', fontWeight: 700,
            color: '#d4a847', letterSpacing: '0.15em',
            animation: 'mascota-pop 0.3s ease-out',
          }}>
            BETA
          </div>
        )}

        {/* ── Redo (Lottie) ────────────────────────────────────────────── */}
        <div style={redoStyle}>
          <Lottie
            key={lottieKey}
            lottieRef={lottieRef}
            animationData={mascotaData}
            autoplay={false}
            loop={false}
            initialSegment={SEG_FULL}
            onComplete={handleLottieComplete}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* ── Speech bubble ────────────────────────────────────────────── */}
        <div
          onClick={handleBubbleTap}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(160, 130, 255, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 12px rgba(140,100,255,0.12)',
            padding: '16px 20px',
            fontFamily: "'Silkscreen', cursive",
            fontSize: '12px', color: '#fff', lineHeight: 1.7,
            maxWidth: 'min(320px, 80vw)', minWidth: '200px', width: '100%',
            cursor: 'pointer', minHeight: '52px',
            animation: 'mascota-pop 0.2s ease-out',
            whiteSpace: 'normal',
          }}
        >
          {displayed || '...'}
        </div>

        {/* ── Feature icons (slide 2) ──────────────────────────────────── */}
        {slide.features && isComplete && (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {slide.features.map((f, i) => (
              <div key={f.label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                animation: `mascota-pop 0.3s ease-out ${i * 0.15}s both`,
              }}>
                <span style={{ fontSize: '24px' }}>{f.emoji}</span>
                <span style={{
                  fontFamily: "'Silkscreen', cursive", fontSize: '9px',
                  color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', textAlign: 'center',
                }}>{f.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Drag demo card (slide 3) ─────────────────────────────────── */}
        {slide.showDragDemo && isComplete && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '12px 16px',
            width: '100%', maxWidth: '220px',
            animation: 'mascota-pop 0.3s ease-out 0.1s both',
          }}>
            <div style={{
              fontFamily: "'Silkscreen', cursive", fontSize: '10px',
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: '4px',
            }}>📚 Materia ejemplo</div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                width: '45%', height: '100%', borderRadius: '2px',
                background: 'linear-gradient(90deg, rgba(167,139,250,0.6), rgba(96,165,250,0.6))',
              }} />
            </div>
          </div>
        )}

        {/* ── Final slide: checkbox + button ────────────────────────────── */}
        {slide.isFinal && isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            animation: 'mascota-pop 0.3s ease-out', width: '100%',
          }}>
            <label htmlFor="no-mostrar" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: "'Silkscreen', cursive", fontSize: '10px',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            }}>
              <input
                type="checkbox" id="no-mostrar"
                checked={noMostrar}
                onChange={(e) => setNoMostrar(e.target.checked)}
                style={{ accentColor: '#a78bfa' }}
              />
              No mostrar otra vez
            </label>
            <button
              onClick={handleFinish} disabled={saving}
              style={{
                width: '100%', maxWidth: '260px', padding: '14px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(96,165,250,0.3))',
                border: '1px solid rgba(167,139,250,0.5)',
                color: '#c4b5fd', fontFamily: "'Silkscreen', cursive",
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.04em', opacity: saving ? 0.6 : 1,
                transition: 'transform 120ms ease, opacity 120ms ease',
              }}
              onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {saving ? 'Cargando...' : '¡Arrancamos!'}
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom: Continue button ────────────────────────────────────── */}
      {!slide.isFinal && (
        <button
          onClick={isComplete ? goNext : skip}
          style={{
            padding: '14px 40px', borderRadius: '16px',
            background: isComplete ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isComplete ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: isComplete ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
            fontFamily: "'Silkscreen', cursive", fontSize: '12px',
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
            transition: 'all 0.2s ease',
          }}
        >
          {isComplete ? 'Continuar' : 'Saltar ▸'}
        </button>
      )}
    </div>
  );
}
