import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: 'listener' | 'broadcaster' | 'admin'
}

interface AuthContextType {
  user: User | null
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token')
      const cachedUser = localStorage.getItem('user')

      if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        setLoading(false)
        return
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      if (cachedUser && cachedUser !== 'undefined') {
        try { setUser(JSON.parse(cachedUser)) } catch {}
      }
      try {
        const { data } = await api.get('/auth/verify', { timeout: 8000 })
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } catch (err: any) {
        // 401 handled by api interceptor (attempts refresh, clears on failure)
        // 403 = invalid token, clear session manually
        if (err.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          delete axios.defaults.headers.common['Authorization']
          setUser(null)
        }
      }
      setLoading(false)
    }
    validateToken()
  }, [])

  useEffect(() => {
    const handleLogout = () => {
      setUser(null)
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }) } catch {}
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

