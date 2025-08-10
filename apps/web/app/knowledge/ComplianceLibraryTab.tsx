"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Search, Grid3X3, List, Filter, RefreshCw, Sparkles, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DelightfulLoading, SkeletonLoader } from "@/components/ui/delightful-loading"
import { DelightfulEmptyState } from "@/components/ui/delightful-empty-state"
import { SuccessCelebration } from "@/components/ui/success-celebration"
import { DelightfulButton, DelightfulButtonGroup } from "@/components/ui/delightful-button"
import { DelightfulErrorState } from "@/components/ui/delightful-error-state"
import { ComplianceDocument, ComplianceFilters, ViewMode } from "./types/compliance"
import { ComplianceSidebar } from "./components/ComplianceSidebar"
import { ComplianceCard } from "./components/ComplianceCard"
import { ComplianceTable } from "./components/ComplianceTable"
import { AddComplianceModal } from "./components/AddComplianceModal"
import { complianceApi, knowledgeApi, DocumentResponse } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import complianceData from "./mock/compliance.json"

export function ComplianceLibraryTab() {
  const router = useRouter()
  const [documents, setDocuments] = useState<ComplianceDocument[]>(complianceData)
  const [filters, setFilters] = useState<ComplianceFilters>({})
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const showSuccessMessage = (message: string) => {
    toast({
      title: "Success",
      description: message,
    })
  }

  const showError = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }

  // Filter documents based on current filters
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          doc.authority.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Authority filter
      if (filters.authority && filters.authority.length > 0) {
        if (!filters.authority.includes(doc.authority)) return false
      }

      // Country filter
      if (filters.country && filters.country.length > 0) {
        if (!filters.country.includes(doc.country)) return false
      }

      // Year filter
      if (filters.year && filters.year.length > 0) {
        const docYear = new Date(doc.issuedDate).getFullYear().toString()
        if (!filters.year.includes(docYear)) return false
      }

      // Language filter
      if (filters.language && filters.language.length > 0) {
        if (!filters.language.includes(doc.language)) return false
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(doc.status)) return false
      }

      return true
    })
  }, [documents, filters])

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  const handleFiltersChange = (newFilters: ComplianceFilters) => {
    setFilters(newFilters)
  }

  // Fetch compliance documents from API
  const fetchDocuments = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      
      const response = await complianceApi.getDocuments()
      
      if (response.data) {
        // Backend returns data in { items: [...], total: N } format
        const items = response.data.items || response.data
        setDocuments(items.length > 0 ? items : complianceData)
        
        if (items.length > 0) {
          setShowSuccess(true)
          showSuccessMessage(`Loaded ${items.length} compliance documents successfully`)
        }
      } else {
        console.warn('Failed to fetch compliance documents, using mock data')
        setDocuments(complianceData)
        showError('Failed to load compliance documents. Using cached data.')
      }
    } catch (error) {
      console.error('Error fetching compliance documents:', error)
      setError('Failed to load compliance documents')
      setDocuments(complianceData) // Fallback to mock data
      showError('Error loading compliance documents. Using cached data.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }
  
  // Refresh with delightful feedback
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDocuments(false)
    setRefreshing(false)
    
    // Show celebration for successful refresh
    if (!error) {
      toast({
        title: "Refreshed successfully!",
        description: "Your compliance library is up to date."
      })
    }
  }

  // Load documents on component mount
  useEffect(() => {
    fetchDocuments()
  }, [])
  
  // Show success celebration
  if (showSuccess && !loading) {
    return (
      <SuccessCelebration
        type="complete"
        message="Compliance Library Ready!"
        description="Your compliance documents are loaded and ready"
        onComplete={() => setShowSuccess(false)}
      />
    )
  }
  
  // Show error state
  if (error && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <DelightfulErrorState
          type="server"
          title="Couldn't load compliance library"
          description={error}
          onAction={() => {
            setError(null)
            fetchDocuments()
          }}
          onSecondaryAction={() => setError(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}>
        <ComplianceSidebar 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          documents={documents}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Compliance Library</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage standards, regulations, and compliance documents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DelightfulButton
                onClick={handleRefresh}
                variant="outline"
                loading={refreshing}
                loadingText="Refreshing..."
                ripple
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </DelightfulButton>
              
              <DelightfulButton
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                glow
                bounce
              >
                <Plus className="h-4 w-4 mr-2" />
                Knowledge Base
              </DelightfulButton>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search compliance documents..."
                value={filters.search || ""}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden"
            >
              <Filter className="h-4 w-4" />
            </Button>

            <DelightfulButtonGroup
              buttons={[
                {
                  label: 'Cards',
                  value: 'cards',
                  active: viewMode === 'cards',
                  onClick: () => setViewMode('cards'),
                  icon: Grid3X3
                },
                {
                  label: 'Table',
                  value: 'table',
                  active: viewMode === 'table',
                  onClick: () => setViewMode('table'),
                  icon: List
                }
              ]}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 delightful-scroll">
          {loading ? (
            <div className="space-y-6">
              <DelightfulLoading 
                type="compliance" 
                message="Loading compliance documents..."
              />
              <SkeletonLoader type={viewMode === 'cards' ? 'card' : 'table'} />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <DelightfulEmptyState
              type={filters.search ? 'search' : 'compliance'}
              title={filters.search ? 'No matching documents' : 'No compliance documents'}
              description={
                filters.search 
                  ? 'Try adjusting your search terms or clear filters to see all documents.'
                  : 'Start building your compliance library by adding standards, regulations, and frameworks.'
              }
              actionLabel={filters.search ? 'Clear search' : 'Add document'}
              onAction={() => {
                if (filters.search) {
                  setFilters({})
                } else {
                  setShowAddModal(true)
                }
              }}
              onSecondaryAction={() => setShowAddModal(true)}
            />
          ) : (
            <div className="space-y-6">
              <div className={cn(
                "flex items-center justify-between animate-slide-in-up",
                "p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10",
                "rounded-lg border border-blue-200/50 dark:border-blue-800/50"
              )}>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      Showing {filteredDocuments.length} of {documents.length} documents
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Your compliance library is {Math.round((filteredDocuments.length / documents.length) * 100)}% loaded
                    </p>
                  </div>
                </div>
                
                {documents.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      All up to date!
                    </span>
                  </div>
                )}
              </div>

              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDocuments.map((doc, index) => (
                    <div 
                      key={doc.id}
                      className={cn(
                        "animate-fade-in-scale hover-lift",
                        `stagger-${Math.min(index + 1, 5)}`
                      )}
                    >
                      <ComplianceCard 
                        document={doc}
                        onView={() => router.push(`/knowledge/${doc.id}`)}
                        onEdit={() => console.log("Edit", doc.id)}
                        onDelete={() => console.log("Delete", doc.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-slide-in-up">
                  <ComplianceTable 
                    documents={filteredDocuments}
                    onView={(id: string) => router.push(`/knowledge/${id}`)}
                    onEdit={(id: string) => console.log("Edit", id)}
                    onDelete={(id: string) => console.log("Delete", id)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AddComplianceModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={(data: any) => {
          console.log("Save document:", data)
          setShowAddModal(false)
        }}
      />
    </div>
  )
}