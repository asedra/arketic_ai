"use client"

import { useState, Suspense } from "react"
import { Building2, Users, AlertTriangle, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic imports for code splitting
import { 
  LazyOrgChartTab,
  LazyIsoTab,
  LazyDocumentsTab
} from "@/lib/dynamic-imports"
import PeopleTab from "./PeopleTab"

// Performance monitoring
import { usePerformanceMonitor } from "@/lib/web-vitals"
import { withRenderTimer } from "@/lib/web-vitals"

// State management
import { useArketicStore, useArketicActions, useActiveTab, OrgNode } from "@/lib/state-manager"

// Cache management
import { useCachedData, peopleCache, orgCache, complianceCache } from "@/lib/cache-manager"

// Import JSON data statically
import peopleData from "./mock/people.json"
import orgData from "./mock/org.json"
import complianceData from "./mock/iso.json"

// Mock data with caching
async function fetchPeopleData() {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100))
  return peopleData
}

async function fetchOrgData() {
  await new Promise(resolve => setTimeout(resolve, 100))
  return orgData as unknown as OrgNode[]
}

async function fetchComplianceData() {
  await new Promise(resolve => setTimeout(resolve, 100))
  return complianceData
}

// Loading skeleton component
function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}

function OptimizedMyOrganizationPage() {
  const activeTab = useActiveTab()
  const { setActiveTab } = useArketicActions()

  // Initialize performance monitoring
  usePerformanceMonitor()

  // For now, use static data to avoid caching issues
  const peopleLoading = false
  const orgLoading = false
  const complianceLoading = false
  
  // Use imported data directly
  const currentPeopleData = peopleData
  const currentOrgData = orgData
  const currentComplianceData = complianceData

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Organization
          </h1>
          
          {/* Metric Ribbon */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-slate-600 dark:text-slate-400">Sites</span>
              <Badge variant="secondary">2</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-slate-600 dark:text-slate-400">Departments</span>
              <Badge variant="secondary">5</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-slate-600 dark:text-slate-400">Users</span>
              <Badge variant="secondary">
                {currentPeopleData?.length || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-slate-600 dark:text-slate-400">ISO Gaps</span>
              <Badge variant="secondary">
                {currentComplianceData?.clauses?.filter((item: any) => item.status === 'gap').length || 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Secondary Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="org-chart">Org Chart</TabsTrigger>
            <TabsTrigger value="iso">ISO Compliance</TabsTrigger>
            <TabsTrigger value="documents">ISO Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="mt-0">
            <Suspense fallback={<TabSkeleton />}>
              {peopleLoading ? (
                <TabSkeleton />
              ) : (
                <PeopleTab />
              )}
            </Suspense>
          </TabsContent>

          <TabsContent value="org-chart" className="mt-0">
            <Suspense fallback={<TabSkeleton />}>
              {orgLoading ? (
                <TabSkeleton />
              ) : (
                <LazyOrgChartTab />
              )}
            </Suspense>
          </TabsContent>

          <TabsContent value="iso" className="mt-0">
            <Suspense fallback={<TabSkeleton />}>
              {complianceLoading ? (
                <TabSkeleton />
              ) : (
                <LazyIsoTab />
              )}
            </Suspense>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <Suspense fallback={<TabSkeleton />}>
              <LazyDocumentsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Export with render timing
export default withRenderTimer(OptimizedMyOrganizationPage, 'MyOrganizationPage')