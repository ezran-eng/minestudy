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
