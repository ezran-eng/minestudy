import { useRef, useCallback } from 'react';
import { useMascotaCtx } from '../context/MascotaContext';
import { mascotaChat } from '../services/api';

// ── Todas las frases ──────────────────────────────────────────────────────────
const FRASES = {
  universal: {
    grab:               ['¡Ey! 😮', '¡Me agarraste!', '¡Cuidado! 😅'],
    drag:               ['¡Wheee! 🎉', '¡Me movés!', 'Volando 🚀'],
    drop:               ['¡Gracias! 😊', 'Nueva vista 🎯', 'Aquí me quedo 🏠'],
    app_open:           ['¡Hola! 💪 A estudiar', '¡Bienvenido! 🌟', '¡Listo para aprender! 🚀'],
    return_from_bg:     ['¡De vuelta! 👋', '¿Qué me perdí? 👀', '¡Bienvenido de vuelta! 🎉'],
    idle:               ['Zzz... 😴', '¿Seguís ahí? 👀', 'Descansando 🌙'],
    flashcard_complete: ['¡Sesión completa! Bien hecho', 'Todas repasadas, hasta mañana', 'Eso se llama disciplina 🧠'],
  },
  home: {
    enter_sin_pendientes: [
      'Todo al día, eso me gusta 😌',
      'Sin pendientes. Podés explorar algo nuevo',
      'Buen momento para adelantar algo',
    ],
    enter_con_pendientes: [
      'Tenés {flashcards_vencidas} flashcards esperándote',
      'El repaso de hoy no se va a hacer solo...',
      'Ya van {flashcards_vencidas} cards vencidas, ¿arrancamos?',
    ],
    racha_activa: [
      '🔥 {racha} días seguidos, no pares ahora',
      'La racha sigue viva, cuidala',
      'Cada día cuenta. Ya van {racha}',
    ],
    progreso_bajo: [
      'Todavía hay mucho por descubrir',
      'El camino es largo pero vos podés',
      'Paso a paso, sin apuro',
    ],
    progreso_alto: [
      'Casi lo tenés todo dominado 👀',
      'Estás en la recta final',
      'Impresionante el avance que llevás',
    ],
    idle: ['¿Qué estudiamos hoy?', 'Estoy aquí si me necesitás', 'Cuando quieras arrancamos'],
  },
  unidad: {
    enter: [
      'Bienvenido a {unidad_nombre}',
      '{unidad_nombre} — {unidad_progreso}% completado',
      'Esta unidad tiene {temas_count} temas, dale',
    ],
    progreso_bajo:  ['Recién arrancás en esta unidad', 'Terreno nuevo por explorar', 'Todo esto por aprender, qué bueno'],
    progreso_medio: ['Vas bien en {unidad_nombre}, seguí', 'Ya vas por la mitad, no aflojés', 'Buen ritmo en esta unidad'],
    progreso_alto:  ['Casi dominás {unidad_nombre} 🔥', 'Poco le falta a esta unidad', 'Estás cerca de completarla'],
    completada:     ['¡{unidad_nombre} dominada! 💪', 'Otra unidad para el historial', 'Lo lograste con esta, a la siguiente'],
    idle:           ['¿Qué exploramos en {unidad_nombre}?', 'Estoy aquí si me necesitás', 'Tomá tu tiempo'],
  },
  flashcards: {
    enter:      ['Hora de repasar, yo te acompaño', 'Tenés {cards_restantes} cards hoy. ¿Arrancamos?', 'Memoria activa, vamos'],
    racha:      ['¡En racha! Seguí así 🔥', 'Tres seguidas, estás volando', 'No te para nadie hoy'],
    error:      ['Esa se escapa, pero la vas a dominar', 'Una menos en el pendiente, próxima vez', 'El error es parte del aprendizaje'],
    pocas_cards: ['Ya casi terminás la sesión', 'Últimas {cards_restantes}, terminala fuerte', 'El final está cerca'],
    completada: ['¡Sesión completa! Bien hecho', 'Todas repasadas, hasta mañana', 'Eso se llama disciplina 🧠'],
    idle:       ['Tomá tu tiempo, sin apuro', '¿Necesitás una pista?', 'La respuesta está ahí, pensá'],
  },
  quiz: {
    enter:            ['A ver cuánto sabés 👀', 'Quiz time. Yo ya sé las respuestas jeje', 'Concentración máxima'],
    primera_correcta: ['Buen arranque', 'Bien, una para el marcador', 'Así se empieza'],
    racha:            ['¡Imparable! 🔥', 'Todo bien hasta acá', '¿Estudiaste o sos un genio?'],
    incorrecta:       ['Esa no era, pero seguís', 'Error anotado, a la siguiente', 'Se aprende más del error que del acierto'],
    ultima_pregunta:  ['Última, hacela valer', 'Esta es la definitiva', 'Todo depende de esta'],
    completado_bien:  ['¡Excelente resultado! 🏆', 'Eso es dominar el tema', 'Muy bien, lo tenés claro'],
    completado_mal:   ['Hay que repasar un poco más', 'No fue el mejor día, pero se aprende', 'Con más repaso vas a mejorar, te lo aseguro'],
  },
  perfil: {
    enter:           ['Este sos vos, {nombre_usuario}', 'Tu espacio personal', 'Acá podés ver todo tu progreso'],
    racha:           ['🔥 {racha} días de racha, no está nada mal', 'Esa racha dice mucho de vos'],
    sin_materias:    ['Todavía no seguís ninguna materia', 'Elegí una materia para empezar'],
    muchas_materias: ['Seguís {materias_count} materias, eso es compromiso', 'Bastante en el plato, pero podés'],
  },
  study: {
    idle: [
      'Arrastrame encima de una materia, te cuento todo',
      'Yo vivo aquí, úsame',
      '¿Querés saber de qué trata alguna? Arrastrame',
      'Soy tu guía, llevame donde quieras',
      'Cada materia tiene sus secretos, yo los sé todos',
      'No soy decoración, arrastrame 👀',
    ],
    hover_materia: [
      'Esta es {nombre}...',
      'Tenés {progreso}% de {nombre} completado',
      '{nombre} tiene {unidades} unidades por explorar',
    ],
    drop_materia: [
      '{nombre} — {temas} temas, {flashcards} tarjetas',
      'En {nombre} tenés {vencidas} flashcards vencidas 👀',
      'Llevás {progreso}% en {nombre}, {unidades} unidades en total',
      '¿Arrancamos con {nombre}? Yo te acompaño',
    ],
  },
};

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
  return FRASES[s]?.[k] ? universalKey : null;
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
    const phrases = FRASES[section]?.[subkey];
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
