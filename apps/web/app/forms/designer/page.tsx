'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import AdaptiveCardDesigner from '@/components/forms/AdaptiveCardDesigner';

export default function FormDesignerPage() {
  return (
    <ProtectedRoute requireAuth={true} redirectTo="/login">
      <AdaptiveCardDesigner />
    </ProtectedRoute>
  );
}