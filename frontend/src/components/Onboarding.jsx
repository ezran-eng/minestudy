import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';
import { completeOnboarding, updateNotificaciones } from '../services/api';

// ── Lottie segments ──────────────────────────────────────────────────────────
const SEG_FULL = [60, 240];
const SEG_IDLE = [67, 89];

// ── Typewriter ───────────────────────────────────────────────────────────────
function useTypewriter(text, id, speed = 20) {
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

// ── Slide themes ─────────────────────────────────────────────────────────────
const THEMES = [
  'radial-gradient(ellipse at 50% 40%, rgba(42,171,238,0.16) 0%, transparent 60%)',            // language
  'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.18) 0%, transparent 60%)',             // welcome
  'radial-gradient(ellipse at 40% 40%, rgba(96,165,250,0.14) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(139,92,246,0.08) 0%, transparent 50%)',
  'radial-gradient(ellipse at 60% 40%, rgba(167,139,250,0.13) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(96,165,250,0.08) 0%, transparent 50%)',
  'radial-gradient(ellipse at 50% 50%, rgba(96,165,250,0.16) 0%, transparent 60%)',
  'radial-gradient(ellipse at 40% 30%, rgba(167,139,250,0.14) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(245,158,11,0.06) 0%, transparent 50%)',
  'radial-gradient(ellipse at 50% 40%, rgba(52,211,153,0.13) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(96,165,250,0.08) 0%, transparent 50%)',
  'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(96,165,250,0.12) 0%, transparent 50%)',
];

// ── Language options ──────────────────────────────────────────────────────────
const LANGS = [
  { code: 'es', flag: '🇦🇷', label: 'Español' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

// ── Slide definitions ────────────────────────────────────────────────────────
const SLIDES = [
  // 0 — Language
  { text: null, segment: 'full', type: 'language' },
  // 1 — Welcome
  { text: null, segment: 'full', type: 'welcome' },
  // 2 — AI capabilities
  { text: null, segment: 'idle', type: 'ai' },
  // 3 — Features
  { text: null, segment: 'idle', type: 'features' },
  // 4 — Drag demo
  { text: null, segment: 'idle', type: 'drag' },
  // 5 — Privacy
  { text: null, segment: 'idle', type: 'privacy' },
  // 6 — Notifications
  { text: null, segment: 'idle', type: 'notifications' },
  // 7 — Final (includes beta note)
  { text: null, segment: 'full', type: 'final', isFinal: true },
];

// ── Static particles (computed once) ─────────────────────────────────────────
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 2.5,
  x: Math.random() * 100,
  y: Math.random() * 100,
  dur: 18 + Math.random() * 15,
  delay: Math.random() * -20,
  op: 0.12 + Math.random() * 0.18,
}));

// ── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ label, desc, checked, onChange, color = '#a78bfa', delay = 0 }) {
  return (
    <div
      data-interactive
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', borderRadius: '14px',
        background: checked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${checked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
        cursor: 'pointer', transition: 'all 0.2s ease',
        animation: `ob-fade-up 0.35s ease-out ${delay}s both`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 500,
          color: '#fff',
        }}>{label}</div>
        {desc && <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '11px',
          color: 'rgba(255,255,255,0.35)', marginTop: '1px',
        }}>{desc}</div>}
      </div>
      <div style={{
        width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
        background: checked ? color : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s ease',
        position: 'relative',
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: '#fff', position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px',
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, bg, border, delay }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '14px', borderRadius: '16px',
      background: bg, border: `1px solid ${border}`,
      backdropFilter: 'blur(8px)',
      animation: `ob-fade-up 0.4s ease-out ${delay}s both`,
    }}>
      <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff',
      }}>{title}</span>
      <span style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '10.5px',
        color: 'rgba(255,255,255,0.4)', lineHeight: 1.35,
      }}>{desc}</span>
    </div>
  );
}

// ── AI capability pill ───────────────────────────────────────────────────────
function AiPill({ icon, text, delay }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 14px', borderRadius: '14px',
      background: 'rgba(139,92,246,0.1)',
      border: '1px solid rgba(139,92,246,0.2)',
      animation: `ob-fade-up 0.4s ease-out ${delay}s both`,
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 500,
        color: 'rgba(255,255,255,0.75)',
      }}>{text}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════
export default function CinematicOnboarding({ user, onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [noMostrar, setNoMostrar] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [lottieKey, setLottieKey] = useState(0);
  const lottieRef = useRef(null);
  const idleDirRef = useRef(1);
  const modeRef = useRef('full');

  const firstName = user?.first_name || 'estudiante';

  // ── Privacy (5 toggles — matches backend model) ───────────────────────────
  const [privacy, setPrivacy] = useState({
    mostrar_foto: true,
    mostrar_nombre: true,
    mostrar_username: true,
    mostrar_progreso: true,
    mostrar_cursos: true,
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    recordatorio_activo: true,
    racha_activa: true,
    flashcards_activa: true,
  });

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  const [selectedLang, setSelectedLang] = useState(i18n.language?.slice(0, 2) || 'es');

  const handleLangSelect = useCallback((code) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('daathapp_lang', code);
  }, []);

  // ── Slide text (dynamic for welcome & final) ──────────────────────────────
  const slideTexts = useMemo(() => [
    t('onboarding.chooseLanguageDesc'),    // 0 — language
    t('onboarding.helloRedo', { name: firstName }),  // 1 — welcome
    t('onboarding.redoAiDesc'),            // 2 — ai
    t('onboarding.redoFeatures'),          // 3 — features
    t('onboarding.redoDragDemo'),          // 4 — drag
    t('onboarding.redoPrivacy'),           // 5 — privacy
    t('onboarding.redoNotifications'),     // 6 — notifications
    t('onboarding.redoFinal', { name: firstName }), // 7 — final
  ], [t, firstName]);
  const slideText = slideTexts[step];

  // ── Typewriter ────────────────────────────────────────────────────────────
  const { displayed, skip, isComplete } = useTypewriter(slideText, slideKey, 20);

  // ── Lottie ────────────────────────────────────────────────────────────────
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

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((next) => {
    if (next < 0 || next >= SLIDES.length) return;
    modeRef.current = SLIDES[next].segment === 'full' ? 'full' : 'idle-loop';
    idleDirRef.current = 1;
    setStep(next);
    setSlideKey(k => k + 1);
    setLottieKey(k => k + 1);
  }, []);

  const goNext = useCallback(() => goTo(step + 1), [step, goTo]);
  const goPrev = useCallback(() => goTo(step - 1), [step, goTo]);

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

  // ── Tap handler ───────────────────────────────────────────────────────────
  const handleScreenTap = useCallback((e) => {
    if (e.target.closest('[data-interactive], button, input, label, a')) return;
    // Block navigation until typewriter finishes
    if (!isComplete) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.3 && step > 0) goPrev();
    else if (x > 0.4 && !SLIDES[step].isFinal) goNext();
  }, [isComplete, step, goNext, goPrev]);

  const slide = SLIDES[step];

  // ── Redo size & animation ─────────────────────────────────────────────────
  const isBig = slide.type === 'welcome' || slide.type === 'final';
  const redoSize = isBig ? 120 : 80;
  const redoStyle = { width: redoSize, height: redoSize, flexShrink: 0 };

  if (step === 0) {
    redoStyle.animation = 'onboarding-zoom-in 0.6s ease-out both, ob-float 3s ease-in-out infinite 0.6s';
  } else if (slide.type === 'drag') {
    redoStyle.animation = 'onboarding-drag-demo 2.5s ease-in-out infinite';
    redoStyle.filter = 'drop-shadow(0 0 14px rgba(120,180,255,0.8)) drop-shadow(0 0 28px rgba(120,160,255,0.4))';
  } else if (slide.type === 'final') {
    redoStyle.animation = 'ob-float 2s ease-in-out infinite, ob-glow-pulse 2s ease-in-out infinite';
  } else {
    redoStyle.animation = 'ob-float 3s ease-in-out infinite';
  }

  // ── Hint text ─────────────────────────────────────────────────────────────
  const hintText = useMemo(() => {
    if (slide.type === 'language') return null;
    if (!isComplete) return null; // wait for typewriter to finish
    if (step <= 1) return null;
    return t('onboarding.backNext');
  }, [isComplete, step, slide.type, t]);

  return (
    <div
      onClick={handleScreenTap}
      style={{
        position: 'fixed', inset: 0, background: '#000000',
        zIndex: 9800, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `${safeTop + 16}px 20px 24px`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Background gradient ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: THEMES[step] || THEMES[0],
        transition: 'background-image 0.6s ease',
        pointerEvents: 'none',
      }} />

      {/* ── Particles ─────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: step >= 5 ? 'rgba(52,211,153,0.45)' : 'rgba(167,139,250,0.5)',
            left: `${p.x}%`, top: `${p.y}%`, opacity: p.op,
            animation: `ob-particle ${p.dur}s linear ${p.delay}s infinite`,
            transition: 'background 0.6s',
          }} />
        ))}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '3px', width: '100%', maxWidth: '260px',
        marginBottom: '10px', flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            height: '3px', flex: 1, borderRadius: '2px',
            background: i < step ? 'rgba(167,139,250,0.7)'
              : i === step ? 'linear-gradient(90deg, rgba(167,139,250,0.9), rgba(96,165,250,0.9))'
              : 'rgba(255,255,255,0.06)',
            transition: 'all 0.4s ease',
            boxShadow: i === step ? '0 0 6px rgba(167,139,250,0.35)' : 'none',
          }} />
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '14px', width: '100%', maxWidth: '320px',
        position: 'relative', zIndex: 1,
      }}>

        {/* ── Redo ─────────────────────────────────────────────────────── */}
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

        {/* ── Bubble ───────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: '18px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
          padding: '13px 16px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '13.5px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.55,
          maxWidth: '100%', width: '100%',
          minHeight: '40px',
          animation: 'ob-fade-up 0.3s ease-out',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '-5px', left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '10px', height: '10px',
            background: 'rgba(255,255,255,0.06)',
            borderTop: '1px solid rgba(167,139,250,0.2)',
            borderLeft: '1px solid rgba(167,139,250,0.2)',
          }} />
          {displayed || '...'}
        </div>

        {/* ── Slide-specific content ──────────────────────────────────── */}

        {/* Language selector (slide 0) */}
        {slide.type === 'language' && (
          <div data-interactive style={{
            display: 'flex', flexDirection: 'column', gap: '10px', width: '100%',
            animation: 'ob-fade-up 0.4s ease-out',
          }}>
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLangSelect(lang.code)}
                style={{
                  padding: '14px 18px', borderRadius: '14px',
                  border: selectedLang === lang.code
                    ? '2px solid rgba(42,171,238,0.8)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: selectedLang === lang.code
                    ? 'rgba(42,171,238,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <span style={{ fontSize: '28px' }}>{lang.flag}</span>
                <span style={{ fontSize: '15px', fontWeight: 600, flex: 1, textAlign: 'left' }}>{lang.label}</span>
                {selectedLang === lang.code && (
                  <span style={{ fontSize: '18px', color: '#2AABEE' }}>✓</span>
                )}
              </button>
            ))}
            <button
              onClick={goNext}
              style={{
                marginTop: '6px', width: '100%', padding: '14px',
                borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #2AABEE, #1e90d0)',
                color: '#fff', fontFamily: "'Outfit', sans-serif",
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(42,171,238,0.3)',
                transition: 'transform 100ms ease',
              }}
              onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {t('onboarding.continue', 'Continuar')} →
            </button>
          </div>
        )}

        {/* AI capabilities (slide 2) */}
        {slide.type === 'ai' && isComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <AiPill icon="💬" text={t('onboarding.aiExplainTopics')} delay={0} />
            <AiPill icon="🧠" text={t('onboarding.aiGenerateFlashcards')} delay={0.08} />
            <AiPill icon="📈" text={t('onboarding.aiAnalyzeProgress')} delay={0.16} />
          </div>
        )}

        {/* Features (slide 2) */}
        {slide.type === 'features' && isComplete && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
            <FeatureCard icon="🧠" title={t('onboarding.flashcardsFeature')} desc={t('onboarding.flashcardsFeatureDesc')} bg="rgba(167,139,250,0.12)" border="rgba(167,139,250,0.25)" delay={0} />
            <FeatureCard icon="📊" title={t('onboarding.progressFeature')} desc={t('onboarding.progressFeatureDesc')} bg="rgba(96,165,250,0.12)" border="rgba(96,165,250,0.25)" delay={0.08} />
            <FeatureCard icon="🍅" title={t('onboarding.pomodoroFeature')} desc={t('onboarding.pomodoroFeatureDesc')} bg="rgba(248,113,113,0.10)" border="rgba(248,113,113,0.22)" delay={0.16} />
            <FeatureCard icon="✍️" title={t('onboarding.quizzesFeature')} desc={t('onboarding.quizzesFeatureDesc')} bg="rgba(52,211,153,0.10)" border="rgba(52,211,153,0.22)" delay={0.24} />
          </div>
        )}

        {/* Drag demo (slide 3) */}
        {slide.type === 'drag' && isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            width: '100%', maxWidth: '240px',
            animation: 'ob-fade-up 0.4s ease-out 0.1s both',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '12px 14px',
            }}>
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.5)', marginBottom: '8px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>📚 Mineralogía</div>
              <div style={{
                height: '4px', borderRadius: '2px',
                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  width: '65%', height: '100%', borderRadius: '2px',
                  background: 'linear-gradient(90deg, rgba(167,139,250,0.7), rgba(96,165,250,0.7))',
                }} />
              </div>
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.2)', textAlign: 'center',
              animation: 'ob-pulse-text 2s ease-in-out infinite',
            }}>{t('onboarding.dragHint')}</div>
          </div>
        )}

        {/* Privacy (slide 4) — all 5 backend fields */}
        {slide.type === 'privacy' && isComplete && (
          <div data-interactive style={{
            display: 'flex', flexDirection: 'column', gap: '6px', width: '100%',
          }}>
            <Toggle
              label={t('onboarding.privacyPhotoLabel')} desc={t('onboarding.privacyPhotoDesc')}
              checked={privacy.mostrar_foto}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_foto: v }))}
              delay={0}
            />
            <Toggle
              label={t('onboarding.privacyNameLabel')} desc={t('onboarding.privacyNameDesc')}
              checked={privacy.mostrar_nombre}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_nombre: v }))}
              delay={0.06}
            />
            <Toggle
              label={t('onboarding.privacyUsernameLabel')} desc={t('onboarding.privacyUsernameDesc')}
              checked={privacy.mostrar_username}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_username: v }))}
              delay={0.12}
            />
            <Toggle
              label={t('onboarding.privacyProgressLabel')} desc={t('onboarding.privacyProgressDesc')}
              checked={privacy.mostrar_progreso}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_progreso: v }))}
              delay={0.18}
            />
            <Toggle
              label={t('onboarding.privacySubjectsLabel')} desc={t('onboarding.privacySubjectsDesc')}
              checked={privacy.mostrar_cursos}
              onChange={v => setPrivacy(p => ({ ...p, mostrar_cursos: v }))}
              delay={0.24}
            />
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: '2px',
            }}>{t('onboarding.privacyChangeNote')}</div>
          </div>
        )}

        {/* Notifications (slide 5) */}
        {slide.type === 'notifications' && isComplete && (
          <div data-interactive style={{
            display: 'flex', flexDirection: 'column', gap: '6px', width: '100%',
          }}>
            <Toggle
              label={t('onboarding.dailyReminder')} desc={t('onboarding.dailyReminderDesc')}
              checked={notifs.recordatorio_activo}
              onChange={v => setNotifs(n => ({ ...n, recordatorio_activo: v }))}
              color="#34d399" delay={0}
            />
            <Toggle
              label={t('onboarding.streakAtRisk')} desc={t('onboarding.streakAtRiskDesc')}
              checked={notifs.racha_activa}
              onChange={v => setNotifs(n => ({ ...n, racha_activa: v }))}
              color="#f59e0b" delay={0.08}
            />
            <Toggle
              label={t('onboarding.dueFlashcards')} desc={t('onboarding.dueFlashcardsDesc')}
              checked={notifs.flashcards_activa}
              onChange={v => setNotifs(n => ({ ...n, flashcards_activa: v }))}
              color="#60a5fa" delay={0.16}
            />
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '10px',
              color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: '2px',
            }}>{t('onboarding.notifViaTelegram')}</div>
          </div>
        )}

        {/* Final (slide 6) */}
        {slide.isFinal && isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            animation: 'ob-fade-up 0.4s ease-out', width: '100%',
          }}>
            {/* Beta pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '20px',
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <span style={{ fontSize: '12px' }}>🧪</span>
              <span style={{
                fontFamily: "'Outfit', sans-serif", fontSize: '11px', fontWeight: 600,
                color: 'rgba(245,158,11,0.8)', letterSpacing: '0.06em',
              }}>BETA</span>
            </div>

            <label htmlFor="no-mostrar" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: "'Outfit', sans-serif", fontSize: '12px',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
            }}>
              <input
                type="checkbox" id="no-mostrar"
                checked={noMostrar}
                onChange={(e) => setNoMostrar(e.target.checked)}
                style={{ accentColor: '#a78bfa', width: '15px', height: '15px' }}
              />
              {t('onboarding.noShowAgain')}
            </label>

            <button
              onClick={handleFinish} disabled={saving}
              style={{
                width: '100%', maxWidth: '260px', padding: '15px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
                border: 'none',
                color: '#fff', fontFamily: "'Outfit', sans-serif",
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.02em',
                opacity: saving ? 0.6 : 1,
                transition: 'transform 100ms ease, opacity 100ms ease',
                boxShadow: '0 4px 20px rgba(139,92,246,0.35), 0 0 40px rgba(99,102,241,0.15)',
              }}
              onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {saving ? t('onboarding.saving') : t('onboarding.letsGo')}
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom hint ───────────────────────────────────────────────── */}
      {!slide.isFinal && hintText && (
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: '10px', fontWeight: 500,
          color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em',
          paddingTop: '10px', flexShrink: 0, textAlign: 'center',
          position: 'relative', zIndex: 1,
          animation: isComplete ? 'ob-pulse-text 2s ease-in-out infinite' : 'none',
        }}>
          {hintText}
        </div>
      )}
    </div>
  );
}
