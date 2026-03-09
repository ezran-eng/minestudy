import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, {
  getMateriasSeguidas,
  getProgresoUnidad,
  getVistasMateria,
  getVistasUnidad,
  getSeguidoresMateria,
  getUserPerfil,
  getUserStats,
  getActividadReciente,
  getInfografias,
  getPdfs,
  getPrivacidad,
  getNotificaciones,
} from '../services/api';

// ── Materias (public, rarely changes) ──────────────────────────────────────
export const useMaterias = () =>
  useQuery({
    queryKey: ['materias'],
    queryFn: async () => { const r = await api.get('/materias'); return r.data; },
    staleTime: 5 * 60 * 1000, // 5 min
  });

// ── Materias seguidas by user ──────────────────────────────────────────────
export const useMateriasSeguidas = (userId) =>
  useQuery({
    queryKey: ['materias-seguidas', userId],
    queryFn: () => getMateriasSeguidas(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s
  });

// ── Progreso per unit (most called — cache aggressively) ───────────────────
export const useProgresoUnidad = (idUnidad, userId) =>
  useQuery({
    queryKey: ['progreso', idUnidad, userId],
    queryFn: () => getProgresoUnidad(idUnidad, userId),
    enabled: !!idUnidad && !!userId,
    staleTime: 60 * 1000, // 1 min
  });

// ── Vistas materia ─────────────────────────────────────────────────────────
export const useVistasMateria = (idMateria) =>
  useQuery({
    queryKey: ['vistas-materia', idMateria],
    queryFn: () => getVistasMateria(idMateria),
    enabled: !!idMateria,
    staleTime: 2 * 60 * 1000,
  });

// ── Vistas unidad ──────────────────────────────────────────────────────────
export const useVistasUnidad = (idUnidad) =>
  useQuery({
    queryKey: ['vistas-unidad', idUnidad],
    queryFn: () => getVistasUnidad(idUnidad),
    enabled: !!idUnidad,
    staleTime: 2 * 60 * 1000,
  });

// ── Seguidores materia ─────────────────────────────────────────────────────
export const useSeguidoresMateria = (idMateria) =>
  useQuery({
    queryKey: ['seguidores', idMateria],
    queryFn: () => getSeguidoresMateria(idMateria),
    enabled: !!idMateria,
    staleTime: 30 * 1000,
  });

// ── User perfil ────────────────────────────────────────────────────────────
export const useUserPerfil = (userId) =>
  useQuery({
    queryKey: ['perfil', userId],
    queryFn: () => getUserPerfil(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

// ── User stats ─────────────────────────────────────────────────────────────
export const useUserStats = (userId) =>
  useQuery({
    queryKey: ['stats', userId],
    queryFn: () => getUserStats(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

// ── Actividad reciente ─────────────────────────────────────────────────────
export const useActividadReciente = (userId) =>
  useQuery({
    queryKey: ['actividad-reciente', userId],
    queryFn: () => getActividadReciente(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

// ── Infografías per unit ───────────────────────────────────────────────────
export const useInfografias = (idUnidad) =>
  useQuery({
    queryKey: ['infografias', idUnidad],
    queryFn: () => getInfografias(idUnidad),
    enabled: !!idUnidad,
    staleTime: 5 * 60 * 1000,
  });

// ── PDFs per unit ──────────────────────────────────────────────────────────
export const usePdfs = (idUnidad) =>
  useQuery({
    queryKey: ['pdfs', idUnidad],
    queryFn: () => getPdfs(idUnidad),
    enabled: !!idUnidad,
    staleTime: 5 * 60 * 1000,
  });

// ── Privacidad ─────────────────────────────────────────────────────────────
export const usePrivacidad = (userId) =>
  useQuery({
    queryKey: ['privacidad', userId],
    queryFn: () => getPrivacidad(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

// ── Notificaciones ─────────────────────────────────────────────────────────
export const useNotificaciones = (userId) =>
  useQuery({
    queryKey: ['notificaciones', userId],
    queryFn: () => getNotificaciones(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

// ── Invalidation helpers ───────────────────────────────────────────────────
export const useInvalidate = () => {
  const qc = useQueryClient();
  return {
    progreso: (idUnidad, userId) => qc.invalidateQueries({ queryKey: ['progreso', idUnidad, userId] }),
    allProgreso: () => qc.invalidateQueries({ queryKey: ['progreso'] }),
    seguidas: (userId) => qc.invalidateQueries({ queryKey: ['materias-seguidas', userId] }),
    seguidores: (idMateria) => qc.invalidateQueries({ queryKey: ['seguidores', idMateria] }),
    perfil: (userId) => qc.invalidateQueries({ queryKey: ['perfil', userId] }),
  };
};
