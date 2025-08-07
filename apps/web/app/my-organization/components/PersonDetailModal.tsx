"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar as CalendarIcon,
  User,
  Briefcase,
  Edit2,
  Save,
  X,
  AlertCircle,
  UserCheck,
  Clock,
  Users
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { organizationApi, PersonResponse, PersonUpdateRequest } from "@/lib/api-client"

interface PersonDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: PersonResponse | null
  onPersonUpdated?: () => void
  managers?: PersonResponse[]
}

export function PersonDetailModal({
  open,
  onOpenChange,
  person,
  onPersonUpdated,
  managers = []
}: PersonDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PersonUpdateRequest>({})
  const [hireDate, setHireDate] = useState<Date | undefined>()
  const { toast } = useToast()

  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        phone: person.phone || "",
        job_title: person.job_title || "",
        department: person.department || "",
        site: person.site || "",
        location: person.location || "",
        role: person.role,
        status: person.status,
        manager_id: person.manager_id || undefined,
        notes: person.notes || ""
      })
      
      if (person.hire_date) {
        setHireDate(new Date(person.hire_date))
      }
    }
  }, [person])

  const handleSave = async () => {
    if (!person) return

    setLoading(true)
    try {
      const updateData: PersonUpdateRequest = {
        ...formData,
        hire_date: hireDate?.toISOString()
      }

      const response = await organizationApi.updatePerson(person.id, updateData)
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Person information updated successfully",
        })
        setIsEditing(false)
        if (onPersonUpdated) {
          onPersonUpdated()
        }
      } else {
        throw new Error(response.message || "Failed to update person")
      }
    } catch (error: any) {
      console.error("Error updating person:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update person information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (person) {
      setFormData({
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        phone: person.phone || "",
        job_title: person.job_title || "",
        department: person.department || "",
        site: person.site || "",
        location: person.location || "",
        role: person.role,
        status: person.status,
        manager_id: person.manager_id || undefined,
        notes: person.notes || ""
      })
      
      if (person.hire_date) {
        setHireDate(new Date(person.hire_date))
      }
    }
    setIsEditing(false)
  }

  if (!person) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-gray-500"
      case "pending":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "default"
      case "Manager":
        return "secondary"
      case "User":
        return "outline"
      case "Viewer":
        return "ghost"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SmartAvatar
                src={`/placeholder-user.jpg`}
                alt={person.full_name}
                fallback={person.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                size="xl"
              />
              <div>
                <DialogTitle className="text-2xl">
                  {person.full_name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {person.job_title || "No Title"} • {person.department || "No Department"}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getRoleBadgeVariant(person.role)}>
                    {person.role}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(person.status))} />
                    {person.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button onClick={handleCancel} variant="outline" disabled={loading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-200px)]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name || ""}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name || ""}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.last_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.phone || "No Phone"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Location
                  </Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.location || "No Location"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site" className="flex items-center gap-2">
                    <Building className="h-3 w-3" />
                    Site
                  </Label>
                  {isEditing ? (
                    <Input
                      id="site"
                      value={formData.site || ""}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.site || "No Site"}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="organization" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_title" className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    Job Title
                  </Label>
                  {isEditing ? (
                    <Input
                      id="job_title"
                      value={formData.job_title || ""}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.job_title || "No Title"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-3 w-3" />
                    Department
                  </Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      value={formData.department || ""}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.department || "No Department"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3" />
                    Role
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.role}
                      onValueChange={(value: "Admin" | "User" | "Manager" | "Viewer") => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Status
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive" | "pending") => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground capitalize">{person.status}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager" className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Manager
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.manager_id || "none"}
                      onValueChange={(value) => 
                        setFormData({ ...formData, manager_id: value === "none" ? undefined : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Manager</SelectItem>
                        {managers
                          .filter(m => m.id !== person.id)
                          .map(manager => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {managers.find(m => m.id === person.manager_id)?.full_name || "No Manager"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hire_date" className="flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    Hire Date
                  </Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !hireDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {hireDate ? format(hireDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={hireDate}
                          onSelect={setHireDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {person.hire_date ? format(new Date(person.hire_date), "PPP") : "Not Set"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Timestamps</Label>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {format(new Date(person.created_at), "PPpp")}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{" "}
                    {format(new Date(person.updated_at), "PPpp")}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                {isEditing ? (
                  <Textarea
                    id="notes"
                    rows={10}
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add notes about this person..."
                  />
                ) : (
                  <div className="min-h-[200px] p-3 rounded-md border bg-muted/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {person.notes || "No notes available"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}