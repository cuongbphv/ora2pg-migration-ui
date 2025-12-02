"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { apiService } from "./api"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("auth_user")
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const result = await apiService.login({ email, password })
    if (result.data) {
      const { token, email: userEmail, name, role, id } = result.data
      const userData: User = {
        id,
        email: userEmail,
        name,
        role: role as "admin" | "user",
        createdAt: new Date(),
      }
      setToken(token)
      setUser(userData)
      localStorage.setItem("auth_token", token)
      localStorage.setItem("auth_user", JSON.stringify(userData))
    } else {
      throw new Error(result.error || "Login failed")
    }
  }

  const register = async (email: string, password: string, name: string) => {
    const result = await apiService.register({ email, password, name })
    if (result.data) {
      const { token, email: userEmail, name: userName, role, id } = result.data
      const userData: User = {
        id,
        email: userEmail,
        name: userName,
        role: role as "admin" | "user",
        createdAt: new Date(),
      }
      setToken(token)
      setUser(userData)
      localStorage.setItem("auth_token", token)
      localStorage.setItem("auth_user", JSON.stringify(userData))
    } else {
      throw new Error(result.error || "Registration failed")
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

