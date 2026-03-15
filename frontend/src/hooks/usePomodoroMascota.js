import { useRef, useCallback } from 'react';

// ── Frases ──────────────────────────────────────────────────────────────────

const FRASES_SUGERENCIA = {
  flashcards: [
    'Tenés flashcards vencidas en {unidad} — ideal para arrancar',
    'Te recomiendo {unidad} de {materia}, tiene mucho por repasar',
    '{unidad} tiene cards pendientes, empecemos por ahí',
  ],
  progreso_bajo: [
    '{unidad} está al {progreso}%, es la que más necesita atención',
    'Hace rato que no repasás {unidad}, ¿arrancamos con esa?',
    '{unidad} de {materia} necesita cariño, vamos',
  ],
  fallback: [
    'Elegí una materia y arrancamos el pomodoro',
    'Cualquier unidad vale, lo importante es arrancar',
  ],
};

const FRASES_INTERVENCION = [
  'Van 10 minutos, vas bien con {unidad} 🔥',
  'Mitad del camino, no aflojés',
  'El cerebro está trabajando, seguí',
  'Cada minuto en {unidad} vale',
  'Concentración activa, muy bien',
  'Ya falta poco, terminalo fuerte',
  'Buen ritmo, {unidad} va tomando forma',
];

const FRASES_COMPLETADO = [
  '¡Pomodoro completo! Merecés el descanso 🏆',
  '25 minutos de {unidad} dominados',
  'Eso es disciplina pura, descansá',
  '¡Completado! 5 minutos para vos',
  'Bien ahí, sesión terminada 💪',
];

const FRASES_DESCANSO = [
  'Descansá, que el cerebro consolida',
  'Estos 5 minutos son parte del aprendizaje',
  'Hidratate, estirá, volvemos enseguida',
  'El descanso es tan importante como el estudio',
  'Aprovechá estos minutos, te los ganaste',
];

const FRASES_VUELTA = [
  '¿Listo para otro round? 💪',
  'Recargado y listo para {unidad}',
  'Volvemos a {unidad}, arrancamos',
  'Otro pomodoro, otra oportunidad',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function pickRandom(arr, lastRef, key) {
  const last = lastRef.current[key];
  const pool = arr.filter(f => f !== last);
  const chosen = (pool.length > 0 ? pool : arr)[Math.floor(Math.random() * (pool.length > 0 ? pool : arr).length)];
  lastRef.current[key] = chosen;
  return chosen;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePomodoroMascota() {
  const lastPhrases = useRef({});

  /**
   * Genera sugerencia de qué estudiar basada en el hint de mascota.
   * hint = { flashcards_due, materia_id, unidad_id, materia_nombre, unidad_nombre }
   * materiasSeguidas = [{ id, nombre, unidades: [{ id, nombre, progreso }] }]
   */
  const getSugerencia = useCallback((hint, materiasSeguidas) => {
    // Priority 1: flashcards vencidas
    if (hint && hint.flashcards_due > 0) {
      const vars = {
        unidad: hint.unidad_nombre,
        materia: hint.materia_nombre,
        progreso: '0',
      };
      return {
        text: interpolate(pickRandom(FRASES_SUGERENCIA.flashcards, lastPhrases, 'sug'), vars),
        objetivo: {
          materia_id: hint.materia_id,
          materia_nombre: hint.materia_nombre,
          unidad_id: hint.unidad_id,
          unidad_nombre: hint.unidad_nombre,
          razon: 'flashcards_vencidas',
        },
      };
    }

    // Priority 2: lowest progress unit in followed materias
    if (materiasSeguidas && materiasSeguidas.length > 0) {
      let lowest = null;
      for (const mat of materiasSeguidas) {
        if (!mat.unidades) continue;
        for (const uni of mat.unidades) {
          const p = uni.progreso ?? 0;
          if (!lowest || p < lowest.progreso) {
            lowest = {
              materia_id: mat.id,
              materia_nombre: mat.nombre,
              unidad_id: uni.id,
              unidad_nombre: uni.nombre,
              progreso: p,
            };
          }
        }
      }
      if (lowest) {
        const vars = {
          unidad: lowest.unidad_nombre,
          materia: lowest.materia_nombre,
          progreso: String(lowest.progreso),
        };
        return {
          text: interpolate(pickRandom(FRASES_SUGERENCIA.progreso_bajo, lastPhrases, 'sug'), vars),
          objetivo: {
            materia_id: lowest.materia_id,
            materia_nombre: lowest.materia_nombre,
            unidad_id: lowest.unidad_id,
            unidad_nombre: lowest.unidad_nombre,
            razon: 'progreso_bajo',
          },
        };
      }
    }

    // Fallback: no data
    return {
      text: pickRandom(FRASES_SUGERENCIA.fallback, lastPhrases, 'sug'),
      objetivo: null,
    };
  }, []);

  const getIntervencion = useCallback((objetivo) => {
    const vars = {
      unidad: objetivo?.unidad_nombre || 'tu estudio',
      materia: objetivo?.materia_nombre || '',
    };
    return interpolate(pickRandom(FRASES_INTERVENCION, lastPhrases, 'int'), vars);
  }, []);

  const getCelebracion = useCallback((objetivo) => {
    const vars = {
      unidad: objetivo?.unidad_nombre || 'la sesión',
      materia: objetivo?.materia_nombre || '',
    };
    return interpolate(pickRandom(FRASES_COMPLETADO, lastPhrases, 'cel'), vars);
  }, []);

  const getDescanso = useCallback((objetivo) => {
    const vars = {
      unidad: objetivo?.unidad_nombre || 'tu estudio',
      materia: objetivo?.materia_nombre || '',
    };
    return interpolate(pickRandom(FRASES_DESCANSO, lastPhrases, 'desc'), vars);
  }, []);

  const getVuelta = useCallback((objetivo) => {
    const vars = {
      unidad: objetivo?.unidad_nombre || 'la siguiente sesión',
      materia: objetivo?.materia_nombre || '',
    };
    return interpolate(pickRandom(FRASES_VUELTA, lastPhrases, 'vuel'), vars);
  }, []);

  return { getSugerencia, getIntervencion, getCelebracion, getDescanso, getVuelta };
}
