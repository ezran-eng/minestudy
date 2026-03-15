import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const STUDY_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
const STORAGE_KEY = 'pomodoro_state';
const INTERVENCION_INTERVAL = 10 * 60; // every 10 minutes
const DESCANSO_INTERVAL = 2.5 * 60;    // every 2.5 minutes during break

// ── Persistence helpers ──────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.savedAt) return null;

    if (s.isRunning) {
      const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
      s.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
      if (s.secondsLeft <= 0) {
        s.isRunning = false;
        s.secondsLeft = 0;
      }
    }
    return s;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      secondsLeft: state.secondsLeft,
      mode: state.mode,
      isRunning: state.isRunning,
      pomodorosCompletados: state.pomodorosCompletados,
      objetivo: state.objetivo,
      savedAt: Date.now(),
    }));
  } catch { /* ignore */ }
}

// ── Context ──────────────────────────────────────────────────────────────────

const PomodoroContext = createContext(null);

export function PomodoroProvider({ children }) {
  const restored = useRef(loadState());

  const [secondsLeft, setSecondsLeft] = useState(
    () => restored.current?.secondsLeft ?? STUDY_TIME
  );
  const [isRunning, setIsRunning] = useState(
    () => restored.current?.isRunning ?? false
  );
  const [mode, setMode] = useState(
    () => restored.current?.mode ?? 'study'
  );
  const [pomodorosCompletados, setPomodorosCompletados] = useState(
    () => restored.current?.pomodorosCompletados ?? 0
  );
  const [objetivo, setObjetivo] = useState(
    () => restored.current?.objetivo ?? null
  );
  const [panelOpen, setPanelOpen] = useState(false);

  const totalTime = mode === 'study' ? STUDY_TIME : BREAK_TIME;

  // Track last intervention time to fire every 10 min
  const lastIntervencionRef = useRef(null);

  // ── Ticker ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(t => {
        if (t <= 1) {
          setIsRunning(false);
          if (mode === 'study') {
            setPomodorosCompletados(n => n + 1);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, mode]);

  // ── Mascota events ─────────────────────────────────────────────────────

  // Interventions every 10 min (study) or 2.5 min (break)
  useEffect(() => {
    if (!isRunning) {
      lastIntervencionRef.current = null;
      return;
    }

    const interval = mode === 'study' ? INTERVENCION_INTERVAL : DESCANSO_INTERVAL;
    const elapsed = totalTime - secondsLeft;

    // Initialize tracking
    if (lastIntervencionRef.current === null) {
      lastIntervencionRef.current = Math.floor(elapsed / interval);
    }

    const currentSlot = Math.floor(elapsed / interval);
    if (currentSlot > lastIntervencionRef.current && currentSlot > 0) {
      lastIntervencionRef.current = currentSlot;
      const eventName = mode === 'study'
        ? 'mascota:pomodoro-intervencion'
        : 'mascota:pomodoro-descanso';
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { objetivo, elapsed, secondsLeft },
      }));
    }
  }, [secondsLeft, isRunning, mode, totalTime, objetivo]);

  // Timer complete
  useEffect(() => {
    if (secondsLeft === 0 && !isRunning) {
      const eventName = mode === 'study'
        ? 'mascota:pomodoro-completo'
        : 'mascota:pomodoro-vuelta';
      // Small delay to let state settle
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { objetivo, pomodorosCompletados },
        }));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [secondsLeft, isRunning]); // eslint-disable-line

  // ── Persist ────────────────────────────────────────────────────────────
  useEffect(() => {
    saveState({ secondsLeft, mode, isRunning, pomodorosCompletados, objetivo });
  }, [secondsLeft, mode, isRunning, pomodorosCompletados, objetivo]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      saveState({ secondsLeft, mode, isRunning, pomodorosCompletados, objetivo });
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, mode, pomodorosCompletados, objetivo]);

  // ── Actions ────────────────────────────────────────────────────────────
  const toggle = useCallback(() => setIsRunning(r => !r), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(mode === 'study' ? STUDY_TIME : BREAK_TIME);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode(m => {
      const next = m === 'study' ? 'break' : 'study';
      setIsRunning(false);
      setSecondsLeft(next === 'study' ? STUDY_TIME : BREAK_TIME);
      return next;
    });
  }, []);

  const startWithObjetivo = useCallback((obj) => {
    setObjetivo(obj);
    setMode('study');
    setSecondsLeft(STUDY_TIME);
    setIsRunning(true);
    lastIntervencionRef.current = 0;
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const hasStarted = secondsLeft < totalTime || isRunning;

  const value = {
    secondsLeft,
    isRunning,
    mode,
    totalTime,
    pomodorosCompletados,
    objetivo,
    panelOpen,
    hasStarted,
    toggle,
    reset,
    toggleMode,
    startWithObjetivo,
    setObjetivo,
    openPanel,
    closePanel,
  };

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be inside PomodoroProvider');
  return ctx;
}
