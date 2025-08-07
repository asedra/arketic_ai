"use client"

import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export function useLogout() {
  const { logout, isLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      
      toast.success('Logged out successfully', {
        description: 'You have been securely logged out.',
        duration: 3000,
      })
    } catch (error) {
      console.error('Logout failed:', error)
      
      toast.error('Logout failed', {
        description: 'An error occurred during logout. Please try again.',
        duration: 5000,
      })
    }
  }

  return {
    handleLogout,
    isLoading,
  }
}