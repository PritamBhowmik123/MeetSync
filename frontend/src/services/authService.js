import { delay } from './api'

const MOCK_USER = {
  id: 'usr_1',
  name: 'Alex Johnson',
  email: 'alex@meetsync.ai',
  avatar: null,
  role: 'admin',
}

let currentUser = null

export async function getMe() {
  await delay(400)
  // Simulate session persistence via an in-memory flag
  const persisted = sessionStorage.getItem('ms_user')
  if (persisted) {
    currentUser = JSON.parse(persisted)
    return currentUser
  }
  throw new Error('Not authenticated')
}

export async function login(email, password) {
  await delay(800)
  if (!email || !password) throw new Error('Email and password required')
  if (password.length < 6) throw new Error('Invalid credentials')
  currentUser = { ...MOCK_USER, email }
  sessionStorage.setItem('ms_user', JSON.stringify(currentUser))
  return currentUser
}

export async function signup(name, email, password) {
  await delay(900)
  if (!name || !email || !password) throw new Error('All fields required')
  if (password.length < 6) throw new Error('Password must be at least 6 characters')
  currentUser = { ...MOCK_USER, name, email, id: `usr_${Date.now()}` }
  sessionStorage.setItem('ms_user', JSON.stringify(currentUser))
  return currentUser
}

export async function logout() {
  await delay(200)
  currentUser = null
  sessionStorage.removeItem('ms_user')
}
