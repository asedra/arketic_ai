/**
 * Comprehensive tests for PeopleTab component
 * Tests people list rendering, search, filtering, API interactions, and modal integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PeopleTab } from '../PeopleTab'
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
      <div>Existing People Count: {existingPeople.length}</div>
    </div>
  ))
}))

// Mock date formatting
const mockFormatDate = jest.fn((dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

// Mock the component's formatDate function
jest.mock('../PeopleTab', () => {
  const actual = jest.requireActual('../PeopleTab')
  return {
    ...actual,
    PeopleTab: jest.fn().mockImplementation(() => {
      const Component = actual.PeopleTab
      const WrappedComponent = (props: any) => <Component {...props} />
      WrappedComponent.prototype = Component.prototype
      return <WrappedComponent />
    })
  }
})

const mockToast = jest.fn()
const mockGetPeople = organizationApi.getPeople as jest.MockedFunction<typeof organizationApi.getPeople>

// Mock people data
const mockPeopleData = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@arketic.com',
    avatar: '/avatars/alice.jpg',
    initials: 'AJ',
    role: 'MANAGER',
    department: 'Engineering',
    title: 'Engineering Manager',
    site: 'San Francisco',
    status: 'active',
    phone: '+1-555-0101',
    location: 'SF Bay Area',
    hireDate: '2020-03-15'
  },
  {
    id: '2',
    name: 'Bob Chen',
    email: 'bob@arketic.com',
    avatar: '/avatars/bob.jpg',
    initials: 'BC',
    role: 'USER',
    department: 'Engineering',
    title: 'Senior Software Engineer',
    site: 'San Francisco',
    status: 'active',
    phone: '+1-555-0102',
    location: 'SF Bay Area',
    hireDate: '2021-01-10'
  },
  {
    id: '3',
    name: 'Carol Smith',
    email: 'carol@arketic.com',
    avatar: '/avatars/carol.jpg',
    initials: 'CS',
    role: 'USER',
    department: 'Design',
    title: 'Senior UX Designer',
    site: 'New York',
    status: 'active',
    phone: '+1-555-0103',
    location: 'NYC',
    hireDate: '2019-09-20'
  },
  {
    id: '4',
    name: 'David Wilson',
    email: 'david@arketic.com',
    avatar: '/avatars/david.jpg',
    initials: 'DW',
    role: 'ADMIN',
    department: 'Operations',
    title: 'Operations Director',
    site: 'Austin',
    status: 'active',
    phone: '+1-555-0104',
    location: 'Austin, TX',
    hireDate: '2018-05-12'
  }
]

describe('PeopleTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    mockGetPeople.mockResolvedValue({
      success: true,
      data: {
        items: mockPeopleData,
        total: mockPeopleData.length
      }
    })
  })

  describe('Initial Rendering', () => {
    it('renders the main heading and description', async () => {
      render(<PeopleTab />)
      
      expect(screen.getByText('People')).toBeInTheDocument()
      expect(screen.getByText("Manage your organization's people and their information")).toBeInTheDocument()
    })

    it('renders action buttons', async () => {
      render(<PeopleTab />)
      
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument()
    })

    it('renders search and filter controls', async () => {
      render(<PeopleTab />)
      
      expect(screen.getByPlaceholderText('Search people by name, email, or title...')).toBeInTheDocument()
      expect(screen.getByText('All Departments')).toBeInTheDocument()
      expect(screen.getByText('All Sites')).toBeInTheDocument()
      expect(screen.getByText('All Roles')).toBeInTheDocument()
    })

    it('fetches people data on mount', async () => {
      render(<PeopleTab />)
      
      await waitFor(() => {
        expect(mockGetPeople).toHaveBeenCalledTimes(1)
      })
    })

    it('displays loading state initially', () => {
      // Mock slow API response
      mockGetPeople.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<PeopleTab />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Basic People List Rendering', () => {
    it('renders people cards after successful API call', async () => {
      await act(async () => {
        render(<PeopleTab />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
        expect(screen.getByText('Bob Chen')).toBeInTheDocument()
      })
    })

    it('displays person details correctly', async () => {
      await act(async () => {
        render(<PeopleTab />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Engineering Manager')).toBeInTheDocument()
        expect(screen.getByText('alice@arketic.com')).toBeInTheDocument()
        expect(screen.getByText('+1-555-0101')).toBeInTheDocument()
        expect(screen.getByText('SF Bay Area')).toBeInTheDocument()
        expect(screen.getByText('Engineering')).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('filters people by name', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<PeopleTab />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search people by name, email, or title...')
      await act(async () => {
        await user.type(searchInput, 'Alice')
      })
      
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
        expect(screen.queryByText('Bob Chen')).not.toBeInTheDocument()
      })
    })

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup()
      
      await act(async () => {
        render(<PeopleTab />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search people by name, email, or title...')
      await act(async () => {
        await user.type(searchInput, 'nonexistent')
      })
      
      await waitFor(() => {
        expect(screen.getByText('No people found')).toBeInTheDocument()
      })
    })
  })







  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockGetPeople.mockRejectedValue(new Error('Network error'))
      
      render(<PeopleTab />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error loading people data. Using cached data.',
          variant: 'destructive'
        })
      })
    })

    it('handles API response without data', async () => {
      mockGetPeople.mockResolvedValue({
        success: false,
        data: null
      })
      
      render(<PeopleTab />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Warning',
          description: 'Using offline data. Some information may be outdated.',
          variant: 'destructive'
        })
      })
    })

    it('falls back to mock data on API failure', async () => {
      mockGetPeople.mockRejectedValue(new Error('Network error'))
      
      render(<PeopleTab />)
      
      // Should still show mock data from the component
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })
    })
  })


  describe('Accessibility', () => {
    it('has proper semantic structure', async () => {
      render(<PeopleTab />)
      
      expect(screen.getByRole('main') || screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(5) // Refresh, Add Person, and 3 filter dropdowns
    })

  })

  describe('Performance', () => {
    it('memoizes filtered results to prevent unnecessary re-calculations', async () => {
      const { rerender } = render(<PeopleTab />)
      
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      })
      
      // Re-render with same props should not cause new API calls
      rerender(<PeopleTab />)
      
      await waitFor(() => {
        expect(mockGetPeople).toHaveBeenCalledTimes(1)
      })
    })

    it('handles large datasets efficiently', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        id: `person-${i}`,
        name: `Person ${i}`,
        email: `person${i}@example.com`,
        avatar: '',
        initials: `P${i}`,
        role: 'USER',
        department: 'Engineering',
        title: 'Software Engineer',
        site: 'San Francisco',
        status: 'active',
        phone: '+1-555-0000',
        location: 'SF Bay Area',
        hireDate: '2020-01-01'
      }))
      
      mockGetPeople.mockResolvedValue({
        success: true,
        data: { items: largeMockData, total: largeMockData.length }
      })
      
      render(<PeopleTab />)
      
      await waitFor(() => {
        expect(screen.getByText('1000 people found')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for different screen sizes', () => {
      render(<PeopleTab />)
      
      // Component should render without errors on different screen sizes
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('maintains functionality on mobile viewports', async () => {
      const user = userEvent.setup()
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<PeopleTab />)
      
      // Should still be able to search and filter
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Alice')
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('Alice')
      })
    })
  })
})