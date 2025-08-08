"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X, Loader2, Calendar, User, Mail, Phone, Building, MapPin, Briefcase, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { organizationApi, PersonCreateRequest, PersonResponse } from "@/lib/api-client"

// Form schema with validation
const addPersonSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required").max(100, "Job title must be less than 100 characters"),
  department: z.string().optional(),
  site: z.string().optional(),
  role: z.enum(["admin", "user", "manager", "viewer"], {
    required_error: "Please select a role",
  }),
  hireDate: z.date().optional(),
  manager: z.string().optional(),
  location: z.string().optional(),
  employeeId: z.string().optional(),
})

type AddPersonFormData = z.infer<typeof addPersonSchema>

interface AddPersonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPersonAdded: () => Promise<void>
  existingPeople: PersonResponse[]
}

export function AddPersonModal({
  open,
  onOpenChange,
  onPersonAdded,
  existingPeople
}: AddPersonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [customDepartment, setCustomDepartment] = useState("")
  const [customSite, setCustomSite] = useState("")
  const [showCustomDepartment, setShowCustomDepartment] = useState(false)
  const [showCustomSite, setShowCustomSite] = useState(false)
  
  const { toast } = useToast()

  const form = useForm<AddPersonFormData>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      department: "",
      site: "",
      role: "user",
      employeeId: "",
      location: "",
    },
  })

  // Extract unique values from existing people
  const departments = Array.from(new Set(existingPeople.map(p => p.department))).filter(Boolean)
  const sites = Array.from(new Set(existingPeople.map(p => p.site))).filter(Boolean)
  const managers = existingPeople.filter(p => 
    p.role === "admin" || p.role === "manager"
  )

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      form.reset()
      setCustomDepartment("")
      setCustomSite("")
      setShowCustomDepartment(false)
      setShowCustomSite(false)
      setIsCalendarOpen(false)
      setIsSubmitting(false)
      setIsRefreshing(false)
    }
  }, [open, form])

  const validateUniqueEmail = (email: string) => {
    return !existingPeople.some(person => 
      person.email.toLowerCase() === email.toLowerCase()
    )
  }

  const onSubmit = async (data: AddPersonFormData) => {
    // Validate unique email
    if (!validateUniqueEmail(data.email)) {
      form.setError("email", {
        type: "manual",
        message: "This email address is already in use"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare the data for API submission
      const submissionData: PersonCreateRequest = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        job_title: data.jobTitle,
        department: showCustomDepartment && customDepartment ? customDepartment : data.department || undefined,
        site: showCustomSite && customSite ? customSite : data.site || undefined,
        role: data.role,
        hire_date: data.hireDate ? data.hireDate.toISOString() : undefined,
        manager_id: data.manager && data.manager !== "no-manager" ? data.manager : undefined,
        location: data.location || undefined,
        notes: undefined
      }

      // Call the API to create the person
      const response = await organizationApi.createPerson(submissionData)

      if (response.success || response.data) {
        toast({
          title: "Success",
          description: `${data.firstName} ${data.lastName} has been added successfully`,
        })
        
        // Reset form
        form.reset()
        
        // Show refreshing state
        setIsRefreshing(true)
        
        try {
          // Trigger refresh of people list
          await onPersonAdded()
          
          // Close modal after successful refresh
          onOpenChange(false)
        } catch (error) {
          console.error('Failed to refresh people list:', error)
          toast({
            title: "Refresh Warning",
            description: "Person was created successfully, but the list couldn't be refreshed. Please refresh manually.",
            variant: "destructive",
          })
          // Still close the modal since the person was created successfully
          onOpenChange(false)
        } finally {
          setIsRefreshing(false)
        }
      } else {
        throw new Error(response.message || "Failed to create person")
      }
    } catch (error: any) {
      console.error("Error creating person:", error)
      
      // Handle validation errors from backend
      if (error.errors) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          form.setError(field as keyof AddPersonFormData, {
            type: "manual",
            message: Array.isArray(messages) ? messages[0] : messages
          })
        })
      } else {
        // Handle different types of errors
        let errorMessage = "Failed to add person. Please try again."
        
        if (error.status === 401 || error.status === 403) {
          errorMessage = "Authentication failed. Please log in again."
        } else if (error.status === 409) {
          errorMessage = "A person with this email already exists."
        } else if (error.status === 422) {
          errorMessage = "Please check your input data and try again."
        } else if (error.message) {
          errorMessage = error.message
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      if (!isRefreshing) {
        setIsSubmitting(false)
      }
    }
  }

  const handleDepartmentChange = (value: string) => {
    if (value === "add-new") {
      setShowCustomDepartment(true)
      form.setValue("department", "")
    } else {
      setShowCustomDepartment(false)
      form.setValue("department", value)
    }
  }

  const handleSiteChange = (value: string) => {
    if (value === "add-new") {
      setShowCustomSite(true)
      form.setValue("site", "")
    } else {
      setShowCustomSite(false)
      form.setValue("site", value)
    }
  }

  const handleCustomDepartmentSubmit = () => {
    if (customDepartment.trim()) {
      form.setValue("department", customDepartment.trim())
      setShowCustomDepartment(false)
    }
  }

  const handleCustomSiteSubmit = () => {
    if (customSite.trim()) {
      form.setValue("site", customSite.trim())
      setShowCustomSite(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Add New Person
          </DialogTitle>
          <DialogDescription>
            Add a new person to your organization. Fill in their details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <User className="h-4 w-4" />
                Basic Information
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email Address *
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional employee identification number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Briefcase className="h-4 w-4" />
                Job Information
              </div>

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        Department
                      </FormLabel>
                      {showCustomDepartment ? (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="Enter new department"
                              value={customDepartment}
                              onChange={(e) => setCustomDepartment(e.target.value)}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCustomDepartmentSubmit}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCustomDepartment(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select onValueChange={handleDepartmentChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                            <SelectItem value="add-new">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Department
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        Site
                      </FormLabel>
                      {showCustomSite ? (
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="Enter new site"
                              value={customSite}
                              onChange={(e) => setCustomSite(e.target.value)}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCustomSiteSubmit}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCustomSite(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select onValueChange={handleSiteChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select site" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sites.map((site) => (
                              <SelectItem key={site} value={site}>
                                {site}
                              </SelectItem>
                            ))}
                            <SelectItem value="add-new">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Site
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Role *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no-manager">No Manager</SelectItem>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.full_name} - {manager.job_title || "No Title"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <MapPin className="h-4 w-4" />
                Additional Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="New York, NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Hire Date
                      </FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date)
                              setIsCalendarOpen(false)
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isRefreshing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isRefreshing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {(isSubmitting || isRefreshing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Adding Person..." : isRefreshing ? "Refreshing List..." : "Add Person"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddPersonModal