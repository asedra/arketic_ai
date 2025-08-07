"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Search, Filter, Mail, Phone, MapPin, Calendar, Building, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { organizationApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { LoadingGrid, LoadingSpinner } from "@/components/ui/loading"
import { AddPersonModal } from "./components/AddPersonModal"

// Mock data import as fallback
import mockPeopleData from "./mock/people.json"

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
  manager?: string | null
  directReports?: string[]
  firstName?: string
  lastName?: string
  employeeId?: string | null
}

export function PeopleTab() {
  const [peopleData, setPeopleData] = useState<Person[]>(mockPeopleData as Person[])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [siteFilter, setSiteFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false)
  const { toast } = useToast()

  const fetchPeople = async (isRefreshAfterCreate = false) => {
    try {
      if (isRefreshAfterCreate) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const response = await organizationApi.getPeople()
      
      if (response.data) {
        // Backend returns PersonListResponse: { people: [...], total: N, page: N, page_size: N, total_pages: N }
        let items = response.data.people || response.data
        
        // Ensure items is an array
        if (!Array.isArray(items)) {
          console.warn('API response is not an array, using mock data')
          items = mockPeopleData
        }
        
        // Transform backend Person objects to frontend format
        const transformedItems = items.map((person: any) => {
          // Validate required fields
          if (!person.id || !person.email) {
            console.warn('Invalid person data:', person)
            return null
          }
          
          const firstName = person.first_name || ''
          const lastName = person.last_name || ''
          const fullName = person.full_name || `${firstName} ${lastName}`.trim()
          
          return {
            id: person.id,
            name: fullName || 'Unknown Name',
            email: person.email,
            avatar: person.avatar_url || '/placeholder-user.jpg', // Use placeholder if no avatar URL provided
            initials: fullName ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'UN',
            role: person.role || 'User',
            department: person.department || 'Unknown',
            title: person.job_title || 'No Title',
            site: person.site || 'Unknown',
            status: person.status || 'active',
            phone: person.phone || 'No Phone',
            location: person.location || 'Unknown',
            hireDate: person.hire_date || new Date().toISOString(),
            manager: person.manager_id,
            directReports: [],
            firstName,
            lastName,
            employeeId: person.employee_id
          }
        }).filter(Boolean) // Remove null entries
        
        setPeopleData(transformedItems)
        
        // Only show success toast for manual refresh, not after person creation
        if (!isRefreshAfterCreate) {
          toast({
            title: "Success",
            description: `Loaded ${transformedItems.length} people successfully`,
          })
        }
        return transformedItems // Return the data for promise resolution
      } else {
        console.warn('Failed to fetch people data, using mock data')
        setPeopleData(mockPeopleData as Person[])
        if (!isRefreshAfterCreate) {
          toast({
            title: "Warning",
            description: 'Using offline data. Some information may be outdated.',
            variant: "destructive",
          })
        }
        return mockPeopleData
      }
    } catch (error) {
      console.error('Error fetching people data:', error)
      // Use mock data as fallback
      setPeopleData(mockPeopleData)
      if (!isRefreshAfterCreate) {
        toast({
          title: "Error",
          description: 'Failed to connect to server. Using offline data.',
          variant: "destructive",
        })
      }
      return mockPeopleData
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handlePersonAdded = async () => {
    // Refresh the people list after successful person creation
    setRefreshing(true)
    try {
      await fetchPeople(true) // Pass true to indicate this is a refresh after creation
    } catch (error) {
      console.error('Failed to refresh people list:', error)
      // Ensure we still have data
      if (!Array.isArray(peopleData) || peopleData.length === 0) {
        setPeopleData(mockPeopleData as Person[])
      }
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPeople().catch((error) => {
      console.error('Failed to initialize dashboard:', error)
      // Ensure we have fallback data
      if (!Array.isArray(peopleData) || peopleData.length === 0) {
        setPeopleData(mockPeopleData as Person[])
      }
    })
  }, [])

  const departments = useMemo(() => {
    if (!Array.isArray(peopleData)) return []
    const depts = new Set(peopleData.map((person: Person) => person.department))
    return Array.from(depts).filter(dept => dept && dept.trim() !== '')
  }, [peopleData])

  const sites = useMemo(() => {
    if (!Array.isArray(peopleData)) return []
    const siteList = new Set(peopleData.map((person: Person) => person.site))
    return Array.from(siteList).filter(site => site && site.trim() !== '')
  }, [peopleData])

  const roles = useMemo(() => {
    if (!Array.isArray(peopleData)) return []
    const roleList = new Set(peopleData.map((person: Person) => person.role))
    return Array.from(roleList).filter(role => role && role.trim() !== '')
  }, [peopleData])

  const filteredPeople = useMemo(() => {
    if (!Array.isArray(peopleData)) return []
    return peopleData.filter((person: Person) => {
      const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           person.title.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDepartment = departmentFilter === "all" || person.department === departmentFilter
      const matchesSite = siteFilter === "all" || person.site === siteFilter
      const matchesRole = roleFilter === "all" || person.role === roleFilter

      return matchesSearch && matchesDepartment && matchesSite && matchesRole
    })
  }, [peopleData, searchTerm, departmentFilter, siteFilter, roleFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">People</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your organization's people and their information
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchPeople()}
            variant="outline"
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => setIsAddPersonModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            disabled={refreshing}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search people by name, email, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept || 'unknown'}>{dept || 'Unknown Department'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site} value={site || 'unknown'}>{site || 'Unknown Site'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role || 'unknown'}>{role || 'Unknown Role'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Users className="h-4 w-4" />
          <span>{filteredPeople.length} people found</span>
          {refreshing && (
            <div className="flex items-center gap-2 ml-4">
              <LoadingSpinner size="sm" inline />
              <span className="text-blue-600">Refreshing...</span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingGrid 
          items={8} 
          columns={4}
          showHeader={false}
          className="mt-6"
        />
      )}

      {/* People Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPeople.map((person: Person) => (
          <Card key={person.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <SmartAvatar 
                    src={person.avatar} 
                    alt={person.name}
                    fallback={person.initials}
                    size="lg"
                  />
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {person.name}
                    </CardTitle>
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
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{person.email}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone className="h-3 w-3" />
                  <span>{person.phone}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span>{person.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Building className="h-3 w-3" />
                  <span>{person.department}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>Hired {formatDate(person.hireDate)}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <Badge variant="outline" className="text-xs">
                  {person.site}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {!loading && filteredPeople.length === 0 && (
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

      {/* Add Person Modal */}
      <AddPersonModal
        open={isAddPersonModalOpen}
        onOpenChange={setIsAddPersonModalOpen}
        onPersonAdded={handlePersonAdded}
        existingPeople={peopleData}
      />
    </div>
  )
}

export default PeopleTab