// Base API utility
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',  // cookie-based auth
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message || 'Request failed')
  }
  return res.json()
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
