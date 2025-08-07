/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { 
  useArketicStore, 
  usePeople, 
  useActiveTab, 
  useArketicActions,
  useFilteredPeople,
  useComplianceStats
} from '../state-manager'

// Mock data
const mockPeople = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar1.jpg',
    initials: 'JD',
    role: 'Manager',
    department: 'Engineering',
    title: 'Senior Engineer',
    site: 'New York',
    status: 'active',
    phone: '+1234567890',
    location: 'NYC',
    hireDate: '2020-01-01'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: '/avatar2.jpg',
    initials: 'JS',
    role: 'Developer',
    department: 'Engineering',
    title: 'Software Engineer',
    site: 'San Francisco',
    status: 'active',
    phone: '+1234567891',
    location: 'SF',
    hireDate: '2021-02-01'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    avatar: '/avatar3.jpg',
    initials: 'BJ',
    role: 'Designer',
    department: 'Design',
    title: 'UI Designer',
    site: 'New York',
    status: 'active',
    phone: '+1234567892',
    location: 'NYC',
    hireDate: '2019-03-01'
  }
]

const mockCompliance = [
  {
    id: '1',
    title: 'Clause 1',
    description: 'Test clause 1',
    status: 'compliant' as const,
    departments: { 'Engineering': 'compliant' as const },
    linkedServices: 5
  },
  {
    id: '2',
    title: 'Clause 2',
    description: 'Test clause 2',
    status: 'gap' as const,
    departments: { 'Design': 'gap' as const },
    linkedServices: 3
  },
  {
    id: '3',
    title: 'Clause 3',
    description: 'Test clause 3',
    status: 'compliant' as const,
    departments: { 'Engineering': 'compliant' as const },
    linkedServices: 2
  }
]

// Reset store before each test
beforeEach(() => {
  const store = useArketicStore.getState()
  store.setPeople([])
  store.setCompliance([])
  store.setActiveTab('people')
  store.setSearchTerm('people', '')
  store.setFilter('people', 'department', null)
})

describe('Arketic State Manager', () => {
  describe('Basic State Management', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useArketicStore())
      
      expect(result.current.people).toEqual([])
      expect(result.current.activeTab).toBe('people')
      expect(result.current.searchTerms).toEqual({})
      expect(result.current.filters).toEqual({})
    })

    it('updates people data', () => {
      const { result } = renderHook(() => useArketicStore())
      
      act(() => {
        result.current.setPeople(mockPeople)
      })
      
      expect(result.current.people).toEqual(mockPeople)
      expect(result.current.people).toHaveLength(3)
    })

    it('updates active tab', () => {
      const { result } = renderHook(() => useArketicActions())
      const { result: tabResult } = renderHook(() => useActiveTab())
      
      act(() => {
        result.current.setActiveTab('org-chart')
      })
      
      expect(tabResult.current).toBe('org-chart')
    })

    it('updates search terms', () => {
      const { result } = renderHook(() => useArketicStore())
      
      act(() => {
        result.current.setSearchTerm('people', 'john')
      })
      
      expect(result.current.searchTerms.people).toBe('john')
    })

    it('updates filters', () => {
      const { result } = renderHook(() => useArketicStore())
      
      act(() => {
        result.current.setFilter('people', 'department', 'Engineering')
      })
      
      expect(result.current.filters.people.department).toBe('Engineering')
    })

    it('updates loading states', () => {
      const { result } = renderHook(() => useArketicStore())
      
      act(() => {
        result.current.setLoading('people', true)
      })
      
      expect(result.current.loading.people).toBe(true)
      
      act(() => {
        result.current.setLoading('people', false)
      })
      
      expect(result.current.loading.people).toBe(false)
    })
  })

  describe('Selectors', () => {
    it('usePeople selector returns people data', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: peopleResult } = renderHook(() => usePeople())
      
      act(() => {
        storeResult.current.setPeople(mockPeople)
      })
      
      expect(peopleResult.current).toEqual(mockPeople)
    })

    it('useActiveTab selector returns active tab', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: tabResult } = renderHook(() => useActiveTab())
      
      act(() => {
        storeResult.current.setActiveTab('iso')
      })
      
      expect(tabResult.current).toBe('iso')
    })
  })

  describe('Filtered People', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useArketicStore())
      act(() => {
        result.current.setPeople(mockPeople)
      })
    })

    it('returns all people when no search term', () => {
      const { result } = renderHook(() => useFilteredPeople())
      
      expect(result.current).toHaveLength(3)
      expect(result.current).toEqual(mockPeople)
    })

    it('filters people by name search', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setSearchTerm('people', 'john')
      })
      
      expect(filteredResult.current).toHaveLength(2) // John Doe and Bob Johnson
      expect(filteredResult.current.map(p => p.name)).toEqual(['John Doe', 'Bob Johnson'])
    })

    it('filters people by email search', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setSearchTerm('people', 'jane@example.com')
      })
      
      expect(filteredResult.current).toHaveLength(1)
      expect(filteredResult.current[0].name).toBe('Jane Smith')
    })

    it('filters people by department', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setFilter('people', 'department', 'Engineering')
      })
      
      expect(filteredResult.current).toHaveLength(2)
      expect(filteredResult.current.every(p => p.department === 'Engineering')).toBe(true)
    })

    it('filters people by site', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setFilter('people', 'site', 'New York')
      })
      
      expect(filteredResult.current).toHaveLength(2)
      expect(filteredResult.current.every(p => p.site === 'New York')).toBe(true)
    })

    it('filters people by role', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setFilter('people', 'role', 'Manager')
      })
      
      expect(filteredResult.current).toHaveLength(1)
      expect(filteredResult.current[0].role).toBe('Manager')
    })

    it('combines search and filters', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setSearchTerm('people', 'john')
        storeResult.current.setFilter('people', 'department', 'Engineering')
      })
      
      expect(filteredResult.current).toHaveLength(1)
      expect(filteredResult.current[0].name).toBe('John Doe')
    })

    it('handles case-insensitive search', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: filteredResult } = renderHook(() => useFilteredPeople())
      
      act(() => {
        storeResult.current.setSearchTerm('people', 'JOHN')
      })
      
      expect(filteredResult.current).toHaveLength(2)
    })
  })

  describe('Compliance Stats', () => {
    it('calculates compliance stats correctly', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: statsResult } = renderHook(() => useComplianceStats())
      
      act(() => {
        storeResult.current.setCompliance(mockCompliance)
      })
      
      expect(statsResult.current.total).toBe(3)
      expect(statsResult.current.compliant).toBe(2)
      expect(statsResult.current.gaps).toBe(1)
      expect(statsResult.current.percentage).toBe(67) // 2/3 * 100 rounded
    })

    it('handles empty compliance data', () => {
      const { result } = renderHook(() => useComplianceStats())
      
      expect(result.current.total).toBe(0)
      expect(result.current.compliant).toBe(0)
      expect(result.current.gaps).toBe(0)
      expect(result.current.percentage).toBe(0)
    })

    it('handles all compliant data', () => {
      const { result: storeResult } = renderHook(() => useArketicStore())
      const { result: statsResult } = renderHook(() => useComplianceStats())
      
      const allCompliant = mockCompliance.map(c => ({ ...c, status: 'compliant' as const }))
      
      act(() => {
        storeResult.current.setCompliance(allCompliant)
      })
      
      expect(statsResult.current.percentage).toBe(100)
      expect(statsResult.current.gaps).toBe(0)
    })
  })

  describe('Actions Hook', () => {
    it('provides all action methods', () => {
      const { result } = renderHook(() => useArketicActions())
      
      expect(typeof result.current.setPeople).toBe('function')
      expect(typeof result.current.setActiveTab).toBe('function')
      expect(typeof result.current.setSearchTerm).toBe('function')
      expect(typeof result.current.setFilter).toBe('function')
      expect(typeof result.current.setLoading).toBe('function')
    })
  })

  describe('Performance and Memory', () => {
    it('does not cause memory leaks with multiple subscriptions', () => {
      const subscriptions: Array<() => void> = []
      
      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        const unsubscribe = useArketicStore.subscribe(
          (state) => state.people.length,
          () => {}
        )
        subscriptions.push(unsubscribe)
      }
      
      // Cleanup should not throw
      expect(() => {
        subscriptions.forEach(unsub => unsub())
      }).not.toThrow()
    })

    it('only re-renders components that use changed data', () => {
      const peopleRenders = jest.fn()
      const tabRenders = jest.fn()
      
      const { result: peopleResult } = renderHook(() => {
        peopleRenders()
        return usePeople()
      })
      
      const { result: tabResult } = renderHook(() => {
        tabRenders()
        return useActiveTab()
      })
      
      const { result: storeResult } = renderHook(() => useArketicStore())
      
      // Initial renders
      expect(peopleRenders).toHaveBeenCalledTimes(1)
      expect(tabRenders).toHaveBeenCalledTimes(1)
      
      // Change people - should only re-render people hook
      act(() => {
        storeResult.current.setPeople(mockPeople)
      })
      
      expect(peopleRenders).toHaveBeenCalledTimes(2)
      expect(tabRenders).toHaveBeenCalledTimes(1) // No additional render
      
      // Change tab - should only re-render tab hook
      act(() => {
        storeResult.current.setActiveTab('org-chart')
      })
      
      expect(peopleRenders).toHaveBeenCalledTimes(2) // No additional render
      expect(tabRenders).toHaveBeenCalledTimes(2)
    })
  })
})