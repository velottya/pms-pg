import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use sessionStorage so user must log in each time they open a new browser/tab session
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('pms_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Clear legacy localStorage auth keys to enforce session-based login
    localStorage.removeItem('pms_token')
    localStorage.removeItem('pms_user')

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const savedUser = sessionStorage.getItem('pms_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch {
          setUser(null)
        }
      }
      setIsLoading(false)
    } else {
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      setIsLoading(false)
    }
  }, [token])

  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    sessionStorage.setItem('pms_token', newToken)
    sessionStorage.setItem('pms_user', JSON.stringify(newUser))
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('pms_token')
    sessionStorage.removeItem('pms_user')
    localStorage.removeItem('pms_token')
    localStorage.removeItem('pms_user')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
