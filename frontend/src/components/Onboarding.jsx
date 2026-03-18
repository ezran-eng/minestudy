import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';
import { completeOnboarding, updateNotificaciones } from '../services/api';

// ── Lottie segments ──────────────────────────────────────────────────────────
const SEG_FULL = [60, 240];
const SEG_IDLE = [67, 89];

// ── Typewriter ───────────────────────────────────────────────────────────────
function useTypewriter(text, id, speed = 22) {
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

// ── Weather fetcher ──────────────────────────────────────────────────────────
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

// ── Slide themes (background gradients per slide) ────────────────────────────
const SLIDE_THEMES = [
  // 0: Welcome — deep space purple
  'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0) 60%)',
  // 1: Weather — cool blue
  'radial-gradient(ellipse at 30% 50%, rgba(96,165,250,0.12) 0%, rgba(0,0,0,0) 60%)',
  // 2: Features — purple-blue
  'radial-gradient(ellipse at 60% 40%, rgba(167,139,250,0.12) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 20% 80%, rgba(96,165,250,0.08) 0%, rgba(0,0,0,0) 50%)',
  // 3: Drag — electric blue
  'radial-gradient(ellipse at 50% 50%, rgba(96,165,250,0.15) 0%, rgba(0,0,0,0) 60%)',
  // 4: Privacy — warm purple
  'radial-gradient(ellipse at 40% 30%, rgba(167,139,250,0.14) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.06) 0%, rgba(0,0,0,0) 50%)',
  // 5: Notifications — emerald-blue
  'radial-gradient(ellipse at 50% 40%, rgba(52,211,153,0.12) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 20% 70%, rgba(96,165,250,0.08) 0%, rgba(0,0,0,0) 50%)',
  // 6: Beta — gold
  'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.10) 0%, rgba(0,0,0,0) 55%)',
  // 7: Final — vibrant purple
  'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.20) 0%, rgba(0,0,0,0) 50%), radial-gradient(ellipse at 50% 80%, rgba(96,165,250,0.10) 0%, rgba(0,0,0,0) 50%)',
];

// ── Slide definitions ────────────────────────────────────────────────────────
const SLIDES = [
  // 0: Welcome
  { text: 'Hola, soy Redo. Tu compañero de estudio con inteligencia artificial.', segment: 'full', type: 'welcome' },
  // 1: Weather (dynamic)
  { text: null, segment: 'idle', type: 'weather' },
  // 2: Features
  {
    text: 'Tengo todo lo que necesitás para estudiar mejor.',
    segment: 'idle',
    type: 'features',
    features: [
      { icon: '🧠', label: 'Flashcards', desc: 'Repaso inteligente SM2', color: 'rgba(167,139,250,0.2)', border: 'rgba(167,139,250,0.35)' },
      { icon: '📊', label: 'Progreso', desc: 'Seguimiento por materia', color: 'rgba(96,165,250,0.2)', border: 'rgba(96,165,250,0.35)' },
      { icon: '🍅', label: 'Pomodoro', desc: 'Focus con descansos', color: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' },
      { icon: '🤖', label: 'IA viva', desc: 'Asistente contextual', color: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
    ],
  },
  // 3: Drag demo
  { text: 'Arrastrame por la pantalla. Te hablo de cualquier materia que toque.', segment: 'idle', type: 'drag' },
  // 4: Privacy
  {
    text: 'Tu perfil es visible para otros estudiantes. Elegí qué compartir.',
    segment: 'idle',
    type: 'privacy',
  },
  // 5: Notifications
  {
    text: 'Puedo recordarte estudiar, avisarte de flashcards vencidas y cuidar tu racha.',
    segment: 'idle',
    type: 'notifications',
  },
  // 6: Beta
  { text: 'Estoy en beta. Puedo equivocarme, pero mejoro con tu feedback.', segment: 'idle', type: 'beta' },
  // 7: Final
  { text: '¿Listo para empezar?', segment: 'full', type: 'final', isFinal: true },
];

// ── Floating particles ───────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 3,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: 15 + Math.random() * 20,
  delay: Math.random() * -20,
  opacity: 0.15 + Math.random() * 0.2,
}));

// ── Toggle component ─────────────────────────────────────────────────────────
function OnboardToggle({ label, desc, checked, onChange, color = '#a78bfa' }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 14px', borderRadius: '14px',
      background: checked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${checked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
      cursor: 'pointer', transition: 'all 0.25s ease',
      animation: 'ob-fade-up 0.4s ease-out both',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 500,
          color: '#fff', letterSpacing: '0.01em',
        }}>{label}</div>
        {desc && <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '11px',
          color: 'rgba(255,255,255,0.35)', marginTop: '2px',
        }}>{desc}</div>}
      </div>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        style={{
          width: '42px', height: '24px', borderRadius: '12px', flexShrink: 0,
          background: checked ? color : 'rgba(255,255,255,0.1)',
          transition: 'background 0.25s ease',
          position: 'relative', cursor: 'pointer',
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: '#fff', position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </label>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
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
  const modeRef = useRef('full');

  // Privacy state
  const [privacy, setPrivacy] = useState({
    mostrar_foto: true,
    mostrar_nombre: true,
    mostrar_username: true,
    mostrar_progreso: true,
    mostrar_cursos: true,
  });

  // Notification state
  const [notifs, setNotifs] = useState({
    recordatorio_activo: true,
    racha_activa: true,
    flashcards_activa: true,
  });

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  // ── Fetch weather on mount ──────────────────────────────────────────────────
  useEffect(() => { fetchWeather().then(setWeather); }, []);

  // ── Build slide text ────────────────────────────────────────────────────────
  const slideText = useMemo(() => {
    if (step === 1) {
      return weather !== null
        ? `Ya sé que estás en Salta y hoy hay ${weather}°C. Así de conectado estoy.`
        : 'Estoy conectado a todo lo que necesitás para tu estudio.';
    }
    return SLIDES[step].text;
  }, [step, weather]);

  // ── Typewriter ──────────────────────────────────────────────────────────────
  const { displayed, skip, isComplete } = useTypewriter(slideText, slideKey, 22);

  // ── Lottie control ──────────────────────────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const l = lottieRef.current;
      if (!l) return;
      if (modeRef.current === 'idle-loop') {
        l.setSpeed(0.22);
        l.playSegments(SEG_IDLE, true);
      } else {
        l.setSpeed(1);
        l.playSegments(SEG_FULL, true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [lottieKey]); // eslint-disable-line

  const handleLottieComplete = useCallback(() => {
    if (modeRef.current === 'full') {
      modeRef.current = 'idle-loop';
      idleDirRef.current = 1;
      setLottieKey(k => k + 1);
      return;
    }
    if (modeRef.current === 'idle-loop') {
      const l = lottieRef.current;
      if (!l) return;
      idleDirRef.current *= -1;
      l.setDirection(idleDirRef.current);
      l.play();
    }
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (step < SLIDES.length - 1) {
      const nextStep = step + 1;
      const nextSegment = SLIDES[nextStep].segment;
      modeRef.current = nextSegment === 'full' ? 'full' : 'idle-loop';
      idleDirRef.current = 1;
      setStep(nextStep);
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
      await Promise.all([
        completeOnboarding(user.id, privacy),
        updateNotificaciones(user.id, notifs),
      ]);
    } catch (e) { console.error('[Onboarding]', e); }
    setTimeout(() => onComplete(), 500);
  }, [saving, noMostrar, user, onComplete, privacy, notifs]);

  // ── Screen tap handler ──────────────────────────────────────────────────────
  const handleScreenTap = useCallback((e) => {
    if (e.target.closest('button, input, label, a, [data-interactive]')) return;
    if (!isComplete) { skip(); return; }
    if (!SLIDES[step].isFinal && e.clientX > window.innerWidth * 0.4) {
      goNext();
    }
  }, [isComplete, skip, step, goNext]);

  const slide = SLIDES[step];

  // ── Redo style ──────────────────────────────────────────────────────────────
  const redoSize = slide.type === 'welcome' || slide.type === 'final' ? 130 : 90;
  const redoStyle = { width: redoSize, height: redoSize, flexShrink: 0 };
  if (step === 0) {
    redoStyle.animation = 'onboarding-zoom-in 0.6s ease-out both, ob-float 3s ease-in-out infinite 0.6s';
  } else if (slide.type === 'drag') {
    redoStyle.animation = 'onboarding-drag-demo 2.5s ease-in-out infinite';
    redoStyle.filter = 'drop-shadow(0 0 16px rgba(120, 180, 255, 0.9)) drop-shadow(0 0 32px rgba(120, 160, 255, 0.5))';
  } else if (slide.type === 'final') {
    redoStyle.animation = 'ob-float 2s ease-in-out infinite, ob-glow-pulse 2s ease-in-out infinite';
  } else {
    redoStyle.animation = 'ob-float 3s ease-in-out infinite';
  }

  return (
    <div
      onClick={handleScreenTap}
      style={{
        position: 'fixed', inset: 0,
        background: '#050510',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `${safeTop + 16}px 24px 28px`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        cursor: 'pointer',
        userSelect: 'none', WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >

      {/* ── Animated background gradient ──────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: SLIDE_THEMES[step] || SLIDE_THEMES[0],
        transition: 'background-image 0.8s ease',
        pointerEvents: 'none',
      }} />

      {/* ── Floating particles ────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%',
            background: step >= 5 ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.5)',
            left: `${p.x}%`, top: `${p.y}%`,
            opacity: p.opacity,
            animation: `ob-particle ${p.duration}s linear ${p.delay}s infinite`,
            transition: 'background 0.8s ease',
          }} />
        ))}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px', width: '100%', maxWidth: '280px',
        marginBottom: '12px', flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            height: '3px', flex: 1, borderRadius: '2px',
            background: i < step
              ? 'rgba(167, 139, 250, 0.7)'
              : i === step
                ? 'linear-gradient(90deg, rgba(167,139,250,0.9), rgba(96,165,250,0.9))'
                : 'rgba(255,255,255,0.08)',
            transition: 'all 0.5s ease',
            boxShadow: i === step ? '0 0 8px rgba(167,139,250,0.4)' : 'none',
          }} />
        ))}
      </div>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '16px', width: '100%', maxWidth: '340px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Step counter */}
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '11px', fontWeight: 500,
          color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em',
          animation: 'ob-fade-up 0.3s ease-out',
        }}>
          {step + 1} / {SLIDES.length}
        </div>

        {/* Beta badge */}
        {slide.type === 'beta' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', borderRadius: '20px',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            animation: 'ob-fade-up 0.4s ease-out',
          }}>
            <span style={{ fontSize: '14px' }}>🧪</span>
            <span style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600,
              color: '#f59e0b', letterSpacing: '0.1em',
            }}>BETA</span>
          </div>
        )}

        {/* ── Redo (Lottie) ───────────────────────────────────────────── */}
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

        {/* ── Speech bubble ───────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '14px 18px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.6,
          maxWidth: 'min(300px, 85vw)', width: '100%',
          minHeight: '44px',
          animation: 'ob-fade-up 0.3s ease-out',
          whiteSpace: 'normal',
          position: 'relative',
        }}>
          {/* Bubble tail */}
          <div style={{
            position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: '12px', height: '12px',
            background: 'rgba(255,255,255,0.06)',
            borderTop: '1px solid rgba(167,139,250,0.2)',
            borderLeft: '1px solid rgba(167,139,250,0.2)',
          }} />
          {displayed || '...'}
        </div>

        {/* ── Features (slide 2) ──────────────────────────────────────── */}
        {slide.type === 'features' && isComplete && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
            width: '100%', maxWidth: '300px',
          }}>
            {slide.features.map((f, i) => (
              <div key={f.label} style={{
                display: 'flex', flexDirection: 'column', gap: '4px',
                padding: '12px', borderRadius: '16px',
                background: f.color,
                border: `1px solid ${f.border}`,
                animation: `ob-fade-up 0.4s ease-out ${i * 0.1}s both`,
                backdropFilter: 'blur(8px)',
              }}>
                <span style={{ fontSize: '20px' }}>{f.icon}</span>
                <span style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 600,
                  color: '#fff',
                }}>{f.label}</span>
                <span style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: '10px',
                  color: 'rgba(255,255,255,0.45)', lineHeight: 1.3,
                }}>{f.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Drag demo (slide 3) ─────────────────────────────────────── */}
        {slide.type === 'drag' && isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            width: '100%', maxWidth: '240px',
            animation: 'ob-fade-up 0.4s ease-out 0.1s both',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '12px 16px',
            }}>
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.5)', marginBottom: '6px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>📚 Mineralogía</div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  width: '65%', height: '100%', borderRadius: '2px',
                  background: 'linear-gradient(90deg, rgba(167,139,250,0.7), rgba(96,165,250,0.7))',
                }} />
              </div>
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.25)', textAlign: 'center',
              animation: 'ob-pulse-text 2s ease-in-out infinite',
            }}>
              ← arrastrá a Redo sobre una materia →
            </div>
          </div>
        )}

        {/* ── Privacy (slide 4) ───────────────────────────────────────── */}
        {slide.type === 'privacy' && isComplete && (
          <div data-interactive style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            width: '100%', maxWidth: '300px',
          }}>
            <OnboardToggle
              label="Foto de perfil"
              desc="Visible en listas de seguidores"
              checked={privacy.mostrar_foto}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_foto: v }))}
            />
            <OnboardToggle
              label="Nombre y apellido"
              desc="Visible en tu perfil público"
              checked={privacy.mostrar_nombre}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_nombre: v }))}
            />
            <OnboardToggle
              label="Progreso y materias"
              desc="Otros ven tu avance"
              checked={privacy.mostrar_progreso}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_progreso: v, mostrar_cursos: v }))}
            />
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '2px',
            }}>
              Podés cambiar esto después en Perfil → Ajustes
            </div>
          </div>
        )}

        {/* ── Notifications (slide 5) ─────────────────────────────────── */}
        {slide.type === 'notifications' && isComplete && (
          <div data-interactive style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            width: '100%', maxWidth: '300px',
          }}>
            <OnboardToggle
              label="Recordatorio diario"
              desc="Te aviso si no estudiaste hoy (08:00)"
              checked={notifs.recordatorio_activo}
              onChange={v => setNotifs(n => ({ ...n, recordatorio_activo: v }))}
              color="#34d399"
            />
            <OnboardToggle
              label="Racha en riesgo"
              desc="Alerta a las 21:00 si tu racha peligra"
              checked={notifs.racha_activa}
              onChange={v => setNotifs(n => ({ ...n, racha_activa: v }))}
              color="#f59e0b"
            />
            <OnboardToggle
              label="Flashcards vencidas"
              desc="Aviso cuando tengas tarjetas para repasar"
              checked={notifs.flashcards_activa}
              onChange={v => setNotifs(n => ({ ...n, flashcards_activa: v }))}
              color="#60a5fa"
            />
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '2px',
            }}>
              Las notificaciones llegan por Telegram
            </div>
          </div>
        )}

        {/* ── Final slide ─────────────────────────────────────────────── */}
        {slide.isFinal && isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            animation: 'ob-fade-up 0.4s ease-out', width: '100%',
          }}>
            <label htmlFor="no-mostrar" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: "'Outfit', sans-serif", fontSize: '12px',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}>
              <input
                type="checkbox" id="no-mostrar"
                checked={noMostrar}
                onChange={(e) => setNoMostrar(e.target.checked)}
                style={{ accentColor: '#a78bfa', width: '16px', height: '16px' }}
              />
              No mostrar otra vez
            </label>
            <button
              onClick={handleFinish} disabled={saving}
              style={{
                width: '100%', maxWidth: '260px', padding: '16px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
                border: 'none',
                color: '#fff', fontFamily: "'Outfit', sans-serif",
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.02em', opacity: saving ? 0.6 : 1,
                transition: 'transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
                boxShadow: '0 4px 20px rgba(139,92,246,0.4), 0 0 40px rgba(99,102,241,0.2)',
              }}
              onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {saving ? 'Guardando...' : '¡Arrancamos!'}
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom hint ───────────────────────────────────────────────── */}
      {!slide.isFinal && (
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '11px', fontWeight: 500,
          color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em',
          paddingTop: '12px', flexShrink: 0, textAlign: 'center',
          position: 'relative', zIndex: 1,
          animation: isComplete ? 'ob-pulse-text 2s ease-in-out infinite' : 'none',
        }}>
          {isComplete ? 'TOCA PARA CONTINUAR →' : 'TOCA PARA SALTAR'}
        </div>
      )}
    </div>
  );
}
