const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getInitDataHeader = () => {
  const initData = window.Telegram?.WebApp?.initData;
  return initData ? { 'X-Telegram-Init-Data': initData } : {};
};

const getAdminHeader = () => {
  const secret = import.meta.env.VITE_ADMIN_SECRET;
  return secret ? { 'X-Admin-Token': secret } : {};
};

export const createOrUpdateUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getInitDataHeader(),
    },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    throw new Error('Failed to create or update user');
  }
  return response.json();
};

const api = {
  get: async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: { ...getInitDataHeader(), ...getAdminHeader() },
    });
    if (!response.ok) throw new Error(`GET ${endpoint} failed`);
    const data = await response.json();
    return { data };
  },
  put: async (endpoint, payload) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getInitDataHeader(), ...getAdminHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`PUT ${endpoint} failed`);
    const data = await response.json();
    return { data };
  },
  post: async (endpoint, payload) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getInitDataHeader(), ...getAdminHeader() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`POST ${endpoint} failed`);
    const data = await response.json();
    return { data };
  },
  delete: async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { ...getAdminHeader() },
    });
    if (!response.ok) throw new Error(`DELETE ${endpoint} failed`);
    return {};
  }
};

export default api;

export const getUserProfile = async (idTelegram) => {
  const response = await fetch(`${API_URL}/users/${idTelegram}`);
  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }
  return response.json();
};

export const updateProgress = async (data) => {
  const response = await fetch(`${API_URL}/progreso`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getInitDataHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update progress');
  }
  return response.json();
};

export const getRanking = async () => {
  const response = await fetch(`${API_URL}/ranking`);
  if (!response.ok) {
    throw new Error('Failed to get ranking');
  }
  return response.json();
};

export const getInfografias = async (id_unidad) => {
  const response = await fetch(`${API_URL}/infografias?id_unidad=${id_unidad}`);
  if (!response.ok) throw new Error('Failed to get infografias');
  return response.json();
};

export const uploadInfografia = async (file, id_unidad, titulo) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('id_unidad', id_unidad);
  formData.append('titulo', titulo);
  const response = await fetch(`${API_URL}/admin/infografias/upload`, {
    method: 'POST',
    headers: { ...getAdminHeader() },
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload infografia');
  return response.json();
};

export const deleteInfografia = async (id) => {
  const response = await fetch(`${API_URL}/admin/infografias/${id}`, { method: 'DELETE', headers: { ...getAdminHeader() } });
  if (!response.ok) throw new Error('Failed to delete infografia');
};

export const getPdfs = async (id_unidad) => {
  const response = await fetch(`${API_URL}/pdfs?id_unidad=${id_unidad}`);
  if (!response.ok) throw new Error('Failed to get pdfs');
  return response.json();
};

export const uploadPdf = async (file, id_unidad, titulo) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('id_unidad', id_unidad);
  formData.append('titulo', titulo);
  const response = await fetch(`${API_URL}/admin/pdfs/upload`, {
    method: 'POST',
    headers: { ...getAdminHeader() },
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload pdf');
  return response.json();
};

export const deletePdf = async (id) => {
  const response = await fetch(`${API_URL}/admin/pdfs/${id}`, { method: 'DELETE', headers: { ...getAdminHeader() } });
  if (!response.ok) throw new Error('Failed to delete pdf');
};

export const registrarPdfVisto = async (id_pdf, id_usuario) => {
  const response = await fetch(`${API_URL}/pdfs/${id_pdf}/visto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify({ id_usuario }),
  });
  if (!response.ok) throw new Error('Failed to register pdf visto');
  return response.json();
};

export const registrarInfografiaVista = async (id_infografia, id_usuario) => {
  const response = await fetch(`${API_URL}/infografias/${id_infografia}/vista`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify({ id_usuario }),
  });
  if (!response.ok) throw new Error('Failed to register infografia vista');
  return response.json();
};

export const registrarQuizResultado = async (id_usuario, id_unidad, correctas, total) => {
  const response = await fetch(`${API_URL}/quiz/resultado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify({ id_usuario, id_unidad, correctas, total }),
  });
  if (!response.ok) throw new Error('Failed to register quiz resultado');
  return response.json();
};

export const getProgresoUnidad = async (id_unidad, id_usuario) => {
  const response = await fetch(`${API_URL}/unidades/${id_unidad}/progreso?id_usuario=${id_usuario}`);
  if (!response.ok) throw new Error('Failed to get progreso');
  return response.json();
};

// siguiendo: true = explicit follow, false = explicit unfollow, undefined = legacy toggle
export const toggleSeguirMateria = async (id_materia, id_usuario, siguiendo) => {
  const payload = { id_usuario };
  if (siguiendo !== undefined) payload.siguiendo = siguiendo;
  const response = await fetch(`${API_URL}/materias/${id_materia}/seguir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error('Failed to toggle seguir');
    err.detail = body?.detail;
    throw err;
  }
  return response.json();
};

export const getSeguidoresMateria = async (id_materia) => {
  const response = await fetch(`${API_URL}/materias/${id_materia}/seguidores`);
  if (!response.ok) throw new Error('Failed to get seguidores');
  return response.json();
};

export const getMateriasSeguidas = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/materias-seguidas`, {
    headers: { ...getInitDataHeader() },
  });
  if (!response.ok) throw new Error('Failed to get materias seguidas');
  return response.json();
};

export const deleteProgresoMateria = async (id_usuario, id_materia) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/progreso-materia/${id_materia}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify({ id_usuario }),
  });
  if (!response.ok) throw new Error('Failed to delete progreso materia');
};

export const getUserPerfil = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/perfil`);
  if (!response.ok) throw new Error('Failed to get perfil');
  return response.json();
};

export const registrarVista = async (id_unidad, id_usuario) => {
  const response = await fetch(`${API_URL}/unidades/${id_unidad}/vista`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify({ id_usuario }),
  });
  if (!response.ok) throw new Error('Failed to register vista');
  return response.json();
};

export const getVistasUnidad = async (id_unidad) => {
  const response = await fetch(`${API_URL}/unidades/${id_unidad}/vistas`);
  if (!response.ok) throw new Error('Failed to get vistas');
  return response.json();
};

export const getVistasMateria = async (id_materia) => {
  const response = await fetch(`${API_URL}/materias/${id_materia}/vistas`);
  if (!response.ok) throw new Error('Failed to get vistas materia');
  return response.json();
};

export const getUserStats = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/stats`);
  if (!response.ok) throw new Error('Failed to get user stats');
  return response.json();
};

export const getActividadReciente = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/actividad-reciente`);
  if (!response.ok) throw new Error('Failed to get actividad reciente');
  return response.json();
};

export const getMascotaHint = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/mascota-hint`);
  if (!response.ok) throw new Error('Failed to get mascota hint');
  return response.json();
};

export const getPrivacidad = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/privacidad`, {
    headers: { ...getInitDataHeader() },
  });
  if (!response.ok) throw new Error('Failed to get privacidad');
  return response.json();
};

export const updatePrivacidad = async (id_usuario, data) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/privacidad`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update privacidad');
  return response.json();
};

export const completeOnboarding = async (id_usuario, privacidad) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify(privacidad),
  });
  if (!response.ok) throw new Error('Failed to complete onboarding');
  return response.json();
};

export const getNotificaciones = async (id_usuario) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/notificaciones`, {
    headers: { ...getInitDataHeader() },
  });
  if (!response.ok) throw new Error('Failed to get notificaciones config');
  return response.json();
};

export const updateNotificaciones = async (id_usuario, data) => {
  const response = await fetch(`${API_URL}/usuarios/${id_usuario}/notificaciones`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update notificaciones config');
  return response.json();
};

export const registrarActividad = async (id_telegram, tipo, fecha_local) => {
  const response = await fetch(`${API_URL}/actividad`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getInitDataHeader(),
    },
    body: JSON.stringify({ id_telegram, tipo, fecha_local }),
  });
  if (!response.ok) {
    throw new Error('Failed to register activity');
  }
  return response.json();
};
