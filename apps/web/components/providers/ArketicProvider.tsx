"use client"

import React, { useEffect, ReactNode } from 'react'
import { useArketicStore } from '@/lib/state-manager'
import { useNotifications } from '@/lib/hooks'
import { complianceApi, organizationApi, apiClient } from '@/lib/api-client'
import type { User, KnowledgeItem, Assistant } from '@/lib/types'

// Mock data for development - this will be replaced with API calls
const mockUsers: User[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@company.com",
    department: "Engineering",
    site: "Main Office",
    avatar: "/placeholder-user.jpg",
    initials: "JD",
    role: "Senior Developer",
    status: "active"
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@company.com",
    department: "Marketing",
    site: "Main Office",
    avatar: "/placeholder-user.jpg",
    initials: "JS",
    role: "Marketing Manager",
    status: "active"
  }
]

const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: 1,
    name: "Company Handbook",
    type: "document",
    size: "2.4 MB",
    lastModified: "2 hours ago",
    status: "active",
    description: "Employee handbook with policies and procedures",
    tags: ["hr", "policies"]
  },
  {
    id: 2,
    name: "API Documentation",
    type: "folder",
    size: "12 files",
    lastModified: "1 day ago",
    status: "active",
    description: "Complete API reference documentation",
    tags: ["api", "development"]
  }
]

const mockAssistants: Assistant[] = [
  {
    id: "chatgpt-4o",
    name: "ChatGPT 4o",
    provider: "OpenAI",
    description: "Latest GPT-4 model with advanced reasoning capabilities",
    capabilities: ["text-generation", "analysis", "coding", "math"],
    status: "available"
  },
  {
    id: "claude-3",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    description: "Advanced AI assistant with strong analytical capabilities",
    capabilities: ["text-generation", "analysis", "coding", "research"],
    status: "available"
  }
]

interface ArketicProviderProps {
  children: ReactNode
}

export function ArketicProvider({ children }: ArketicProviderProps) {
  const { showSuccess, showError } = useNotifications()
  const {
    setPeople,
    setKnowledgeItems,
    setAssistants,
    setLoading
  } = useArketicStore()
  
  useEffect(() => {
    // Initialize the store with real API data
    const initializeData = async () => {
      try {
        setLoading('initialization', true)
        
        // Check backend health first
        const isHealthy = await apiClient.healthCheck()
        if (!isHealthy) {
          console.warn('Backend health check failed, falling back to mock data')
          setPeople(mockUsers)
          setKnowledgeItems(mockKnowledgeItems)
          setAssistants(mockAssistants)
          showSuccess('Dashboard initialized with mock data (backend offline)')
          return
        }
        
        // Fetch real data from APIs
        const [peopleResponse, complianceResponse] = await Promise.allSettled([
          organizationApi.getPeople(),
          complianceApi.getDocuments()
        ])
        
        // Handle people data
        if (peopleResponse.status === 'fulfilled' && peopleResponse.value.success) {
          const people = peopleResponse.value.data.map((person: any) => ({
            id: person.id,
            name: person.name,
            email: person.email,
            department: person.department || 'Unknown',
            site: person.site || 'Main Office',
            avatar: person.avatar || '/placeholder-user.jpg',
            initials: person.name?.split(' ').map((n: string) => n[0]).join('') || '??',
            role: person.role || person.position || 'Employee',
            status: person.status || 'active'
          }))
          setPeople(people)
        } else {
          console.warn('Failed to fetch people, using mock data')
          setPeople(mockUsers)
        }
        
        // Handle compliance/knowledge data
        if (complianceResponse.status === 'fulfilled' && complianceResponse.value.data) {
          // Backend returns data wrapped in { items: [...], total: N } format
          const items = complianceResponse.value.data.items || complianceResponse.value.data
          const knowledgeItems = items.map((doc: any) => ({
            id: doc.id,
            name: doc.title || doc.name,
            type: doc.fileType === 'pdf' ? 'document' : 'folder',
            size: doc.fileSize || 'Unknown',
            lastModified: new Date(doc.updatedAt || doc.createdAt).toLocaleDateString(),
            status: doc.status || 'active',
            description: doc.description || '',
            tags: doc.tags || []
          }))
          setKnowledgeItems(knowledgeItems)
        } else {
          console.warn('Failed to fetch compliance documents, using mock data')
          setKnowledgeItems(mockKnowledgeItems)
        }
        
        // Set assistants (still using mock data as there's no API endpoint for this yet)
        setAssistants(mockAssistants)
        
        showSuccess('Dashboard initialized successfully')
      } catch (error) {
        console.error('Failed to initialize dashboard:', error)
        showError('Failed to load dashboard data. Using fallback data.')
        
        // Fallback to mock data on error
        setPeople(mockUsers)
        setKnowledgeItems(mockKnowledgeItems)
        setAssistants(mockAssistants)
      } finally {
        setLoading('initialization', false)
      }
    }
    
    initializeData()
  }, [setPeople, setKnowledgeItems, setAssistants, setLoading, showSuccess, showError])
  
  // Track performance and errors
  useEffect(() => {
    // Performance monitoring
    if (typeof window !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`Performance: ${entry.name} took ${entry.duration}ms`)
          }
        })
      })
      
      try {
        observer.observe({ entryTypes: ['measure'] })
      } catch (e) {
        // PerformanceObserver not supported
      }
      
      return () => observer.disconnect()
    }
  }, [])
  
  return <>{children}</>
}
