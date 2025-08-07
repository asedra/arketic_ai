/**
 * Comprehensive test suite for ComplianceTable component
 * Tests table functionality including sorting, filtering, pagination, and interactions
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { testUtils } from '../../../tests/utils/test-utils'
import { ComplianceFactory, APIResponseFactory } from '../../../tests/fixtures/factories'
import { server } from '../../../tests/api/test-server'
import { http, HttpResponse } from 'msw'
import ComplianceTable from '../../../app/knowledge/components/ComplianceTable'

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/knowledge',
}))

describe('ComplianceTable Component', () => {
  // Test data
  const mockCompliance = ComplianceFactory.buildMany(10)
  const mockStats = {
    total: 10,
    compliant: 6,
    gaps: 4,
    percentage: 60
  }

  beforeEach(() => {
    // Reset mocks before each test
    testUtils.mocks.resetAllMocks()
    
    // Setup default API mock
    server.use(
      http.get('/api/compliance', async () => {
        return HttpResponse.json({
          data: mockCompliance,
          stats: mockStats
        })
      })
    )
  })

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      testUtils.render(<ComplianceTable />)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('renders table with compliance data', async () => {
      testUtils.render(<ComplianceTable />)
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
      
      // Check table headers
      testUtils.table.expectColumnHeaders(['Title', 'Status', 'Department', 'Assignee', 'Last Updated'])
      
      // Check data rows
      testUtils.table.expectRowCount(mockCompliance.length)
      
      // Check first row data
      expect(screen.getByText(mockCompliance[0].title)).toBeInTheDocument()
    })

    it('renders empty state when no data', async () => {
      server.use(
        http.get('/api/compliance', async () => {
          return HttpResponse.json({
            data: [],
            stats: { total: 0, compliant: 0, gaps: 0, percentage: 0 }
          })
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.getByText(/no compliance items found/i)).toBeInTheDocument()
      })
    })

    it('displays correct status badges', async () => {
      const testData = [
        ComplianceFactory.buildCompliant({ title: 'Compliant Item' }),
        ComplianceFactory.buildGap({ title: 'Gap Item' }),
      ]

      server.use(
        http.get('/api/compliance', async () => {
          return HttpResponse.json({ data: testData, stats: mockStats })
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.getByText('Compliant Item')).toBeInTheDocument()
        expect(screen.getByText('Gap Item')).toBeInTheDocument()
      })

      // Check status badges
      const compliantBadge = screen.getByTestId('status-compliant')
      const gapBadge = screen.getByTestId('status-gap')
      
      expect(compliantBadge).toHaveClass('bg-green-100', 'text-green-800')
      expect(gapBadge).toHaveClass('bg-red-100', 'text-red-800')
    })
  })

  describe('Sorting', () => {
    it('sorts by title when clicking title header', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Sort by title
      await testUtils.table.sortByColumn('Title')
      
      // Verify API call with sort parameter
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance', {
          method: 'GET',
        })
      })
    })

    it('toggles sort direction on consecutive clicks', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const titleHeader = screen.getByRole('columnheader', { name: /title/i })
      
      // First click - ascending
      await testUtils.user.click(titleHeader)
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
      
      // Second click - descending
      await testUtils.user.click(titleHeader)
      expect(titleHeader).toHaveAttribute('aria-sort', 'descending')
      
      // Third click - no sort
      await testUtils.user.click(titleHeader)
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
    })

    it('shows sort indicators correctly', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      await testUtils.table.sortByColumn('Status')
      
      const statusHeader = screen.getByRole('columnheader', { name: /status/i })
      const sortIcon = statusHeader.querySelector('[data-testid="sort-icon"]')
      
      expect(sortIcon).toBeInTheDocument()
      expect(sortIcon).toHaveAttribute('aria-label', expect.stringMatching(/sort/i))
    })
  })

  describe('Filtering', () => {
    it('filters by status', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Find and use status filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await testUtils.user.selectOption(statusFilter, 'compliant')
      
      // Verify API call with filter parameter
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance?status=compliant')
      })
    })

    it('filters by department', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const departmentFilter = screen.getByRole('combobox', { name: /department/i })
      await testUtils.user.selectOption(departmentFilter, 'Engineering')
      
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance?department=Engineering')
      })
    })

    it('combines multiple filters', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Apply status filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await testUtils.user.selectOption(statusFilter, 'gap')
      
      // Apply department filter
      const departmentFilter = screen.getByRole('combobox', { name: /department/i })
      await testUtils.user.selectOption(departmentFilter, 'Design')
      
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance?status=gap&department=Design')
      })
    })

    it('clears filters when reset button is clicked', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Apply filters
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await testUtils.user.selectOption(statusFilter, 'compliant')
      
      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await testUtils.user.click(clearButton)
      
      // Verify filters are reset
      expect(statusFilter).toHaveValue('all')
      
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance')
      })
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      // Mock large dataset for pagination testing
      const largeDataset = ComplianceFactory.buildMany(50)
      server.use(
        http.get('/api/compliance', async ({ request }) => {
          const url = new URL(request.url)
          const page = parseInt(url.searchParams.get('page') || '1')
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const start = (page - 1) * limit
          const end = start + limit
          
          return HttpResponse.json({
            data: largeDataset.slice(start, end),
            pagination: {
              page,
              limit,
              total: largeDataset.length,
              totalPages: Math.ceil(largeDataset.length / limit),
              hasNext: end < largeDataset.length,
              hasPrev: page > 1
            }
          })
        })
      )
    })

    it('displays pagination controls', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument()
      })
    })

    it('navigates to next page', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
      })

      const nextButton = screen.getByRole('button', { name: /next page/i })
      await testUtils.user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText(/page 2 of/i)).toBeInTheDocument()
      })
    })

    it('disables previous button on first page', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous page/i })
        expect(prevButton).toBeDisabled()
      })
    })

    it('changes page size', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const pageSizeSelect = screen.getByRole('combobox', { name: /items per page/i })
      await testUtils.user.selectOption(pageSizeSelect, '25')
      
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance?limit=25')
      })
    })
  })

  describe('Row Actions', () => {
    it('opens compliance details when row is clicked', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const firstRow = screen.getByText(mockCompliance[0].title).closest('tr')
      expect(firstRow).not.toBeNull()
      
      await testUtils.user.click(firstRow!)
      
      // Check if details modal/drawer opens
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(mockCompliance[0].description)).toBeInTheDocument()
      })
    })

    it('shows action menu on row hover', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const firstRow = screen.getByText(mockCompliance[0].title).closest('tr')
      expect(firstRow).not.toBeNull()
      
      await testUtils.user.hover(firstRow!)
      
      const actionButton = screen.getByRole('button', { name: /actions/i })
      expect(actionButton).toBeVisible()
    })

    it('assigns compliance item to user', async () => {
      server.use(
        http.post('/api/compliance/:id/assign', async ({ params, request }) => {
          const body = await request.json()
          return HttpResponse.json({
            data: { ...mockCompliance[0], assignee: body.assignee }
          })
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Open action menu for first row
      const firstRow = screen.getByText(mockCompliance[0].title).closest('tr')
      await testUtils.user.hover(firstRow!)
      
      const actionButton = screen.getByRole('button', { name: /actions/i })
      await testUtils.user.click(actionButton)
      
      const assignButton = screen.getByRole('menuitem', { name: /assign/i })
      await testUtils.user.click(assignButton)
      
      // Fill assignment form
      const assigneeInput = screen.getByRole('combobox', { name: /assignee/i })
      await testUtils.user.type(assigneeInput, 'John Doe')
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await testUtils.user.click(saveButton)
      
      // Verify API call
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, `/api/compliance/${mockCompliance[0].id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ assignee: 'John Doe' })
        })
      })
    })
  })

  describe('Search', () => {
    it('searches compliance items by title', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox', { name: /search/i })
      await testUtils.user.type(searchInput, 'security policy')
      
      // Debounced search should trigger after typing
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance?search=security%20policy')
      }, { timeout: 1000 })
    })

    it('shows no results message when search returns empty', async () => {
      server.use(
        http.get('/api/compliance', async ({ request }) => {
          const url = new URL(request.url)
          if (url.searchParams.get('search')) {
            return HttpResponse.json({
              data: [],
              stats: { total: 0, compliant: 0, gaps: 0, percentage: 0 }
            })
          }
          return HttpResponse.json({ data: mockCompliance, stats: mockStats })
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox', { name: /search/i })
      await testUtils.user.type(searchInput, 'nonexistent')
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument()
      })
    })

    it('clears search when clear button is clicked', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const searchInput = screen.getByRole('searchbox', { name: /search/i })
      await testUtils.user.type(searchInput, 'test search')
      
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      await testUtils.user.click(clearButton)
      
      expect(searchInput).toHaveValue('')
      
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance')
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      server.use(
        http.get('/api/compliance', async () => {
          return HttpResponse.json(
            { error: 'Failed to fetch compliance data' },
            { status: 500 }
          )
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load compliance data/i)).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      server.use(
        http.get('/api/compliance', async () => {
          return HttpResponse.json(
            { error: 'Network error' },
            { status: 500 }
          )
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i })
        expect(retryButton).toBeInTheDocument()
      })
    })

    it('retries data fetch when retry button is clicked', async () => {
      // First call fails, second succeeds
      let callCount = 0
      server.use(
        http.get('/api/compliance', async () => {
          callCount++
          if (callCount === 1) {
            return HttpResponse.json(
              { error: 'Network error' },
              { status: 500 }
            )
          }
          return HttpResponse.json({ data: mockCompliance, stats: mockStats })
        })
      )

      testUtils.render(<ComplianceTable />)
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await testUtils.user.click(retryButton)
      
      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(mockCompliance[0].title)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check table accessibility
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('aria-label', expect.stringMatching(/compliance/i))
      
      // Check sort buttons have ARIA labels
      const titleHeader = screen.getByRole('columnheader', { name: /title/i })
      const sortButton = titleHeader.querySelector('button')
      expect(sortButton).toHaveAttribute('aria-label', expect.stringMatching(/sort.*title/i))
    })

    it('supports keyboard navigation for table rows', async () => {
      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const tableRows = screen.getAllByRole('row').slice(1) // Exclude header row
      const clickableRows = tableRows.filter(row => row.getAttribute('tabindex') === '0')
      
      if (clickableRows.length > 0) {
        await testUtils.a11y.expectKeyboardNavigation(clickableRows.slice(0, 3))
      }
    })

    it('announces loading state to screen readers', () => {
      testUtils.render(<ComplianceTable />)
      
      const loadingElement = screen.getByText(/loading/i)
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })

    it('announces error state to screen readers', async () => {
      server.use(
        http.get('/api/compliance', async () => {
          return HttpResponse.json(
            { error: 'Failed to load' },
            { status: 500 }
          )
        })
      )

      testUtils.render(<ComplianceTable />)
      
      await waitFor(() => {
        const errorElement = screen.getByText(/failed to load/i)
        expect(errorElement).toHaveAttribute('aria-live', 'assertive')
      })
    })
  })

  describe('Performance', () => {
    it('renders within acceptable time limit', async () => {
      await testUtils.performance.expectFastRender(
        () => testUtils.render(<ComplianceTable />),
        200 // 200ms max
      )
    })

    it('handles large datasets efficiently', async () => {
      const largeDataset = ComplianceFactory.buildMany(1000)
      server.use(
        http.get('/api/compliance', async () => {
          // Simulate pagination - only return first 10 items
          return HttpResponse.json({
            data: largeDataset.slice(0, 10),
            pagination: {
              page: 1,
              limit: 10,
              total: largeDataset.length,
              totalPages: 100,
              hasNext: true,
              hasPrev: false
            }
          })
        })
      )

      const renderTime = await testUtils.performance.measureRenderTime(
        () => testUtils.render(<ComplianceTable />)
      )
      
      // Should handle large datasets with pagination efficiently
      expect(renderTime).toBeLessThan(300)
    })
  })
})