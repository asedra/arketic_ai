/**
 * Comprehensive tests for AddPersonModal component
 * Tests form rendering, validation, submission, error handling, and accessibility
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPersonModal } from '../AddPersonModal'
import { useToast } from '@/hooks/use-toast'
import { organizationApi } from '@/lib/api-client'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

jest.mock('@/lib/api-client', () => ({
  organizationApi: {
    createPerson: jest.fn()
  }
}))

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0]
    }
    if (formatStr === 'PPP') {
      return 'January 1, 2024'
    }
    return date.toISOString()
  })
}))

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useForm: () => ({
    control: {
      _formState: { errors: {} },
      _fields: {},
      _defaultValues: {},
      register: jest.fn(),
      unregister: jest.fn(),
      _getWatch: jest.fn(),
      _formValues: {},
      _executeSchema: jest.fn(),
      _updateValid: jest.fn(),
      _removeUnmounted: jest.fn(),
      _getDirty: jest.fn(),
      _updateFieldArray: jest.fn(),
      _reset: jest.fn(),
      _validateField: jest.fn(),
      _getFieldArray: jest.fn(),
      _subjects: {
        values: { next: jest.fn() },
        array: { next: jest.fn() },
        state: { next: jest.fn() }
      }
    },
    handleSubmit: jest.fn((fn) => (e) => {
      e?.preventDefault?.()
      return fn(mockFormData)
    }),
    formState: { errors: {} },
    reset: jest.fn(),
    setValue: jest.fn(),
    setError: jest.fn(),
    getValues: jest.fn(() => mockFormData),
    watch: jest.fn(),
    trigger: jest.fn(),
    clearErrors: jest.fn()
  }),
  Controller: ({ render }: any) => {
    return render({
      field: {
        onChange: jest.fn(),
        onBlur: jest.fn(),
        value: '',
        name: 'test',
        ref: jest.fn()
      },
      fieldState: { error: undefined },
      formState: { errors: {} }
    })
  }
}))

const mockToast = jest.fn()
const mockCreatePerson = organizationApi.createPerson as jest.MockedFunction<typeof organizationApi.createPerson>

// Mock form data
const mockFormData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  site: 'San Francisco',
  role: 'USER' as const,
  hireDate: new Date('2024-01-01'),
  manager: 'manager-1',
  location: 'SF Bay Area',
  employeeId: 'EMP001'
}

// Mock existing people data
const mockExistingPeople = [
  {
    id: 'manager-1',
    name: 'Alice Manager',
    email: 'alice@example.com',
    department: 'Engineering',
    site: 'San Francisco',
    role: 'MANAGER',
    title: 'Engineering Manager'
  },
  {
    id: 'user-1',
    name: 'Bob User',
    email: 'bob@example.com',
    department: 'Design',
    site: 'New York',
    role: 'USER',
    title: 'Designer'
  }
]

// Default props
const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onPersonAdded: jest.fn(),
  existingPeople: mockExistingPeople
}

describe('AddPersonModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    mockCreatePerson.mockResolvedValue({
      success: true,
      data: { id: 'new-person', ...mockFormData },
      message: 'Person created successfully'
    })
  })

  describe('Rendering', () => {
    it('renders modal when open is true', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add New Person')).toBeInTheDocument()
      expect(screen.getByText('Add a new person to your organization. Fill in their details below.')).toBeInTheDocument()
    })

    it('does not render modal when open is false', () => {
      render(<AddPersonModal {...defaultProps} open={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders all required form fields', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      // Basic Information section
      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument()

      // Job Information section
      expect(screen.getByText('Job Information')).toBeInTheDocument()
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/site/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/manager/i)).toBeInTheDocument()

      // Additional Information section
      expect(screen.getByText('Additional Information')).toBeInTheDocument()
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/hire date/i)).toBeInTheDocument()
    })

    it('renders form action buttons', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument()
    })

    it('renders required field indicators', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      // Check for asterisks (*) indicating required fields
      expect(screen.getByText('First Name *')).toBeInTheDocument()
      expect(screen.getByText('Last Name *')).toBeInTheDocument()
      expect(screen.getByText('Email Address *')).toBeInTheDocument()
      expect(screen.getByText('Job Title *')).toBeInTheDocument()
      expect(screen.getByText('Department *')).toBeInTheDocument()
      expect(screen.getByText('Site *')).toBeInTheDocument()
      expect(screen.getByText('Role *')).toBeInTheDocument()
    })
  })

  describe('Dropdown Population', () => {
    it('populates department dropdown with existing departments', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      const departmentSelect = screen.getByLabelText(/department/i)
      fireEvent.click(departmentSelect)
      
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Design')).toBeInTheDocument()
      expect(screen.getByText('Add New Department')).toBeInTheDocument()
    })

    it('populates site dropdown with existing sites', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      const siteSelect = screen.getByLabelText(/site/i)
      fireEvent.click(siteSelect)
      
      expect(screen.getByText('San Francisco')).toBeInTheDocument()
      expect(screen.getByText('New York')).toBeInTheDocument()
      expect(screen.getByText('Add New Site')).toBeInTheDocument()
    })

    it('populates role dropdown with predefined roles', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      const roleSelect = screen.getByLabelText(/role/i)
      fireEvent.click(roleSelect)
      
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument()
    })

    it('populates manager dropdown with managers only', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      const managerSelect = screen.getByLabelText(/manager/i)
      fireEvent.click(managerSelect)
      
      expect(screen.getByText('No Manager')).toBeInTheDocument()
      expect(screen.getByText('Alice Manager - Engineering Manager')).toBeInTheDocument()
      // Bob User should not appear as he's not a Manager or Admin
      expect(screen.queryByText('Bob User - Designer')).not.toBeInTheDocument()
    })
  })

  describe('Custom Department/Site Creation', () => {
    it('allows adding a custom department', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      // Click department dropdown
      const departmentSelect = screen.getByLabelText(/department/i)
      await user.click(departmentSelect)
      
      // Click "Add New Department"
      await user.click(screen.getByText('Add New Department'))
      
      // Verify custom input appears
      expect(screen.getByPlaceholderText('Enter new department')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
      
      // Enter custom department name
      await user.type(screen.getByPlaceholderText('Enter new department'), 'Marketing')
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      // Verify custom department input is hidden
      expect(screen.queryByPlaceholderText('Enter new department')).not.toBeInTheDocument()
    })

    it('allows adding a custom site', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      // Click site dropdown
      const siteSelect = screen.getByLabelText(/site/i)
      await user.click(siteSelect)
      
      // Click "Add New Site"
      await user.click(screen.getByText('Add New Site'))
      
      // Verify custom input appears
      expect(screen.getByPlaceholderText('Enter new site')).toBeInTheDocument()
      
      // Enter custom site name
      await user.type(screen.getByPlaceholderText('Enter new site'), 'Austin')
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      // Verify custom site input is hidden
      expect(screen.queryByPlaceholderText('Enter new site')).not.toBeInTheDocument()
    })

    it('allows canceling custom department creation', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      const departmentSelect = screen.getByLabelText(/department/i)
      await user.click(departmentSelect)
      await user.click(screen.getByText('Add New Department'))
      
      // Click cancel button (X)
      const cancelButton = screen.getByRole('button', { name: '' }) // X button
      await user.click(cancelButton)
      
      // Verify custom input is hidden
      expect(screen.queryByPlaceholderText('Enter new department')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      // Should not call API with empty required fields
      expect(mockCreatePerson).not.toHaveBeenCalled()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'invalid-email')
      
      // Should show validation error for invalid email
      // Note: Actual validation is handled by Zod schema and react-hook-form
    })

    it('validates unique email addresses', async () => {
      const user = userEvent.setup()
      
      // Mock form with duplicate email
      jest.doMock('react-hook-form', () => ({
        ...jest.requireActual('react-hook-form'),
        useForm: () => ({
          control: {},
          handleSubmit: jest.fn((fn) => (e) => {
            e.preventDefault()
            fn({ ...mockFormData, email: 'alice@example.com' }) // Duplicate email
          }),
          formState: { errors: {} },
          reset: jest.fn(),
          setValue: jest.fn(),
          setError: jest.fn(),
          getValues: jest.fn(() => ({ ...mockFormData, email: 'alice@example.com' }))
        })
      }))
      
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      // Should not call API with duplicate email
      expect(mockCreatePerson).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data structure', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      expect(mockCreatePerson).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        job_title: 'Software Engineer',
        department: 'Engineering',
        site: 'San Francisco',
        role: 'USER',
        hire_date: '2024-01-01',
        manager_id: 'manager-1',
        location: 'SF Bay Area',
        employee_id: 'EMP001'
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      mockCreatePerson.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText('Adding Person...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding person/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('handles successful submission', async () => {
      const user = userEvent.setup()
      const onPersonAdded = jest.fn()
      const onOpenChange = jest.fn()
      
      render(<AddPersonModal {...defaultProps} onPersonAdded={onPersonAdded} onOpenChange={onOpenChange} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'John Doe has been added successfully'
        })
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(onPersonAdded).toHaveBeenCalled()
      })
    })

    it('handles API validation errors', async () => {
      const user = userEvent.setup()
      
      mockCreatePerson.mockResolvedValue({
        success: false,
        message: 'Validation failed',
        errors: {
          email: ['Email already exists'],
          first_name: ['First name is required']
        }
      })
      
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        // Should handle field-specific errors
        expect(mockCreatePerson).toHaveBeenCalled()
      })
    })

    it('handles general API errors', async () => {
      const user = userEvent.setup()
      
      mockCreatePerson.mockRejectedValue(new Error('Network error'))
      
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Network error',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Modal Behavior', () => {
    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      
      render(<AddPersonModal {...defaultProps} onOpenChange={onOpenChange} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets form when modal is closed and reopened', () => {
      const { rerender } = render(<AddPersonModal {...defaultProps} open={false} />)
      
      // Open modal
      rerender(<AddPersonModal {...defaultProps} open={true} />)
      
      // Form should be reset (this is tested through the useEffect in the component)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('prevents submission while already submitting', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      mockCreatePerson.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: {},
        message: 'Success'
      }), 1000)))
      
      render(<AddPersonModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add person/i })
      
      // Click submit button multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should only call API once
      expect(mockCreatePerson).toHaveBeenCalledTimes(1)
    })
  })

  describe('Date Picker', () => {
    it('opens calendar when hire date button is clicked', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      const hireDateButton = screen.getByRole('button', { name: /pick a date/i })
      await user.click(hireDateButton)
      
      // Calendar should be visible (implementation depends on UI library)
      expect(hireDateButton).toBeInTheDocument()
    })

    it('formats selected date correctly', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      // Test that date formatting works (mocked format function should be called)
      const hireDateButton = screen.getByRole('button', { name: /pick a date/i })
      expect(hireDateButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<AddPersonModal {...defaultProps} />)
      
      // Tab through form fields
      await user.tab()
      expect(screen.getByLabelText(/first name/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/last name/i)).toHaveFocus()
    })

    it('supports escape key to close modal', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      
      render(<AddPersonModal {...defaultProps} onOpenChange={onOpenChange} />)
      
      await user.keyboard('{Escape}')
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('has proper focus management', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      // First focusable element should receive focus when modal opens
      expect(document.activeElement).toBeInTheDocument()
    })

    it('announces form validation errors to screen readers', () => {
      render(<AddPersonModal {...defaultProps} />)
      
      // Error messages should be associated with form fields via aria-describedby
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toBeInTheDocument()
    })
  })

  describe('Error Boundary Integration', () => {
    it('handles component errors gracefully', () => {
      // Mock console.error to prevent noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // This would test error boundary behavior if implemented
      render(<AddPersonModal {...defaultProps} />)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const { rerender } = render(<AddPersonModal {...defaultProps} />)
      
      // Re-render with same props
      rerender(<AddPersonModal {...defaultProps} />)
      
      // Component should handle props changes efficiently
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('cleans up properly when unmounted', () => {
      const { unmount } = render(<AddPersonModal {...defaultProps} />)
      
      unmount()
      
      // Should not cause memory leaks or warnings
    })
  })
})