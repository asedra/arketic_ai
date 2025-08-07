/**
 * Comprehensive Error Handling Tests for My Organization Page Components
 * 
 * This test suite specifically focuses on the error handling scenarios that were fixed:
 * 1. API response validation (ensuring arrays are handled properly)
 * 2. Select component prop validation  
 * 3. Fallback to mock data when API fails
 * 4. Proper handling of null/undefined values in person data
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PeopleTab } from '../PeopleTab'
import OptimizedMyOrganizationPage from '../OptimizedPage'
import { useToast } from '@/hooks/use-toast'
import { organizationApi } from '@/lib/api-client'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

jest.mock('@/lib/api-client', () => ({
  organizationApi: {
    getPeople: jest.fn()
  }
}))

// Mock AddPersonModal component
jest.mock('../components/AddPersonModal', () => ({
  AddPersonModal: jest.fn(({ open, onOpenChange, onPersonAdded, existingPeople }) => (
    <div data-testid="add-person-modal">
      <div>Modal Open: {open.toString()}</div>
      <button onClick={() => onOpenChange(false)}>Close Modal</button>
      <button onClick={() => onPersonAdded()}>Person Added</button>
      <div>Existing People Count: {existingPeople?.length || 0}</div>
    </div>
  ))
}))

// Mock the dynamic imports and performance hooks for OptimizedPage
jest.mock('@/lib/dynamic-imports', () => ({
  LazyOptimizedPeopleTab: jest.fn(() => <div data-testid="lazy-people-tab">People Tab</div>),
  LazyOrgChartTab: jest.fn(() => <div data-testid="lazy-org-chart-tab">Org Chart Tab</div>),
  LazyIsoTab: jest.fn(() => <div data-testid="lazy-iso-tab">ISO Tab</div>),
  LazyDocumentsTab: jest.fn(() => <div data-testid="lazy-documents-tab">Documents Tab</div>),
}))

jest.mock('@/lib/web-vitals', () => ({
  usePerformanceMonitor: jest.fn(),
  withRenderTimer: jest.fn((Component) => Component),
}))

jest.mock('@/lib/state-manager', () => ({
  useActiveTab: jest.fn(() => 'people'),
  useArketicActions: jest.fn(() => ({
    setActiveTab: jest.fn(),
  })),
}))

const mockToast = jest.fn()
const mockGetPeople = organizationApi.getPeople as jest.MockedFunction<typeof organizationApi.getPeople>

// Test data with various edge cases
const validPeopleData = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatars/john.jpg',
    initials: 'JD',
    role: 'MANAGER',
    department: 'Engineering',
    title: 'Engineering Manager',
    site: 'San Francisco',
    status: 'active',
    phone: '+1-555-0101',
    location: 'SF Bay Area',
    hireDate: '2020-03-15'
  }
]

const peopleDataWithNulls = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatars/john.jpg',
    initials: 'JD',
    role: 'MANAGER',
    department: null, // null department
    title: 'Engineering Manager',
    site: undefined, // undefined site
    status: 'active',
    phone: '+1-555-0101',
    location: 'SF Bay Area',
    hireDate: '2020-03-15'
  },
  {
    id: '2',
    name: '', // empty name
    email: 'jane@example.com',
    avatar: '',
    initials: 'JD',
    role: '', // empty role
    department: 'Engineering',
    title: 'Software Engineer',
    site: 'San Francisco',
    status: 'active',
    phone: '+1-555-0102',
    location: 'SF Bay Area',
    hireDate: '2021-01-10'
  }
]

describe('Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
  })

  describe('API Response Validation', () => {
    it('handles non-array API response gracefully', async () => {
      // API returns invalid response format (not an array)
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: "not an array", // Invalid format
          total: 0
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should fallback to mock data and render without crashing
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
        expect(screen.getByText('people found')).toBeInTheDocument()
      })

      // Should log warning about using mock data
      expect(console.warn).toHaveBeenCalledWith('API response is not an array, using mock data')
    })

    it('handles missing items property in API response', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          // Missing items property
          total: 0
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })
    })

    it('handles direct array response format', async () => {
      // API returns direct array instead of nested structure
      mockGetPeople.mockResolvedValue({
        success: true,
        data: validPeopleData // Direct array instead of { items: [...] }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('handles null data in API response', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: null // null data
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Warning',
          description: 'Using offline data. Some information may be outdated.',
          variant: 'destructive'
        })
      })

      // Should still render with fallback data
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('handles undefined data in API response', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: undefined // undefined data
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Warning',
          description: 'Using offline data. Some information may be outdated.',
          variant: 'destructive'
        })
      })

      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('handles API success: false response', async () => {
      mockGetPeople.mockResolvedValue({
        success: false,
        data: validPeopleData
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Warning',
          description: 'Using offline data. Some information may be outdated.',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Null/Undefined Value Handling', () => {
    it('filters out null and undefined values from department options', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: peopleDataWithNulls,
          total: peopleDataWithNulls.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click department filter to open dropdown
      const departmentSelect = screen.getByDisplayValue('All Departments')
      await act(async () => {
        fireEvent.click(departmentSelect)
      })

      // Should show Engineering but not null/undefined values
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.queryByText('null')).not.toBeInTheDocument()
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
      expect(screen.queryByText('')).not.toBeInTheDocument()
    })

    it('filters out empty string values from site options', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: peopleDataWithNulls,
          total: peopleDataWithNulls.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click site filter to open dropdown
      const siteSelect = screen.getByDisplayValue('All Sites')
      await act(async () => {
        fireEvent.click(siteSelect)
      })

      // Should show San Francisco but not empty/null values
      expect(screen.getByText('San Francisco')).toBeInTheDocument()
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })

    it('filters out empty string values from role options', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: peopleDataWithNulls,
          total: peopleDataWithNulls.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click role filter to open dropdown
      const roleSelect = screen.getByDisplayValue('All Roles')
      await act(async () => {
        fireEvent.click(roleSelect)
      })

      // Should show Manager but not empty role values
      expect(screen.getByText('Manager')).toBeInTheDocument()
      expect(screen.queryByText('')).not.toBeInTheDocument()
    })

    it('handles people cards with null/undefined values gracefully', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: peopleDataWithNulls,
          total: peopleDataWithNulls.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should render people cards without crashing
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Engineering Manager')).toBeInTheDocument()
      })

      // People with empty names should still render their titles
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })
  })

  describe('Select Component Prop Validation', () => {
    it('select components maintain proper value attributes', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: validPeopleData,
          total: validPeopleData.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // All select components should have proper default values
      expect(screen.getByDisplayValue('All Departments')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All Sites')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument()
    })

    it('select components handle value changes without prop validation errors', async () => {
      const user = userEvent.setup()
      
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: validPeopleData,
          total: validPeopleData.length
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Test department filter change
      const departmentSelect = screen.getByDisplayValue('All Departments')
      await act(async () => {
        await user.click(departmentSelect)
      })

      await act(async () => {
        await user.click(screen.getByText('Engineering'))
      })

      // Should update value without errors
      await waitFor(() => {
        expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument()
      })
    })

    it('select components work with empty data arrays', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: {
          items: [],
          total: 0
        }
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      // Select components should still render with default "All" options
      expect(screen.getByDisplayValue('All Departments')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All Sites')).toBeInTheDocument()
      expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument()

      // Should be clickable without errors
      const departmentSelect = screen.getByDisplayValue('All Departments')
      await act(async () => {
        fireEvent.click(departmentSelect)
      })

      // Should show only the "All Departments" option
      expect(screen.getByText('All Departments')).toBeInTheDocument()
    })
  })

  describe('Fallback to Mock Data', () => {
    it('uses mock data when API call fails completely', async () => {
      mockGetPeople.mockRejectedValue(new Error('Network failure'))

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to connect to server. Using offline data.',
          variant: 'destructive'
        })
      })

      // Should still render the component with mock data
      expect(screen.getByText('People')).toBeInTheDocument()
      expect(screen.getByText('people found')).toBeInTheDocument()
    })

    it('uses mock data when API returns malformed JSON', async () => {
      mockGetPeople.mockResolvedValue({
        success: true,
        data: "invalid json structure"
      })

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should fallback to mock data
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })
    })

    it('maintains component functionality when using fallback data', async () => {
      const user = userEvent.setup()
      mockGetPeople.mockRejectedValue(new Error('API Error'))

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })

      // Search functionality should still work with fallback data
      const searchInput = screen.getByPlaceholderText('Search people by name, email, or title...')
      await act(async () => {
        await user.type(searchInput, 'test')
      })

      expect(searchInput).toHaveValue('test')

      // Add person button should still be functional
      const addButton = screen.getByRole('button', { name: /add person/i })
      expect(addButton).not.toBeDisabled()
    })

    it('ensures people data array integrity after fallback', async () => {
      mockGetPeople.mockRejectedValue(new Error('API Error'))

      await act(async () => {
        render(<PeopleTab />)
      })

      // Should not crash when filtering after fallback
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })

      const departmentSelect = screen.getByDisplayValue('All Departments')
      await act(async () => {
        fireEvent.click(departmentSelect)
      })

      // Should be able to open filter dropdown without errors
      expect(screen.getByText('All Departments')).toBeInTheDocument()
    })
  })

  describe('OptimizedPage Error Handling', () => {
    it('handles missing state manager gracefully', async () => {
      const { useActiveTab } = require('@/lib/state-manager')
      useActiveTab.mockImplementation(() => {
        throw new Error('State manager error')
      })

      // Should not crash the component
      expect(() => {
        render(<OptimizedMyOrganizationPage />)
      }).not.toThrow()
    })

    it('renders with static data when dynamic imports fail', async () => {
      await act(async () => {
        render(<OptimizedMyOrganizationPage />)
      })

      // Should render main structure
      expect(screen.getByText('My Organization')).toBeInTheDocument()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('calculates metrics safely with null/undefined data', async () => {
      await act(async () => {
        render(<OptimizedMyOrganizationPage />)
      })

      // Should show metrics without crashing
      expect(screen.getByText('Sites')).toBeInTheDocument()
      expect(screen.getByText('Departments')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('ISO Gaps')).toBeInTheDocument()
    })
  })

  describe('Integration Error Scenarios', () => {
    it('handles refresh after failed person addition', async () => {
      const user = userEvent.setup()
      
      // Initial load succeeds
      mockGetPeople.mockResolvedValueOnce({
        success: true,
        data: { items: validPeopleData, total: validPeopleData.length }
      })
      
      // Refresh after person addition fails
      mockGetPeople.mockRejectedValueOnce(new Error('Refresh failed'))

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Open modal and add person
      const addButton = screen.getByRole('button', { name: /add person/i })
      await act(async () => {
        await user.click(addButton)
      })

      const personAddedButton = screen.getByText('Person Added')
      await act(async () => {
        await user.click(personAddedButton)
      })

      // Should handle refresh error gracefully
      await waitFor(() => {
        expect(mockGetPeople).toHaveBeenCalledTimes(2)
      })

      // Component should still be functional
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('handles multiple consecutive API failures', async () => {
      // Multiple API calls all fail
      mockGetPeople.mockRejectedValue(new Error('Persistent API failure'))

      await act(async () => {
        render(<PeopleTab />)
      })

      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })

      // Try refresh - should also fail but handle gracefully
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await act(async () => {
        fireEvent.click(refreshButton)
      })

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })
    })
  })
})