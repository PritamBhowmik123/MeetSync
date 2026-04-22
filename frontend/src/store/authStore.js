import { create } from 'zustand'
import { login as apiLogin, signup as apiSignup, logout as apiLogout, getMe } from '../services/authService'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: false,
  error: null,

  initAuth: async () => {
    try {
      set({ loading: true })
      const user = await getMe()
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const user = await apiLogin(email, password)
      set({ user, loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      const user = await apiSignup(name, email, password)
      set({ user, loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  logout: async () => {
    await apiLogout()
    set({ user: null })
  },

  clearError: () => set({ error: null }),
}))
