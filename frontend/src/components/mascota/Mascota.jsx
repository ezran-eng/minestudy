import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import { useNavigate, useLocation } from 'react-router-dom';
import mascotaData from '../../assets/lotties/mascota.json';
import { useMascotaHint, useMateriaResumen } from '../../hooks/useQueryHooks';
import { useMascotaContext } from '../../hooks/useMascotaContext';

import { IDLE_MS, BUBBLE_MS, BLUR_MS, SEG_FULL, SEG_IDLE, SEG_GRAB, loadStorage, saveStorage } from './constants';
import { pickRandomEffect, TransitionEffect } from './effects.jsx';
import { useTypewriter } from './useTypewriter';
import MascotaIcon from './MascotaIcon';
import SpeechBubble from './SpeechBubble';
import MascotaMenu from './MascotaMenu';
import BlurOverlay from './BlurOverlay';

export default function Mascota({ userId }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // En pantallas de estudio activo (quiz/flashcard) el ícono queda detrás del contenido
  const iconZIndex = /\/materia\/.+\/unidad\//.test(pathname) ? 0 : 1001;
  const { data: hint } = useMascotaHint(userId);
  const { getMascotaResponse, getMascotaResponseAI } = useMascotaContext();

  const getMascotaResponseRef = useRef(getMascotaResponse);
  getMascotaResponseRef.current = getMascotaResponse;

  // Stable ref for AI version — avoids stale closure in timers
  const getMascotaResponseAIRef = useRef(null);
  getMascotaResponseAIRef.current = (accion, extraDatos = {}, pantalla = null) =>
    getMascotaResponseAI(userId, accion, extraDatos, pantalla);

  const [activa, setActiva] = useState(() => loadStorage().mascota_activa !== false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [pos, setPos] = useState(() => {
    const p = loadStorage().pos;
    return p || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
  });
  const [bubble, setBubble] = useState(null);
  const [sleeping, setSleeping] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [isBlurFading, setIsBlurFading] = useState(false);
  const [draggingOverMateria, setDraggingOverMateria] = useState(false);
  const [resumenMateriaId, setResumenMateriaId] = useState(null);
  const [transition, setTransition] = useState(null);

  const { data: resumenData } = useMateriaResumen(resumenMateriaId, userId);

  const { displayed, skip } = useTypewriter(bubble);

  const resumenDataRef = useRef(null);
  resumenDataRef.current = resumenData ?? null;

  const posRef = useRef(pos);

  const mascotaRef = useRef(null);
  const bubbleRef = useRef(null);
  const mascotaLottieRef = useRef(null);
  const mascotaModeRef = useRef('intro'); // 'intro' | 'idle-loop' | 'outro'
  const idleDirectionRef = useRef(1);
  const isDraggingRef = useRef(false);

  const [lottieKey, setLottieKey] = useState(0);

  // Icon refs
  const iconModeRef = useRef('idle'); // 'idle' | 'sleeping' | 'waking'
  const lottieIconRef = useRef(null);
  const [iconKey, setIconKey] = useState(0);

  const hoveredMateriaIdRef = useRef(null);
  const hoveredMateriaDataRef = useRef(null);
  const hoverDebounceRef = useRef(null);

  const dragging = useRef(false);
  if (!dragging.current) posRef.current = pos;
  const wasDragging = useRef(false);
  const dragStart = useRef({});
  const idleTimer = useRef(null);
  const bubbleTimer = useRef(null);
  const blurTimer = useRef(null);
  const greeted = useRef(false);

  // ── Bubble / Blur / Idle ──────────────────────────────────────────────

  const fadeOutBlur = useCallback(() => {
    clearTimeout(blurTimer.current);
    setIsBlurFading(true);
    blurTimer.current = setTimeout(() => {
      setIsBlurActive(false);
      setIsBlurFading(false);
    }, 550);
  }, []);

  const showBubble = useCallback((text) => {
    if (!text) return;
    setSleeping(false);
    clearTimeout(bubbleTimer.current);
    clearTimeout(blurTimer.current);
    setIsBlurFading(false);
    setBubble({ text, id: Date.now() });
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
    setIsBlurActive(true);
    blurTimer.current = setTimeout(fadeOutBlur, BLUR_MS);
  }, [fadeOutBlur]);

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    setSleeping(false);
    idleTimer.current = setTimeout(async () => {
      setSleeping(true);
      const msg = await getMascotaResponseAIRef.current('idle');
      setBubble({ text: msg || 'Zzz... 😴', id: Date.now() });
    }, IDLE_MS);
  }, []);

  // ── Lottie animation state machine ────────────────────────────────────

  useEffect(() => {
    if (!activa) return;
    mascotaModeRef.current = 'intro';
    setLottieKey(k => k + 1);
  }, [activa]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (mascotaModeRef.current === 'idle-loop') {
        mascotaLottieRef.current?.setSpeed(0.22);
        mascotaLottieRef.current?.playSegments(SEG_IDLE, true);
      } else {
        mascotaLottieRef.current?.setSpeed(1);
        mascotaLottieRef.current?.playSegments(SEG_FULL, true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [lottieKey]); // eslint-disable-line

  useEffect(() => {
    if (sleeping) {
      mascotaLottieRef.current?.pause();
    } else if (mascotaModeRef.current === 'idle-loop') {
      mascotaLottieRef.current?.play();
    }
  }, [sleeping]);

  useLayoutEffect(() => {
    if (mascotaRef.current) mascotaRef.current.style.transform = '';
  }, [pos]);

  const onMascotaComplete = useCallback(() => {
    if (mascotaModeRef.current === 'outro') {
      saveStorage({ mascota_activa: false });
      iconModeRef.current = 'sleeping';
      setTransition({ type: pickRandomEffect(), x: posRef.current.x, y: posRef.current.y });
      setTimeout(() => setActiva(false), 150);
      return;
    }
    if (mascotaModeRef.current === 'intro') {
      mascotaModeRef.current = 'idle-loop';
      idleDirectionRef.current = 1;
      setLottieKey(k => k + 1);
      return;
    }
    if (mascotaModeRef.current === 'idle-loop' && !isDraggingRef.current) {
      idleDirectionRef.current *= -1;
      mascotaLottieRef.current?.setDirection(idleDirectionRef.current);
      mascotaLottieRef.current?.play();
    }
  }, []); // eslint-disable-line

  // ── Event listeners ───────────────────────────────────────────────────

  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    getMascotaResponseAIRef.current('app_open').then(msg => showBubble(msg));
    resetIdle();
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(bubbleTimer.current);
    };
  }, []); // eslint-disable-line

  const hintDue = hint?.flashcards_due ?? 0;
  useEffect(() => {
    if (hintDue <= 0) return;
    const t = setTimeout(() => {
      showBubble(getMascotaResponseRef.current('enter', { flashcards_vencidas: hintDue }));
    }, 5000);
    return () => clearTimeout(t);
  }, [hintDue]); // eslint-disable-line

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        showBubble(getMascotaResponseRef.current('return_from_bg'));
        resetIdle();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [showBubble, resetIdle]);

  useEffect(() => {
    const handler = () => getMascotaResponseAIRef.current('flashcard_complete').then(msg => showBubble(msg));
    window.addEventListener('mascota:flashcard-complete', handler);
    return () => window.removeEventListener('mascota:flashcard-complete', handler);
  }, [showBubble]);

  useEffect(() => {
    const handler = (e) => {
      const { accion, datos = {}, pantalla: eventPantalla } = e.detail;
      const msg = getMascotaResponseRef.current(accion, datos, eventPantalla || null);
      if (msg) { showBubble(msg); resetIdle(); }
    };
    window.addEventListener('mascota:event', handler);
    return () => window.removeEventListener('mascota:event', handler);
  }, [showBubble, resetIdle]);

  // ── Drag system ───────────────────────────────────────────────────────

  const onPointerDown = useCallback((e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wasDragging.current = false;
    dragging.current = false;
    dragStart.current = {
      px: e.clientX, py: e.clientY,
      ox: posRef.current.x, oy: posRef.current.y,
    };
    showBubble(getMascotaResponseRef.current('grab'));
    resetIdle();
    isDraggingRef.current = false;

    const cardCache = [];
    document.querySelectorAll('[data-materia-id]').forEach(card => {
      cardCache.push({
        rect: card.getBoundingClientRect(),
        id: card.dataset.materiaId,
        nombre: card.dataset.materiaNombre,
        progreso: parseInt(card.dataset.materiaProgreso || '0'),
        unidades: parseInt(card.dataset.materiaUnidades || '0'),
      });
    });

    const onMove = (ev) => {
      const dx = ev.clientX - dragStart.current.px;
      const dy = ev.clientY - dragStart.current.py;

      if (!dragging.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragging.current = true;
        wasDragging.current = true;
        isDraggingRef.current = true;
        setMenuOpen(false);
        showBubble(getMascotaResponseRef.current('drag'));
        if (mascotaModeRef.current === 'idle-loop') {
          mascotaLottieRef.current?.playSegments(SEG_GRAB, true);
          mascotaLottieRef.current?.pause();
        }
      }

      if (!dragging.current) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 64, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 64, dragStart.current.oy + dy));
      mascotaRef.current.style.transform = `translate(${newX - dragStart.current.ox}px, ${newY - dragStart.current.oy}px)`;
      posRef.current = { x: newX, y: newY };

      if (bubbleRef.current) {
        const above = newY > 150;
        const toLeft = newX > window.innerWidth / 2;
        bubbleRef.current.style.bottom = above ? '72px' : '';
        bubbleRef.current.style.top    = above ? '' : '72px';
        bubbleRef.current.style.right  = toLeft ? '0' : '';
        bubbleRef.current.style.left   = toLeft ? '' : '0';
      }

      let foundId = null;
      let foundData = null;
      for (const item of cardCache) {
        const { rect } = item;
        if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
            ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          foundId = item.id;
          foundData = { id: item.id, nombre: item.nombre, progreso: item.progreso, unidades: item.unidades };
          break;
        }
      }

      if (foundId !== hoveredMateriaIdRef.current) {
        hoveredMateriaIdRef.current = foundId;
        hoveredMateriaDataRef.current = foundData;
        clearTimeout(hoverDebounceRef.current);
        if (foundId) {
          setDraggingOverMateria(true);
          window.dispatchEvent(new CustomEvent('mascota:hover-materia', { detail: foundData }));
          showBubble(getMascotaResponseRef.current('hover_materia', foundData, 'study'));
          hoverDebounceRef.current = setTimeout(() => setResumenMateriaId(foundId), 200);
        } else {
          setDraggingOverMateria(false);
          window.dispatchEvent(new CustomEvent('mascota:hover-none'));
        }
      }
    };

    const onUp = () => {
      if (dragging.current) {
        const finalPos = posRef.current;
        setPos(finalPos);
        saveStorage({ pos: finalPos });

        if (hoveredMateriaIdRef.current) {
          const datos = {
            ...(hoveredMateriaDataRef.current ?? {}),
            ...(resumenDataRef.current ?? {}),
          };
          showBubble(getMascotaResponseRef.current('drop_materia', datos, 'study'));
          window.dispatchEvent(new CustomEvent('mascota:hover-none'));
          hoveredMateriaIdRef.current = null;
          hoveredMateriaDataRef.current = null;
          clearTimeout(hoverDebounceRef.current);
          setResumenMateriaId(null);
          setTimeout(() => setDraggingOverMateria(false), BUBBLE_MS);
        } else {
          showBubble(getMascotaResponseRef.current('drop'));
        }
      }
      isDraggingRef.current = false;
      if (dragging.current && mascotaModeRef.current === 'idle-loop') {
        idleDirectionRef.current = 1;
        mascotaLottieRef.current?.setDirection(1);
        mascotaLottieRef.current?.playSegments(SEG_IDLE, true);
      }
      dragging.current = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [showBubble, resetIdle]);

  // ── Tap & menu actions ────────────────────────────────────────────────

  const onTap = useCallback(() => {
    if (wasDragging.current) { wasDragging.current = false; return; }
    resetIdle();
    setMenuOpen(prev => !prev);
  }, [resetIdle]);

  const apagar = useCallback(() => {
    setMenuOpen(false);
    mascotaModeRef.current = 'outro';
    setLottieKey(k => k + 1);
  }, []);

  const activar = useCallback(() => {
    saveStorage({ mascota_activa: true });
    setSleeping(false);
    setActiva(true);
  }, []);

  const clearTransition = useCallback(() => setTransition(null), []);

  // ── Icon logic (key remount + autoplay) ───────────────────────────────

  const iconShouldAutoplay = iconModeRef.current === 'sleeping' || iconModeRef.current === 'waking';

  const onIconDOMLoaded = useCallback(() => {
    const lottie = lottieIconRef.current;
    if (!lottie) return;
    lottie.setSpeed(2.5);
    if (iconModeRef.current === 'idle') {
      lottie.goToAndStop(0, true);
    }
  }, []);

  const onIconTap = useCallback(() => {
    if (iconModeRef.current !== 'idle') return;
    iconModeRef.current = 'waking';
    setIconKey(k => k + 1);
  }, []);

  const onIconComplete = useCallback(() => {
    if (iconModeRef.current === 'waking') {
      iconModeRef.current = 'idle';
      const p = loadStorage().pos || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
      setTransition({ type: pickRandomEffect(), x: p.x, y: p.y });
      activar();
    } else {
      iconModeRef.current = 'idle';
      setIconKey(k => k + 1);
    }
  }, [activar]);

  // ── Derived positions ─────────────────────────────────────────────────

  const bubbleAbove = posRef.current.y > 150;
  const bubbleLeft = posRef.current.x > window.innerWidth / 2;
  const menuAbove = posRef.current.y > window.innerHeight / 2;
  const menuLeft = posRef.current.x > window.innerWidth / 2;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
    {/* Minimized icon — shown when mascota is off */}
    {!activa && (
      <MascotaIcon
        iconKey={iconKey}
        lottieIconRef={lottieIconRef}
        autoplay={iconShouldAutoplay}
        onDOMLoaded={onIconDOMLoaded}
        onComplete={onIconComplete}
        onTap={onIconTap}
        zIndex={iconZIndex}
      />
    )}

    {/* Active mascota */}
    {activa && (
      <>
      {(isBlurActive || isBlurFading) && !draggingOverMateria && (
        <BlurOverlay isFading={isBlurFading} onClick={fadeOutBlur} />
      )}

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
        />
      )}

      <div
        ref={mascotaRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 1001,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <SpeechBubble
          ref={bubbleRef}
          bubble={bubble}
          displayed={displayed}
          hint={hint}
          onSkip={skip}
          above={bubbleAbove}
          left={bubbleLeft}
        />

        {menuOpen && (
          <MascotaMenu
            onApagar={apagar}
            onProximamente={() => { setMenuOpen(false); showBubble('Próximamente 👀'); }}
            onNotificaciones={() => { setMenuOpen(false); navigate('/profile'); }}
            above={menuAbove}
            left={menuLeft}
          />
        )}

        {/* Lottie mascot */}
        <div
          onPointerDown={onPointerDown}
          onClick={onTap}
          style={{
            width: 64,
            height: 64,
            cursor: 'grab',
            touchAction: 'none',
            opacity: sleeping ? 0.5 : 1,
            transition: 'opacity 0.5s, filter 0.5s',
            filter: sleeping
              ? 'grayscale(60%)'
              : isBlurActive
                ? undefined
                : 'none',
            animation: isBlurActive && !sleeping ? 'aurora-pulse 1.5s ease-in-out infinite alternate' : 'none',
          }}
        >
          <Lottie
            key={lottieKey}
            lottieRef={mascotaLottieRef}
            animationData={mascotaData}
            initialSegment={SEG_FULL}
            loop={false}
            autoplay={false}
            onComplete={onMascotaComplete}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      </>
    )}

    {/* Transition effect — persists across activa changes */}
    {transition && (
      <TransitionEffect
        type={transition.type}
        x={transition.x}
        y={transition.y}
        onComplete={clearTransition}
      />
    )}
    </>
  );
}
