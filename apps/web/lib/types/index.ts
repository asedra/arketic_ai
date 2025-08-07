// Global TypeScript interfaces for Arketic Dashboard

export interface User {
  id: number
  name: string
  email: string
  department: string
  site: string
  avatar: string
  initials: string
  role?: string
  title?: string
  status?: 'active' | 'inactive'
  phone?: string
  location?: string
  hireDate?: string
}

export interface KnowledgeItem {
  id: number
  name: string
  type: 'document' | 'url' | 'folder'
  size?: string
  lastModified: string
  status: 'active' | 'processing' | 'error'
  tags?: string[]
  owner?: string
  description?: string
}

export interface Assistant {
  id: string
  name: string
  description?: string
  ai_model: string
  ai_model_display: string
  temperature: number
  max_tokens: number
  status: 'active' | 'inactive' | 'draft' | 'archived'
  is_public: boolean
  creator_id: string
  total_conversations: number
  total_messages: number
  total_tokens_used: number
  knowledge_count: number
  document_count: number
  created_at: string
  updated_at: string
  last_used_at?: string
}

export interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  href?: string
  section?: Section
  badge?: number
  children?: NavigationItem[]
}

export type Section = 
  | 'analytics' 
  | 'chat' 
  | 'forms'
  | 'knowledge' 
  | 'assistants' 
  | 'workflow' 
  | 'data-sources' 
  | 'settings' 
  | 'my-organization'

export interface DashboardState {
  activeSection: Section
  searchQuery: string
  selectedAssistant: string
  chatMessage: string
  selectedKnowledgeItems: number[]
  selectedKnowledgeItem: number | null
  viewMode: 'grid' | 'list'
  sortBy: string
  dateRange: string
  showCreateGroupModal: boolean
  isCreateModalOpen: boolean
  isUsersModalOpen: boolean
}

export interface LoadingState {
  [key: string]: boolean
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  errors?: Record<string, string[]>
}

export interface FormValidationError {
  field: string
  message: string
}

// Chart and Analytics types
export interface ChartDataPoint {
  name: string
  value: number
  change?: number
  color?: string
}

export interface MetricCard {
  title: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease'
  icon: React.ComponentType<any>
  color: string
}

// Organization types
export interface Department {
  id: string
  name: string
  userCount: number
  headOfDepartment?: string
}

export interface Site {
  id: string
  name: string
  location: string
  userCount: number
  departments: Department[]
}
