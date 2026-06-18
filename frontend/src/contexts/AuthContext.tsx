// Auth system removed — all pages are now public
import { createContext } from 'react'

const AuthContext = createContext({ user: null as any, login: () => {}, logout: () => {}, loading: false })
export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={{ user: null, login: () => {}, logout: () => {}, loading: false }}>
    {children}
  </AuthContext.Provider>
)
export const useAuth = () => ({ user: null as any, login: () => {}, logout: () => {}, loading: false })
