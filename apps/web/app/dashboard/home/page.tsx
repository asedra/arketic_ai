"use client"

import React from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import DashboardContainer from '@/components/dashboard/DashboardContainer'

export default function DashboardHomePage() {
  return (
    <ProtectedRoute requireAuth={true} redirectTo="/login">
      <DashboardContainer />
    </ProtectedRoute>
  )
}