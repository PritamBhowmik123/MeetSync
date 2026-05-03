const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth';

function saveSession(user, token) {
  localStorage.setItem('ms_user', JSON.stringify(user));
  localStorage.setItem('ms_token', token);
}

function clearSession() {
  localStorage.removeItem('ms_user');
  localStorage.removeItem('ms_token');
}

export async function getMe() {
  const persisted = localStorage.getItem('ms_user');
  const token = localStorage.getItem('ms_token');
  if (persisted && token) {
    return JSON.parse(persisted);
  }
  throw new Error('Not authenticated');
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const { user, token } = await response.json();
  saveSession(user, token);
  return user;
}

export async function signup(name, email, password) {
  const response = await fetch(`${API_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  const { user, token } = await response.json();
  saveSession(user, token);
  return user;
}

export async function logout() {
  clearSession();
}
