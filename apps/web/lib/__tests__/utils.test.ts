import { cn } from '../utils'

describe('Utils', () => {
  describe('cn function', () => {
    it('merges class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toBe('base-class additional-class')
    })

    it('handles conditional classes', () => {
      const condition = true
      const result = cn('base-class', condition && 'conditional-class')
      expect(result).toBe('base-class conditional-class')
    })

    it('removes falsy values', () => {
      const result = cn('base-class', false && 'false-class', null, undefined, '')
      expect(result).toBe('base-class')
    })

    it('handles Tailwind class conflicts', () => {
      // tailwind-merge should resolve conflicts by keeping the last class
      const result = cn('p-4 p-8')
      expect(result).toBe('p-8')
    })

    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('handles objects with conditional classes', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      })
      expect(result).toBe('class1 class3')
    })

    it('handles complex combinations', () => {
      const isActive = true
      const size = 'large'
      const result = cn(
        'base-class',
        {
          'active': isActive,
          'inactive': !isActive
        },
        size === 'large' && 'large-size',
        ['extra1', 'extra2']
      )
      expect(result).toBe('base-class active large-size extra1 extra2')
    })

    it('handles empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
      expect(cn(null)).toBe('')
      expect(cn(undefined)).toBe('')
    })

    it('deduplicates identical classes', () => {
      const result = cn('duplicate', 'other', 'duplicate')
      expect(result).toBe('duplicate other')
    })

    it('handles Tailwind responsive and state variants', () => {
      const result = cn(
        'text-sm md:text-lg',
        'hover:text-blue-500',
        'focus:outline-none'
      )
      expect(result).toBe('text-sm md:text-lg hover:text-blue-500 focus:outline-none')
    })
  })
})