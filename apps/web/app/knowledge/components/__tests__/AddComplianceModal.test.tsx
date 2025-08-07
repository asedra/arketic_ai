/**
 * Comprehensive test suite for AddComplianceModal component
 * Tests form validation, submission, error handling, and accessibility
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { testUtils } from '../../../../tests/utils/test-utils'
import { ComplianceFactory, PersonFactory } from '../../../../tests/fixtures/factories'
import { server } from '../../../../tests/api/test-server'
import { http, HttpResponse } from 'msw'
import AddComplianceModal from '../AddComplianceModal'

describe('AddComplianceModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockUsers = PersonFactory.buildMany(5)

  beforeEach(() => {
    testUtils.mocks.resetAllMocks()
    
    // Mock users API for assignee selection
    server.use(
      http.get('/api/users', async () => {
        return HttpResponse.json({ data: mockUsers })
      }),
      
      http.post('/api/compliance', async ({ request }) => {
        const body = await request.json()
        const newItem = ComplianceFactory.build({ ...body, id: 'new-item-id' })
        return HttpResponse.json({ data: newItem }, { status: 201 })
      })
    )
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  }

  describe('Rendering', () => {
    it('renders modal when open', () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      testUtils.modal.expectOpen('Add Compliance Item')
      
      // Check form fields are present
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      testUtils.render(<AddComplianceModal {...defaultProps} isOpen={false} />)
      
      testUtils.modal.expectClosed()
    })

    it('loads assignee options from API', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const assigneeSelect = screen.getByLabelText(/assignee/i)
      await testUtils.user.click(assigneeSelect)
      
      // Wait for options to load
      await waitFor(() => {
        mockUsers.forEach(user => {
          expect(screen.getByText(user.name)).toBeInTheDocument()
        })
      })
    })

    it('shows loading state for assignee options', async () => {
      // Delay the API response
      server.use(
        http.get('/api/users', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({ data: mockUsers })
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const assigneeSelect = screen.getByLabelText(/assignee/i)
      await testUtils.user.click(assigneeSelect)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /save/i })
      await testUtils.user.click(submitButton)
      
      // Check validation errors
      await testUtils.form.expectFieldError('title')
      await testUtils.form.expectFieldError('description')
      await testUtils.form.expectFieldError('status')
    })

    it('validates title length', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      
      // Test minimum length
      await testUtils.user.type(titleInput, 'ab') // Too short
      await testUtils.user.tab() // Trigger validation
      
      await testUtils.form.expectFieldError('title', 'Title must be at least 3 characters')
      
      // Test maximum length
      await testUtils.user.clear(titleInput)
      await testUtils.user.type(titleInput, 'a'.repeat(201)) // Too long
      await testUtils.user.tab()
      
      await testUtils.form.expectFieldError('title', 'Title must be less than 200 characters')
    })

    it('validates description length', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/description/i)
      
      // Test minimum length
      await testUtils.user.type(descriptionInput, 'short') // Too short
      await testUtils.user.tab()
      
      await testUtils.form.expectFieldError('description', 'Description must be at least 10 characters')
    })

    it('validates due date', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const dueDateInput = screen.getByLabelText(/due date/i)
      
      // Test past date
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastDateString = pastDate.toISOString().split('T')[0]
      
      await testUtils.user.type(dueDateInput, pastDateString)
      await testUtils.user.tab()
      
      await testUtils.form.expectFieldError('due date', 'Due date must be in the future')
    })

    it('clears validation errors when fields are corrected', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      
      // Create validation error
      await testUtils.user.type(titleInput, 'ab')
      await testUtils.user.tab()
      
      await testUtils.form.expectFieldError('title')
      
      // Fix the error
      await testUtils.user.clear(titleInput)
      await testUtils.user.type(titleInput, 'Valid Title')
      await testUtils.user.tab()
      
      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/title must be at least/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      title: 'Test Compliance Item',
      description: 'This is a test compliance item description that meets the minimum length requirement.',
      status: 'gap',
      assignee: mockUsers[0].name,
      dueDate: '2024-12-31',
    }

    it('submits valid form data', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Fill form with valid data
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // Verify API call
      await waitFor(() => {
        testUtils.api.expectApiCall(global.fetch, '/api/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: validFormData.title,
            description: validFormData.description,
            status: validFormData.status,
            assignee: validFormData.assignee,
            dueDate: validFormData.dueDate,
          })
        })
      })
      
      // Verify success callback
      expect(mockOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validFormData.title,
          description: validFormData.description,
        })
      )
      
      // Verify modal closes
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('shows loading state during submission', async () => {
      // Delay API response
      server.use(
        http.post('/api/compliance', async ({ request }) => {
          await new Promise(resolve => setTimeout(resolve, 200))
          const body = await request.json()
          return HttpResponse.json({ data: ComplianceFactory.build(body) })
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // Check loading state
      const submitButton = screen.getByRole('button', { name: /saving/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      
      // Wait for completion
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('disables form during submission', async () => {
      server.use(
        http.post('/api/compliance', async () => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return HttpResponse.json({ data: ComplianceFactory.build() })
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Fill and submit form
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // All form fields should be disabled
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      expect(titleInput).toBeDisabled()
      expect(descriptionInput).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('prevents duplicate submissions', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // Try to submit again immediately
      const submitButton = screen.getByRole('button', { name: /saving/i })
      await testUtils.user.click(submitButton)
      
      // Should only be called once
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2) // 1 for users, 1 for submission
      })
    })
  })

  describe('Error Handling', () => {
    const validFormData = {
      title: 'Test Compliance Item',
      description: 'This is a test compliance item description.',
      status: 'gap',
    }

    it('handles API validation errors', async () => {
      server.use(
        http.post('/api/compliance', async () => {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              details: {
                title: 'Title already exists',
                description: 'Description is too short'
              }
            },
            { status: 400 }
          )
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // Check field-specific errors
      await waitFor(() => {
        expect(screen.getByText('Title already exists')).toBeInTheDocument()
        expect(screen.getByText('Description is too short')).toBeInTheDocument()
      })
    })

    it('handles generic API errors', async () => {
      server.use(
        http.post('/api/compliance', async () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('handles network errors', async () => {
      server.use(
        http.post('/api/compliance', async () => {
          return HttpResponse.error()
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('retries submission after error', async () => {
      let attemptCount = 0
      server.use(
        http.post('/api/compliance', async ({ request }) => {
          attemptCount++
          if (attemptCount === 1) {
            return HttpResponse.json(
              { error: 'Server error' },
              { status: 500 }
            )
          }
          const body = await request.json()
          return HttpResponse.json({ data: ComplianceFactory.build(body) })
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
      
      // Retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await testUtils.user.click(retryButton)
      
      // Should succeed on retry
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('resets form state after error retry', async () => {
      server.use(
        http.post('/api/compliance', async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          )
        })
      )

      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.form.fillAndSubmit(validFormData, 'Save')
      
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
      
      // Form fields should be re-enabled
      const titleInput = screen.getByLabelText(/title/i)
      const submitButton = screen.getByRole('button', { name: /save/i })
      
      expect(titleInput).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Modal Interactions', () => {
    it('closes modal when cancel button is clicked', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await testUtils.user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes modal when clicking outside', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const backdrop = screen.getByTestId('modal-backdrop')
      await testUtils.user.click(backdrop)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes modal when pressing Escape key', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await testUtils.user.keyboard('{Escape}')
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('confirms before closing with unsaved changes', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Make changes to form
      const titleInput = screen.getByLabelText(/title/i)
      await testUtils.user.type(titleInput, 'Some changes')
      
      // Try to close
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await testUtils.user.click(cancelButton)
      
      // Should show confirmation dialog
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /keep editing/i })).toBeInTheDocument()
    })

    it('resets form when modal is reopened', async () => {
      const { rerender } = testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Fill form
      const titleInput = screen.getByLabelText(/title/i)
      await testUtils.user.type(titleInput, 'Test Title')
      
      // Close modal
      rerender(<AddComplianceModal {...defaultProps} isOpen={false} />)
      
      // Reopen modal
      rerender(<AddComplianceModal {...defaultProps} isOpen={true} />)
      
      // Form should be reset
      const newTitleInput = screen.getByLabelText(/title/i)
      expect(newTitleInput).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('has proper modal accessibility attributes', () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-labelledby')
      expect(modal).toHaveAttribute('aria-describedby')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })

    it('focuses first form field when opened', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i)
        expect(titleInput).toHaveFocus()
      })
    })

    it('traps focus within modal', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const focusableElements = [
        screen.getByLabelText(/title/i),
        screen.getByLabelText(/description/i),
        screen.getByLabelText(/status/i),
        screen.getByRole('button', { name: /cancel/i }),
        screen.getByRole('button', { name: /save/i }),
      ]
      
      // Tab through elements
      for (let i = 0; i < focusableElements.length; i++) {
        await testUtils.user.keyboard('{Tab}')
        expect(focusableElements[i]).toHaveFocus()
      }
      
      // Tab after last element should go back to first
      await testUtils.user.keyboard('{Tab}')
      expect(focusableElements[0]).toHaveFocus()
    })

    it('has proper form labels and descriptions', () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Check required field indicators
      const titleLabel = screen.getByLabelText(/title/i)
      expect(titleLabel).toHaveAttribute('aria-required', 'true')
      
      // Check help text associations
      const descriptionInput = screen.getByLabelText(/description/i)
      const helpText = screen.getByText(/provide detailed description/i)
      expect(descriptionInput).toHaveAttribute('aria-describedby', helpText.id)
    })

    it('announces validation errors to screen readers', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /save/i })
      await testUtils.user.click(submitButton)
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i)
        expect(titleInput).toHaveAttribute('aria-invalid', 'true')
        expect(titleInput).toHaveAttribute('aria-describedby', expect.stringMatching(/error/))
      })
    })

    it('supports keyboard navigation for form controls', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      // Should be able to navigate entire form with keyboard
      const titleInput = screen.getByLabelText(/title/i)
      titleInput.focus()
      
      // Tab through all form controls
      await testUtils.user.keyboard('{Tab}') // Description
      await testUtils.user.keyboard('{Tab}') // Status
      await testUtils.user.keyboard('{Tab}') // Assignee
      await testUtils.user.keyboard('{Tab}') // Due date
      await testUtils.user.keyboard('{Tab}') // Cancel button
      await testUtils.user.keyboard('{Tab}') // Save button
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toHaveFocus()
    })
  })

  describe('Performance', () => {
    it('renders within acceptable time limit', async () => {
      await testUtils.performance.expectFastRender(
        () => testUtils.render(<AddComplianceModal {...defaultProps} />),
        150 // 150ms max for modal
      )
    })

    it('debounces validation to avoid excessive API calls', async () => {
      testUtils.render(<AddComplianceModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      
      // Type rapidly
      await testUtils.user.type(titleInput, 'test')
      
      // Wait for debounce
      await testUtils.async.waitForTimeout(300)
      
      // Should only validate once after debounce
      const errorElements = screen.queryAllByRole('alert')
      expect(errorElements.length).toBeLessThanOrEqual(1)
    })
  })
})