'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthTokens } from '@/types'
import { authService } from '@/lib/api'
import Cookies from 'js-cookie'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Initialize auth state from cookies
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = Cookies.get('access_token')
        const refreshTokenValue = Cookies.get('refresh_token')
        
        if (accessToken && refreshTokenValue) {
          const tokens = { accessToken, refreshToken: refreshTokenValue }
          const user = await authService.getCurrentUser()
          
          setState({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          })
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Clear invalid tokens
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      const { user, tokens } = response
      
      // Store tokens in cookies
      Cookies.set('access_token', tokens.accessToken, { expires: 1 }) // 1 day
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 7 }) // 7 days
      
      setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      throw error
    }
  }

  const register = async (data: any) => {
    try {
      const response = await authService.register(data)
      const { user, tokens } = response
      
      // Store tokens in cookies
      Cookies.set('access_token', tokens.accessToken, { expires: 1 })
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 7 })
      
      setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear tokens and state
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = Cookies.get('refresh_token')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }
      
      const response = await authService.refreshToken(refreshTokenValue)
      const { tokens } = response
      
      // Update tokens in cookies
      Cookies.set('access_token', tokens.accessToken, { expires: 1 })
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 7 })
      
      setState(prev => ({
        ...prev,
        tokens,
      }))
    } catch (error) {
      // Refresh failed, logout user
      await logout()
      throw error
    }
  }

  const updateUser = (user: User) => {
    setState(prev => ({ ...prev, user }))
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
