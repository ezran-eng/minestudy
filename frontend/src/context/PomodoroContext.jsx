import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const STUDY_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
const STORAGE_KEY = 'pomodoro_state';

// ── Persistence helpers ──────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.savedAt) return null;

    // If it was running, subtract elapsed time
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
  const [panelOpen, setPanelOpen] = useState(false);

  const totalTime = mode === 'study' ? STUDY_TIME : BREAK_TIME;

  // ── Ticker — lives here, runs even when panel is closed ────────────────
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

  // ── Persist to localStorage every 5 seconds while running ──────────────
  useEffect(() => {
    saveState({ secondsLeft, mode, isRunning, pomodorosCompletados });
  }, [secondsLeft, mode, isRunning, pomodorosCompletados]);

  // Also save periodically while running (in case tab crashes)
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      saveState({ secondsLeft, mode, isRunning, pomodorosCompletados });
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, mode, pomodorosCompletados]);

  // ── Actions ────────────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setIsRunning(r => !r);
  }, []);

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

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  // Has been started at least once (timer is not at full)
  const hasStarted = secondsLeft < totalTime || isRunning;

  const value = {
    secondsLeft,
    isRunning,
    mode,
    totalTime,
    pomodorosCompletados,
    panelOpen,
    hasStarted,
    toggle,
    reset,
    toggleMode,
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
