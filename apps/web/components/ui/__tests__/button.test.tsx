import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, buttonVariants, type ButtonProps } from '../button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders with different variants', () => {
      const variants: Array<ButtonProps['variant']> = [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link'
      ]

      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>Button</Button>)
        const button = screen.getByRole('button')
        
        // Check that the button has the expected variant classes
        const variantClasses = buttonVariants({ variant })
        expect(button).toHaveClass(...variantClasses.split(' ').filter(Boolean))
        
        unmount()
      })
    })

    it('renders with different sizes', () => {
      const sizes: Array<ButtonProps['size']> = ['default', 'sm', 'lg', 'icon']

      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>Button</Button>)
        const button = screen.getByRole('button')
        
        const sizeClasses = buttonVariants({ size })
        expect(button).toHaveClass(...sizeClasses.split(' ').filter(Boolean))
        
        unmount()
      })
    })

    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('renders with icons', () => {
      const TestIcon = () => <span data-testid="test-icon">🚀</span>
      
      render(
        <Button>
          <TestIcon />
          Button with icon
        </Button>
      )
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
      expect(screen.getByText('Button with icon')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('handles click events', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger click when disabled', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick} disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      
      await user.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('handles keyboard navigation', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('handles form submission', () => {
      const handleSubmit = jest.fn(e => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })

    it('supports focus-visible styles', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-2')
    })

    it('has proper disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none')
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('maintains semantic button role when asChild is false', () => {
      render(<Button>Standard Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })
  })

  describe('Styling', () => {
    it('applies correct CSS classes for destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('text-destructive-foreground')
      expect(button).toHaveClass('hover:bg-destructive/90')
    })

    it('applies correct CSS classes for outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('border-input')
      expect(button).toHaveClass('bg-background')
    })

    it('merges custom classes with variant classes', () => {
      render(
        <Button variant="outline" className="custom-padding">
          Custom Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border') // from variant
      expect(button).toHaveClass('custom-padding') // custom class
    })
  })

  describe('Loading States', () => {
    it('can display loading state with disabled interaction', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      const { rerender } = render(
        <Button onClick={handleClick} disabled={false}>
          Normal Button
        </Button>
      )
      
      // Button should work normally
      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      // Simulate loading state
      rerender(
        <Button onClick={handleClick} disabled>
          Loading...
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('Loading...')
      
      await user.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1) // Should not increase
    })
  })

  describe('Button Variants Utility', () => {
    it('generates correct classes for different combinations', () => {
      const defaultClasses = buttonVariants()
      expect(defaultClasses).toContain('bg-primary')
      expect(defaultClasses).toContain('h-10')
      
      const customClasses = buttonVariants({ 
        variant: 'secondary', 
        size: 'lg' 
      })
      expect(customClasses).toContain('bg-secondary')
      expect(customClasses).toContain('h-11')
    })

    it('handles className override', () => {
      const classes = buttonVariants({ 
        className: 'custom-override' 
      })
      expect(classes).toContain('custom-override')
    })
  })
})