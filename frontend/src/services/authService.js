const API_URL = 'http://localhost:5000/api/auth';

export async function getMe() {
  const persisted = sessionStorage.getItem('ms_user');
  if (persisted) {
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

  const user = await response.json();
  sessionStorage.setItem('ms_user', JSON.stringify(user));
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

  const user = await response.json();
  sessionStorage.setItem('ms_user', JSON.stringify(user));
  return user;
}

export async function logout() {
  sessionStorage.removeItem('ms_user');
}
