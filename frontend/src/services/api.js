const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const createOrUpdateUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`GET ${endpoint} failed`);
    const data = await response.json();
    return { data };
  },
  put: async (endpoint, payload) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`PUT ${endpoint} failed`);
    const data = await response.json();
    return { data };
  },
  post: async (endpoint, payload) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`POST ${endpoint} failed`);
    const data = await response.json();
    return { data };
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
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload infografia');
  return response.json();
};

export const deleteInfografia = async (id) => {
  const response = await fetch(`${API_URL}/admin/infografias/${id}`, { method: 'DELETE' });
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
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload pdf');
  return response.json();
};

export const deletePdf = async (id) => {
  const response = await fetch(`${API_URL}/admin/pdfs/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete pdf');
};

export const registrarActividad = async (id_telegram, tipo, fecha_local) => {
  const response = await fetch(`${API_URL}/actividad`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id_telegram, tipo, fecha_local }),
  });
  if (!response.ok) {
    throw new Error('Failed to register activity');
  }
  return response.json();
};
