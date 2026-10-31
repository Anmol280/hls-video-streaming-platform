'use client'

import React from 'react'
import { AuthProvider } from '@/store/auth-store'

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
