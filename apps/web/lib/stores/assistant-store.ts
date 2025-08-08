import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { assistantApi, AssistantResponse, AssistantDetailResponse } from '../api-client'

export interface AssistantState {
  assistants: AssistantResponse[]
  selectedAssistant: AssistantDetailResponse | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadAssistants: () => Promise<void>
  selectAssistant: (assistantId: string) => Promise<void>
  clearSelection: () => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  assistants: [],
  selectedAssistant: null,
  isLoading: false,
  error: null
}

export const useAssistantStore = create<AssistantState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      loadAssistants: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await assistantApi.listAssistants({
            status: 'active',
            sort_by: 'name',
            sort_order: 'asc',
            limit: 100
          })
          
          if (response.success) {
            set({ 
              assistants: response.data.assistants, 
              isLoading: false 
            })
          } else {
            set({ 
              error: response.message || 'Failed to load assistants', 
              isLoading: false 
            })
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load assistants', 
            isLoading: false 
          })
        }
      },
      
      selectAssistant: async (assistantId: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await assistantApi.getAssistant(assistantId, true)
          
          if (response.success) {
            set({ 
              selectedAssistant: response.data, 
              isLoading: false 
            })
          } else {
            set({ 
              error: response.message || 'Failed to load assistant details', 
              isLoading: false 
            })
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load assistant details', 
            isLoading: false 
          })
        }
      },
      
      clearSelection: () => {
        set({ selectedAssistant: null })
      },
      
      clearError: () => {
        set({ error: null })
      },
      
      reset: () => {
        set(initialState)
      }
    }),
    { name: 'assistant-store' }
  )
)

// Helper hook to get assistant info by ID
export const useAssistantById = (assistantId: string | null) => {
  const { assistants, selectedAssistant } = useAssistantStore()
  
  if (!assistantId) return null
  
  // First check if it's the selected assistant
  if (selectedAssistant?.id === assistantId) {
    return selectedAssistant
  }
  
  // Otherwise find in the list
  return assistants.find(a => a.id === assistantId) || null
}