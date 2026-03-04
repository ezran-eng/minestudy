import { registrarActividad } from '../services/api';

const STORAGE_KEY = 'actividad_fecha';

export const useActividad = (userId, showToast) => {
  const registrarHoy = async () => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    try {
      const res = await registrarActividad(userId, 'actividad', today);
      localStorage.setItem(STORAGE_KEY, today);

      if (res.primer_dia) {
        showToast('⚡ ¡Comenzaste tu racha! Estudia cada día para mantenerla viva.');
      } else if (res.nueva_racha) {
        showToast(`🔥 ¡Racha de ${res.racha} días! ¡Sigue así!`);
      }
    } catch (err) {
      console.error('Error registrando actividad:', err);
    }
  };

  return { registrarHoy };
};
