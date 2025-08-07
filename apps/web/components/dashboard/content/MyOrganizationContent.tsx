"use client"

import React, { memo } from 'react'
import MyOrganizationPage from '@/app/my-organization/page'
import { cn } from '@/lib/utils'

interface MyOrganizationContentProps {
  className?: string
}

const MyOrganizationContent = memo(function MyOrganizationContent({ className }: MyOrganizationContentProps) {
  return (
    <div className={cn('h-full', className)}>
      <MyOrganizationPage />
    </div>
  )
})

export default MyOrganizationContent
