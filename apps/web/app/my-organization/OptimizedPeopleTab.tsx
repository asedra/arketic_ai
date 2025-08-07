"use client"

import { useState, useMemo, memo, useCallback, Suspense, useRef } from "react"
import { Plus, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { LoadingCard } from "@/components/ui/loading"
import { VirtualizedGrid } from "@/components/ui/virtualized-list"
import { 
  usePerformanceMonitor, 
  useDebouncedCallback, 
  useCache,
  useIntersectionObserver 
} from "@/lib/performance"
import { useCachedComputation, cacheKeys } from "@/lib/cache"

// Mock data import
import peopleData from "./mock/people.json"

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

// Highly optimized PersonCard with lazy loading and memoization
const OptimizedPersonCard = memo(({ 
  person, 
  formatDate 
}: { 
  person: Person
  formatDate: (date: string) => string 
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const { hasIntersected } = useIntersectionObserver(cardRef as React.RefObject<Element>, {
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Only render full content when in viewport
  if (!hasIntersected) {
    return (
      <div ref={cardRef} className="h-[280px]">
        <LoadingCard rows={5} />
      </div>
    )
  }

  return (
    <div ref={cardRef} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-200 p-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-semibold">
              {person.initials}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {person.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {person.title}
              </p>
            </div>
          </div>
          <Badge 
            variant={person.role === "Admin" ? "default" : "secondary"}
            className="text-xs"
          >
            {person.role}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="truncate">{person.email}</div>
          <div>{person.phone}</div>
          <div>{person.location}</div>
          <div>{person.department}</div>
          <div>Hired {formatDate(person.hireDate)}</div>
        </div>
        
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <Badge variant="outline" className="text-xs">
            {person.site}
          </Badge>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return prevProps.person.id === nextProps.person.id &&
         prevProps.person.name === nextProps.person.name &&
         prevProps.person.role === nextProps.person.role
})

OptimizedPersonCard.displayName = 'OptimizedPersonCard'

// Memoized filter component
const FilterControls = memo(({ 
  departments, 
  sites, 
  roles, 
  filters, 
  onFilterChange,
  onSearchChange
}: {
  departments: string[]
  sites: string[]
  roles: string[]
  filters: {
    department: string
    site: string
    role: string
  }
  onFilterChange: (key: string, value: string) => void
  onSearchChange: (value: string) => void
}) => {
  const debouncedSearch = useDebouncedCallback(onSearchChange, 300)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search people by name, email, or title..."
          onChange={(e) => debouncedSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={filters.department} onValueChange={(value) => onFilterChange('department', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.site} onValueChange={(value) => onFilterChange('site', value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site} value={site}>{site}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

FilterControls.displayName = 'FilterControls'

export const OptimizedPeopleTab = memo(function OptimizedPeopleTab() {
  usePerformanceMonitor('OptimizedPeopleTab')
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    department: "all",
    site: "all",
    role: "all"
  })

  // Cache expensive filter options computation
  const filterOptions = useCachedComputation(
    cacheKeys.people({ type: 'filter-options' }),
    () => {
      const departments = [...new Set(peopleData.map(p => p.department))].sort()
      const sites = [...new Set(peopleData.map(p => p.site))].sort()
      const roles = [...new Set(peopleData.map(p => p.role))].sort()
      return { departments, sites, roles }
    },
    [],
    10 * 60 * 1000 // 10 minutes
  )

  // Optimized filtering with early returns and caching
  const filteredPeople = useCachedComputation(
    cacheKeys.people({ searchTerm, ...filters }),
    () => {
      const normalizedSearch = searchTerm.toLowerCase()
      
      return peopleData.filter((person: Person) => {
        // Most selective filters first
        if (filters.department !== "all" && person.department !== filters.department) return false
        if (filters.site !== "all" && person.site !== filters.site) return false
        if (filters.role !== "all" && person.role !== filters.role) return false
        
        // Search filter last (most expensive)
        if (normalizedSearch) {
          return person.name.toLowerCase().includes(normalizedSearch) ||
                 person.email.toLowerCase().includes(normalizedSearch) ||
                 person.title.toLowerCase().includes(normalizedSearch)
        }
        
        return true
      })
    },
    [searchTerm, filters.department, filters.site, filters.role],
    2 * 60 * 1000 // 2 minutes
  )

  // Memoized date formatter
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Virtualized grid rendering
  const renderPersonCard = useCallback((person: Person) => (
    <OptimizedPersonCard
      person={person}
      formatDate={formatDate}
    />
  ), [formatDate])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              People
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your organization's people and their information
            </p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>

        {/* Search and Filters */}
        <Suspense fallback={<LoadingCard />}>
          <FilterControls
            departments={filterOptions.departments}
            sites={filterOptions.sites}
            roles={filterOptions.roles}
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearchChange={handleSearchChange}
          />
        </Suspense>

        {/* Results Count */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Users className="h-4 w-4" />
          <span>{filteredPeople.length} people found</span>
        </div>

        {/* Virtualized People Grid */}
        <ErrorBoundary>
          {filteredPeople.length > 0 ? (
            <VirtualizedGrid
              items={filteredPeople}
              itemHeight={280}
              itemsPerRow={4} // xl:grid-cols-4
              containerHeight={800} // Adjust based on viewport
              renderItem={renderPersonCard}
              gap={24}
              className="min-h-[400px]"
            />
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No people found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
})

OptimizedPeopleTab.displayName = 'OptimizedPeopleTab'