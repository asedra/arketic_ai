/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OptimizedMyOrganizationPage from '../OptimizedPage'

// Mock the dynamic imports
jest.mock('@/lib/dynamic-imports', () => ({
  LazyOptimizedPeopleTab: jest.fn(({ data }) => (
    <div data-testid="people-tab">People Tab - {data.length} people</div>
  )),
  LazyOrgChartTab: jest.fn(() => (
    <div data-testid="org-chart-tab">Org Chart Tab</div>
  )),
  LazyIsoTab: jest.fn(() => (
    <div data-testid="iso-tab">ISO Tab</div>
  )),
  LazyDocumentsTab: jest.fn(() => (
    <div data-testid="documents-tab">Documents Tab</div>
  )),
}))

// Mock the performance hooks
jest.mock('@/lib/web-vitals', () => ({
  usePerformanceMonitor: jest.fn(),
  withRenderTimer: jest.fn((Component) => Component),
}))

// Mock the cache manager
const mockPeopleData = [
  { id: '1', name: 'John Doe', email: 'john@test.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@test.com' },
]

const mockComplianceData = [
  { id: '1', status: 'compliant' },
  { id: '2', status: 'gap' },
  { id: '3', status: 'compliant' },
]

jest.mock('@/lib/cache-manager', () => ({
  useCachedData: jest.fn((cache, key, fetcher) => {
    if (key === 'people-data') {
      return { data: mockPeopleData, loading: false }
    }
    if (key === 'org-data') {
      return { data: [], loading: false }
    }
    if (key === 'compliance-data') {
      return { data: mockComplianceData, loading: false }
    }
    return { data: null, loading: false }
  }),
  peopleCache: {},
  orgCache: {},
  complianceCache: {},
}))

// Mock the state manager
const mockSetActiveTab = jest.fn()
jest.mock('@/lib/state-manager', () => ({
  useActiveTab: jest.fn(() => 'people'),
  useArketicActions: jest.fn(() => ({
    setActiveTab: mockSetActiveTab,
  })),
}))

describe('OptimizedMyOrganizationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the main page structure', () => {
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.getByText('My Organization')).toBeInTheDocument()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('displays metric ribbon with correct data', () => {
      render(<OptimizedMyOrganizationPage />)
      
      // Check metric badges
      expect(screen.getByText('2')).toBeInTheDocument() // Sites
      expect(screen.getByText('5')).toBeInTheDocument() // Departments
      expect(screen.getByText('2')).toBeInTheDocument() // Users (from mock data)
      expect(screen.getByText('1')).toBeInTheDocument() // ISO Gaps (from mock data)
    })

    it('displays all tab triggers', () => {
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.getByRole('tab', { name: /people/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /org chart/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /iso compliance/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /iso documents/i })).toBeInTheDocument()
    })

    it('shows the active tab content by default', () => {
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.getByTestId('people-tab')).toBeInTheDocument()
      expect(screen.getByText('People Tab - 2 people')).toBeInTheDocument()
    })

    it('applies correct styling classes', () => {
      render(<OptimizedMyOrganizationPage />)
      
      const container = screen.getByText('My Organization').parentElement?.parentElement
      expect(container).toHaveClass('max-w-7xl', 'mx-auto')
    })
  })

  describe('Tab Navigation', () => {
    it('switches to org chart tab when clicked', async () => {
      const user = userEvent.setup()
      
      // Mock active tab change
      const { useActiveTab } = require('@/lib/state-manager')
      useActiveTab.mockReturnValue('org-chart')
      
      render(<OptimizedMyOrganizationPage />)
      
      const orgChartTab = screen.getByRole('tab', { name: /org chart/i })
      await user.click(orgChartTab)
      
      expect(mockSetActiveTab).toHaveBeenCalledWith('org-chart')
    })

    it('switches to ISO tab when clicked', async () => {
      const user = userEvent.setup()
      
      render(<OptimizedMyOrganizationPage />)
      
      const isoTab = screen.getByRole('tab', { name: /iso compliance/i })
      await user.click(isoTab)
      
      expect(mockSetActiveTab).toHaveBeenCalledWith('iso')
    })

    it('switches to documents tab when clicked', async () => {
      const user = userEvent.setup()
      
      render(<OptimizedMyOrganizationPage />)
      
      const documentsTab = screen.getByRole('tab', { name: /iso documents/i })
      await user.click(documentsTab)
      
      expect(mockSetActiveTab).toHaveBeenCalledWith('documents')
    })
  })

  describe('Loading States', () => {
    it('shows skeleton when people data is loading', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      useCachedData.mockImplementation((cache, key) => {
        if (key === 'people-data') {
          return { data: null, loading: true }
        }
        return { data: null, loading: false }
      })
      
      render(<OptimizedMyOrganizationPage />)
      
      // Should show skeleton loading state
      expect(screen.getByTestId('people-tab')).not.toBeInTheDocument()
    })

    it('shows skeleton when org data is loading', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      const { useActiveTab } = require('@/lib/state-manager')
      
      useActiveTab.mockReturnValue('org-chart')
      useCachedData.mockImplementation((cache, key) => {
        if (key === 'org-data') {
          return { data: null, loading: true }
        }
        return { data: [], loading: false }
      })
      
      render(<OptimizedMyOrganizationPage />)
      
      // Should show skeleton instead of org chart content
      expect(screen.queryByTestId('org-chart-tab')).not.toBeInTheDocument()
    })

    it('shows skeleton when compliance data is loading', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      const { useActiveTab } = require('@/lib/state-manager')
      
      useActiveTab.mockReturnValue('iso')
      useCachedData.mockImplementation((cache, key) => {
        if (key === 'compliance-data') {
          return { data: null, loading: true }
        }
        return { data: [], loading: false }
      })
      
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.queryByTestId('iso-tab')).not.toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('passes people data to PeopleTab component', () => {
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.getByText('People Tab - 2 people')).toBeInTheDocument()
    })

    it('calculates ISO gaps correctly', () => {
      render(<OptimizedMyOrganizationPage />)
      
      // Should show 1 gap from mockComplianceData (1 item with status 'gap')
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('handles empty data gracefully', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      useCachedData.mockImplementation(() => ({
        data: [],
        loading: false
      }))
      
      render(<OptimizedMyOrganizationPage />)
      
      // Should still render without errors
      expect(screen.getByText('My Organization')).toBeInTheDocument()
    })

    it('handles null data gracefully', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      useCachedData.mockImplementation(() => ({
        data: null,
        loading: false
      }))
      
      render(<OptimizedMyOrganizationPage />)
      
      expect(screen.getByText('My Organization')).toBeInTheDocument()
    })
  })

  describe('Performance Optimizations', () => {
    it('uses Suspense for lazy loading', () => {
      render(<OptimizedMyOrganizationPage />)
      
      // Component should render without blocking
      expect(screen.getByText('My Organization')).toBeInTheDocument()
    })

    it('initializes performance monitoring', () => {
      const { usePerformanceMonitor } = require('@/lib/web-vitals')
      
      render(<OptimizedMyOrganizationPage />)
      
      expect(usePerformanceMonitor).toHaveBeenCalled()
    })

    it('uses caching for data fetching', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      
      render(<OptimizedMyOrganizationPage />)
      
      expect(useCachedData).toHaveBeenCalledTimes(3) // people, org, compliance
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<OptimizedMyOrganizationPage />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('My Organization')
    })

    it('has proper tab navigation semantics', () => {
      render(<OptimizedMyOrganizationPage />)
      
      const tablist = screen.getByRole('tablist')
      const tabs = screen.getAllByRole('tab')
      
      expect(tablist).toBeInTheDocument()
      expect(tabs).toHaveLength(4)
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()
      
      render(<OptimizedMyOrganizationPage />)
      
      const firstTab = screen.getByRole('tab', { name: /people/i })
      const secondTab = screen.getByRole('tab', { name: /org chart/i })
      
      await user.click(firstTab)
      expect(firstTab).toHaveFocus()
      
      await user.keyboard('{ArrowRight}')
      expect(secondTab).toHaveFocus()
    })
  })

  describe('Error Handling', () => {
    it('handles cache errors gracefully', () => {
      const { useCachedData } = require('@/lib/cache-manager')
      useCachedData.mockImplementation(() => {
        throw new Error('Cache error')
      })
      
      // Should not crash the component
      expect(() => render(<OptimizedMyOrganizationPage />)).not.toThrow()
    })

    it('handles missing state manager gracefully', () => {
      const { useActiveTab } = require('@/lib/state-manager')
      useActiveTab.mockImplementation(() => {
        throw new Error('State error')
      })
      
      expect(() => render(<OptimizedMyOrganizationPage />)).not.toThrow()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive layout classes', () => {
      render(<OptimizedMyOrganizationPage />)
      
      const tabsList = screen.getByRole('tablist')
      expect(tabsList).toHaveClass('grid', 'w-full', 'grid-cols-4')
    })

    it('has mobile-friendly spacing', () => {
      render(<OptimizedMyOrganizationPage />)
      
      const container = screen.getByText('My Organization').closest('div')
      expect(container?.parentElement).toHaveClass('p-6')
    })
  })
})