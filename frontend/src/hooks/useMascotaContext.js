import { useRef, useCallback } from 'react';
import { useMascotaCtx } from '../context/MascotaContext';
import { mascotaChat } from '../services/api';
import i18n from '../i18n';

// ── Helper: get phrases from i18n ───────────────────────────────────────────
function getPhrases(section, subkey) {
  const key = `mascota.${section}.${subkey}`;
  const result = i18n.t(key, { returnObjects: true });
  if (Array.isArray(result)) return result;
  return null;
}

// ── Resolución de clave por pantalla + acción ─────────────────────────────────
function resolveKey(accion, pantalla, datos) {
  switch (pantalla) {
    case 'home':
      if (accion === 'enter')    return (datos.flashcards_vencidas ?? 0) > 0 ? 'home.enter_con_pendientes' : 'home.enter_sin_pendientes';
      if (accion === 'racha')    return (datos.racha ?? 0) > 1 ? 'home.racha_activa' : null;
      if (accion === 'progreso') {
        const p = datos.progreso_general ?? 50;
        if (p < 30) return 'home.progreso_bajo';
        if (p > 80) return 'home.progreso_alto';
        return null;
      }
      if (accion === 'idle')     return 'home.idle';
      break;

    case 'unidad':
      if (accion === 'enter')     return 'unidad.enter';
      if (accion === 'completada') return 'unidad.completada';
      if (accion === 'progreso') {
        const p = datos.unidad_progreso ?? 0;
        if (p < 20) return 'unidad.progreso_bajo';
        if (p > 70) return 'unidad.progreso_alto';
        return 'unidad.progreso_medio';
      }
      if (accion === 'idle')      return 'unidad.idle';
      break;

    case 'flashcards':
      if (accion === 'enter')          return 'flashcards.enter';
      if (accion === 'racha')          return 'flashcards.racha';
      if (accion === 'error')          return 'flashcards.error';
      if (accion === 'pocas_cards')    return 'flashcards.pocas_cards';
      if (accion === 'completada' || accion === 'flashcard_complete') return 'flashcards.completada';
      if (accion === 'idle')           return 'flashcards.idle';
      break;

    case 'quiz':
      if (accion === 'enter')           return 'quiz.enter';
      if (accion === 'primera_correcta') return 'quiz.primera_correcta';
      if (accion === 'racha')           return 'quiz.racha';
      if (accion === 'incorrecta')      return 'quiz.incorrecta';
      if (accion === 'ultima_pregunta') return 'quiz.ultima_pregunta';
      if (accion === 'completado')      return (datos.porcentaje_correcto ?? 0) > 70 ? 'quiz.completado_bien' : 'quiz.completado_mal';
      break;

    case 'perfil':
      if (accion === 'enter')   return 'perfil.enter';
      if (accion === 'racha')   return (datos.racha ?? 0) > 0 ? 'perfil.racha' : null;
      if (accion === 'materias') {
        if ((datos.materias_count ?? 0) === 0) return 'perfil.sin_materias';
        if ((datos.materias_count ?? 0) >= 3)  return 'perfil.muchas_materias';
        return null;
      }
      break;

    case 'study':
      if (accion === 'idle')          return 'study.idle';
      if (accion === 'hover_materia') return 'study.hover_materia';
      if (accion === 'drop_materia')  return 'study.drop_materia';
      break;
  }

  // Universal fallback
  const universalKey = `universal.${accion}`;
  const [s, k] = universalKey.split('.');
  return getPhrases(s, k) ? universalKey : null;
}

// Acciones que justifican llamar a la IA (tienen contexto real significativo)
const AI_ACTIONS = new Set(['app_open', 'enter', 'idle', 'flashcard_complete', 'drop_materia']);

// ── Hook principal ─────────────────────────────────────────────────────────────
export function useMascotaContext() {
  const contexto = useMascotaCtx();
  const lastPhrases = useRef({});

  function pickNoRepeat(key, arr) {
    const last = lastPhrases.current[key];
    const pool = arr.filter(f => f !== last);
    const chosen = (pool.length > 0 ? pool : arr)[Math.floor(Math.random() * (pool.length > 0 ? pool : arr).length)];
    lastPhrases.current[key] = chosen;
    return chosen;
  }

  function interpolate(template, datos) {
    return template.replace(/\{(\w+)\}/g, (_, k) => datos[k] ?? '');
  }

  /**
   * Devuelve una frase contextual para la acción dada.
   * overridePantalla permite ignorar el contexto actual (evita race conditions en navegación).
   * En Fase 2: reemplazar el cuerpo por una llamada async a Deepseek.
   */
  function getMascotaResponse(accion, extraDatos = {}, overridePantalla = null) {
    const { pantalla, datos } = contexto;
    const effectivePantalla = overridePantalla || pantalla;
    const merged = { ...datos, ...extraDatos };
    const key = resolveKey(accion, effectivePantalla, merged);
    if (!key) return null;
    const [section, subkey] = key.split('.');
    const phrases = getPhrases(section, subkey);
    if (!phrases || phrases.length === 0) return null;
    return interpolate(pickNoRepeat(key, phrases), merged);
  }

  /**
   * Async — calls LLM for meaningful actions, falls back to local phrases on failure.
   * Only fires for actions in AI_ACTIONS to avoid wasting tokens.
   */
  // Returns { text: string, fromAI: boolean, accion: string|null }
  const getMascotaResponseAI = useCallback(async (userId, accion, extraDatos = {}, overridePantalla = null) => {
    const fallback = getMascotaResponse(accion, extraDatos, overridePantalla);
    if (!userId || !AI_ACTIONS.has(accion)) return { text: fallback, fromAI: false, accion: null };
    try {
      console.log('[mascota-ai] calling', accion, overridePantalla || contexto.pantalla);
      const data = await mascotaChat(
        userId, accion, extraDatos,
        overridePantalla || contexto.pantalla
      );
      if (data?.mensaje) {
        console.log('[mascota-ai] OK:', data.mensaje.slice(0, 50), '| decision:', data.accion);
        return { text: data.mensaje, fromAI: true, accion: data.accion || null };
      }
      return { text: fallback, fromAI: false, accion: null };
    } catch (err) {
      console.warn('[mascota-ai] error, using fallback:', err.message);
      return { text: fallback, fromAI: false, accion: null };
    }
  }, [getMascotaResponse, contexto.pantalla]);

  return { getMascotaResponse, getMascotaResponseAI, contexto };
}
