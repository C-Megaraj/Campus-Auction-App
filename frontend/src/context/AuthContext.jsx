import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verify and restore authenticated session on page load / refresh
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      if (data && data.success && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.token) {
      localStorage.setItem('token', data.token)
    }
    setUser(data.user)
    return data
  }

  const register = async ({ name, full_name, email, password }) => {
    const payload = {
      full_name: (full_name || name || '').trim(),
      email: (email || '').trim(),
      password,
    }
    const { data } = await api.post('/auth/register', payload)
    if (data.token) {
      localStorage.setItem('token', data.token)
    }
    setUser(data.user)
    return data
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
