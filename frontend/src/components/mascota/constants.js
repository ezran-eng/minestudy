export const STORAGE_KEY = 'mascota_v1';
export const IDLE_MS = 30_000;
export const BUBBLE_MS = 4_500;
export const BLUR_MS = 3_000;

// Lottie animation segments — adjust if segments don't align perfectly
export const SEG_FULL = [60, 240]; // sit → head → wave (full)
export const SEG_IDLE = [67, 89];  // head tilt 0°→12.4° — ping-pong for breathing
export const SEG_GRAB = [130, 131]; // arm at -117.8° (fully raised) — 1-frame freeze

export const loadStorage = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

export const saveStorage = (patch) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadStorage(), ...patch })); } catch { /* ignore */ }
};
