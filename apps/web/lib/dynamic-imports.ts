/**
 * Dynamic imports for code splitting and lazy loading
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

// Lazy load heavy components with loading states
export const LazyOrgChartTab = dynamic(
  () => import('@/app/my-organization/OrgChartTab/OrgChartTab').then(mod => ({ default: mod.OrgChartTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading Organization Chart..." />
      </div>
    ),
    ssr: false
  }
)

export const LazyIsoTab = dynamic(
  () => import('@/app/my-organization/IsoTab/IsoTab').then(mod => ({ default: mod.IsoTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
)

export const LazyDocumentsTab = dynamic(
  () => import('@/app/my-organization/IsoDocumentsTab/DocumentsTab').then(mod => ({ default: mod.DocumentsTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }
)

// Removed LazyOptimizedPeopleTab as it references non-existent component
// Using regular PeopleTab component instead

// Lazy load chart libraries
export const LazyRecharts = {
  PieChart: dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false }),
  Pie: dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false }),
  Cell: dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false }),
  ResponsiveContainer: dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false }),
  BarChart: dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false }),
  Bar: dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false }),
  XAxis: dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false }),
  YAxis: dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false }),
  CartesianGrid: dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false }),
  Tooltip: dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false }),
  Legend: dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false })
}

// Lazy load D3 for org chart
export const LazyD3 = dynamic(() => import('d3'), { ssr: false })

// Lazy load react-window
export const LazyReactWindow = {
  FixedSizeList: dynamic(() => import('react-window').then(mod => ({ default: mod.FixedSizeList })), { ssr: false }),
  VariableSizeList: dynamic(() => import('react-window').then(mod => ({ default: mod.VariableSizeList })), { ssr: false }),
  FixedSizeGrid: dynamic(() => import('react-window').then(mod => ({ default: mod.FixedSizeGrid })), { ssr: false })
}