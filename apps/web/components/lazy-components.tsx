"use client"

import { lazy, Suspense, ComponentType } from "react"
import { LoadingCard, LoadingTable } from "./ui/loading"
import { ErrorBoundary } from "./ui/error-boundary"

// Higher-order component for lazy loading with error boundary and loading state
export function withLazyLoading<T extends {}>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc)
  
  return function LazyWrapper(props: T) {
    return (
      <ErrorBoundary>
        <Suspense fallback={fallback || <LoadingCard rows={5} />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// Lazy loaded components for major routes and heavy components
export const LazyPeopleTab = withLazyLoading(
  () => import("@/app/my-organization/PeopleTab"),
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <LoadingCard key={i} rows={5} />
    ))}
  </div>
)

export const LazyComplianceTable = withLazyLoading(
  () => import("@/app/knowledge/components/ComplianceTable").then(m => ({ default: m.ComplianceTable })),
  <LoadingTable rows={10} columns={6} />
)

export const LazyOrgChartTab = withLazyLoading(
  () => import("@/app/my-organization/OrgChartTab/OrgChartTab").then(m => ({ default: m.OrgChartTab })),
  <div className="flex h-[calc(100vh-200px)] gap-4">
    <div className="w-80">
      <LoadingCard rows={10} />
    </div>
    <div className="flex-1">
      <LoadingCard rows={8} />
    </div>
  </div>
)

export const LazyIsoTab = withLazyLoading(
  () => import("@/app/my-organization/IsoTab/IsoTab"),
  <LoadingCard rows={6} />
)

export const LazyComplianceDashboard = withLazyLoading(
  () => import("@/app/my-organization/IsoTab/ComplianceDashboard"),
  <LoadingCard rows={4} />
)

export const LazyMatrixView = withLazyLoading(
  () => import("@/app/my-organization/IsoTab/MatrixView"),
  <LoadingTable rows={8} columns={5} />
)

export const LazyClauseExplorer = withLazyLoading(
  () => import("@/app/my-organization/IsoTab/ClauseExplorer"),
  <LoadingCard rows={10} />
)

export const LazyDocumentsTable = withLazyLoading(
  () => import("@/app/my-organization/IsoDocumentsTab/DocumentsTable"),
  <LoadingTable rows={8} columns={4} />
)

export const LazyServicesTab = withLazyLoading(
  () => import("@/app/my-organization/ServicesTab/ServicesTab"),
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <LoadingCard key={i} rows={4} />
    ))}
  </div>
)