/**
 * Lightweight state management for Arketic frontend
 * Using Zustand for global state with performance optimizations
 */

import { create } from 'zustand'
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Section, User, KnowledgeItem, Assistant, DashboardState } from './types'

// Types
interface Person {
  id: string
  name: string
  email: string
  avatar: string
  initials: string
  role: string
  department: string
  title: string
  site: string
  status: string
  phone: string
  location: string
  hireDate: string
}

export interface OrgNode {
  id: string
  name: string
  type: 'site' | 'department' | 'title' | 'user'
  email?: string
  avatar?: string
  initials?: string
  role?: string
  manager?: string
  location?: string
  children?: OrgNode[]
}

interface Clause {
  id: string
  title: string
  description: string
  status: 'compliant' | 'gap'
  departments: Record<string, 'compliant' | 'gap'>
  linkedServices: number
}

// Enhanced global state interface
interface ArketicState extends DashboardState {
  // Data
  people: User[]
  orgChart: OrgNode[]
  compliance: Clause[]
  knowledgeItems: KnowledgeItem[]
  assistants: Assistant[]
  
  // UI State inherited from DashboardState
  searchTerms: Record<string, string>
  filters: Record<string, any>
  selectedItems: Record<string, any>
  
  // Loading states
  loading: Record<string, boolean>
  
  // Actions
  setPeople: (people: User[]) => void
  setOrgChart: (orgChart: OrgNode[]) => void
  setCompliance: (compliance: Clause[]) => void
  setKnowledgeItems: (items: KnowledgeItem[]) => void
  setAssistants: (assistants: Assistant[]) => void
  setActiveSection: (section: Section) => void
  setActiveTab: (tab: string) => void
  setSearchTerm: (context: string, term: string) => void
  setFilter: (context: string, key: string, value: any) => void
  setSelectedItem: (context: string, item: any) => void
  setLoading: (context: string, loading: boolean) => void
  
  // Computed selectors
  getFilteredPeople: (searchTerm?: string, filters?: any) => User[]
  getFilteredKnowledgeItems: (searchTerm?: string) => KnowledgeItem[]
  getFilteredAssistants: (searchTerm?: string) => Assistant[]
  getComplianceStats: () => {
    total: number
    compliant: number
    gaps: number
    percentage: number
  }
}

// Create the store with middleware
export const useArketicStore = create<ArketicState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state - Dashboard State
        activeSection: 'analytics' as Section,
        searchQuery: '',
        selectedAssistant: 'ChatGPT 4o',
        chatMessage: '',
        selectedKnowledgeItems: [],
        selectedKnowledgeItem: null,
        viewMode: 'grid' as 'grid' | 'list',
        sortBy: 'recent',
        dateRange: '7d',
        showCreateGroupModal: false,
        isCreateModalOpen: false,
        isUsersModalOpen: false,
        
        // Data state
        people: [],
        orgChart: [],
        compliance: [],
        knowledgeItems: [],
        assistants: [],
        
        // Legacy UI state (for backward compatibility)
        activeTab: 'people',
        searchTerms: {},
        filters: {},
        selectedItems: {},
        loading: {},

        // Actions
        setPeople: (people) =>
          set((state) => {
            state.people = people
          }),

        setOrgChart: (orgChart) =>
          set((state) => {
            state.orgChart = orgChart
          }),

        setCompliance: (compliance) =>
          set((state) => {
            state.compliance = compliance
          }),
          
        setKnowledgeItems: (items) =>
          set((state) => {
            state.knowledgeItems = items
          }),
          
        setAssistants: (assistants) =>
          set((state) => {
            state.assistants = assistants
          }),
          
        setActiveSection: (section) =>
          set((state) => {
            state.activeSection = section
          }),

        setActiveTab: (tab) =>
          set((state) => {
            state.activeTab = tab
          }),

        setSearchTerm: (context, term) =>
          set((state) => {
            state.searchTerms[context] = term
          }),

        setFilter: (context, key, value) =>
          set((state) => {
            if (!state.filters[context]) {
              state.filters[context] = {}
            }
            state.filters[context][key] = value
          }),

        setSelectedItem: (context, item) =>
          set((state) => {
            state.selectedItems[context] = item
          }),

        setLoading: (context, loading) =>
          set((state) => {
            state.loading[context] = loading
          }),

        // Computed selectors
        getFilteredPeople: (searchTerm, filters) => {
          const state = get()
          const term = searchTerm || state.searchTerms.people || ''
          const currentFilters = filters || state.filters.people || {}

          return state.people.filter((person) => {
            const matchesSearch = 
              person.name.toLowerCase().includes(term.toLowerCase()) ||
              person.email.toLowerCase().includes(term.toLowerCase()) ||
              person.title.toLowerCase().includes(term.toLowerCase())

            const matchesDepartment = 
              !currentFilters.department || 
              currentFilters.department === 'all' || 
              person.department === currentFilters.department

            const matchesSite = 
              !currentFilters.site || 
              currentFilters.site === 'all' || 
              person.site === currentFilters.site

            const matchesRole = 
              !currentFilters.role || 
              currentFilters.role === 'all' || 
              person.role === currentFilters.role

            return matchesSearch && matchesDepartment && matchesSite && matchesRole
          })
        },

        getComplianceStats: () => {
          const state = get()
          const total = state.compliance.length
          const compliant = state.compliance.filter(c => c.status === 'compliant').length
          const gaps = total - compliant
          const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0

          return { total, compliant, gaps, percentage }
        },
        
        getFilteredKnowledgeItems: (searchTerm) => {
          const state = get()
          const term = searchTerm || state.searchQuery || ''
          
          if (!term) return state.knowledgeItems
          
          return state.knowledgeItems.filter((item) => 
            item.name.toLowerCase().includes(term.toLowerCase()) ||
            item.description?.toLowerCase().includes(term.toLowerCase()) ||
            item.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
          )
        },
        
        getFilteredAssistants: (searchTerm) => {
          const state = get()
          const term = searchTerm || state.searchQuery || ''
          
          if (!term) return state.assistants
          
          return state.assistants.filter((assistant) =>
            assistant.name.toLowerCase().includes(term.toLowerCase()) ||
            assistant.provider.toLowerCase().includes(term.toLowerCase()) ||
            assistant.description.toLowerCase().includes(term.toLowerCase())
          )
        }
      }))
    ),
    { name: 'arketic-store' }
  )
)

// Selectors for specific slices to prevent unnecessary re-renders
export const usePeople = () => useArketicStore(state => state.people)
export const useOrgChart = () => useArketicStore(state => state.orgChart)
export const useCompliance = () => useArketicStore(state => state.compliance)
export const useActiveTab = () => useArketicStore(state => state.activeTab)
export const useSearchTerm = (context: string) => 
  useArketicStore(state => state.searchTerms[context] || '')
export const useFilters = (context: string) => 
  useArketicStore(state => state.filters[context] || {})
export const useSelectedItem = (context: string) => 
  useArketicStore(state => state.selectedItems[context])
export const useLoading = (context: string) => 
  useArketicStore(state => state.loading[context] || false)

// Computed selectors
export const useFilteredPeople = () => 
  useArketicStore(state => state.getFilteredPeople())
export const useComplianceStats = () => 
  useArketicStore(state => state.getComplianceStats())

// Actions
export const useArketicActions = () => 
  useArketicStore(state => ({
    setPeople: state.setPeople,
    setOrgChart: state.setOrgChart,
    setCompliance: state.setCompliance,
    setActiveTab: state.setActiveTab,
    setSearchTerm: state.setSearchTerm,
    setFilter: state.setFilter,
    setSelectedItem: state.setSelectedItem,
    setLoading: state.setLoading
  }))

// Performance monitoring
export function trackStateChanges() {
  useArketicStore.subscribe(
    (state) => state.people.length,
    (peopleCount) => {
      console.log(`People count changed: ${peopleCount}`)
    }
  )

  useArketicStore.subscribe(
    (state) => state.activeTab,
    (activeTab) => {
      console.log(`Active tab changed: ${activeTab}`)
      // Track tab switches for analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'tab_switch', {
          tab_name: activeTab
        })
      }
    }
  )
}