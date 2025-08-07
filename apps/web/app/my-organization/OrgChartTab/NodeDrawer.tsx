"use client"

import { X, User, FileText, Link, CheckSquare, Mail, Phone, MapPin, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { OrgNode } from "@/lib/state-manager"
import { go } from "@/lib/link-utils"
import { services, documents } from "@/lib/mockData"

interface NodeDrawerProps {
  node: OrgNode | null
  isOpen: boolean
  onClose: () => void
}

export function NodeDrawer({ node, isOpen, onClose }: NodeDrawerProps) {
  const router = useRouter()

  if (!node) return null

  /** NEW **/ // Get linked services for department/title
  const getLinkedServices = () => {
    if (node.type === "department") {
      return services.filter(service => service.department === node.name)
    }
    if (node.type === "title") {
      // Mock: assume title is related to department
      return services.filter(service => service.department.includes(node.name.split(" ")[0]))
    }
    return []
  }

  /** NEW **/ // Get linked documents for department/title
  const getLinkedDocuments = () => {
    const linkedServices = getLinkedServices()
    const serviceIds = linkedServices.map(service => service.id)
    return documents.filter(doc => doc.linkedServiceId && serviceIds.includes(doc.linkedServiceId))
  }

  /** NEW **/ // Handle service navigation
  const handleServiceClick = (serviceId: string) => {
    go(router, { tab: "services", service: serviceId })
    onClose()
  }

  /** NEW **/ // Handle documents navigation
  const handleDocumentsClick = () => {
    const linkedServices = getLinkedServices()
    if (linkedServices.length > 0) {
      go(router, { tab: "documents", service: linkedServices[0].id })
      onClose()
    }
  }

  const getNodeIcon = () => {
    switch (node.type) {
      case "site":
        return <User className="h-6 w-6 text-blue-600" />
      case "department":
        return <User className="h-6 w-6 text-purple-600" />
      case "title":
        return <User className="h-6 w-6 text-green-600" />
      case "user":
        return <User className="h-6 w-6 text-slate-600" />
      default:
        return <User className="h-6 w-6 text-slate-600" />
    }
  }

  const getNodeTypeColor = () => {
    switch (node.type) {
      case "site":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "department":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "title":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "user":
        return "bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300"
    }
  }

  const linkedServices = getLinkedServices()
  const linkedDocuments = getLinkedDocuments()

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              {getNodeIcon()}
              {node.name}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge className={getNodeTypeColor()}>
            {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
          </Badge>
        </SheetHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="jd">JD</TabsTrigger>
            <TabsTrigger value="services">Service Catalog</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4">
            {node.type === "user" ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={node.avatar} alt={node.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                      {node.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{node.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{node.role}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span>{node.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>New York, NY</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  {getNodeIcon()}
                </div>
                <h3 className="text-lg font-semibold mb-2">{node.name}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {node.children?.length || 0} members
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="jd" className="mt-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Job Description</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>
                  {node.type === "user" 
                    ? "Software Engineer with 5+ years of experience in full-stack development..."
                    : "Department/role description will be displayed here..."
                  }
                </p>
                <p>
                  {node.type === "user" 
                    ? "Responsibilities include developing scalable web applications, collaborating with cross-functional teams..."
                    : "Key responsibilities and requirements for this position..."
                  }
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Linked Service Catalog ({linkedServices.length})</h4>
              <div className="space-y-2">
                {linkedServices.length > 0 ? (
                  linkedServices.map((service) => (
                    <div 
                      key={service.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleServiceClick(service.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{service.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {service.status}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">No service catalog linked</p>
                )}
              </div>

              {/* Linked Documents */}
              {linkedDocuments.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Related Documents ({linkedDocuments.length})
                  </h5>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {linkedDocuments.length} document{linkedDocuments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDocumentsClick}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View Documents
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Open Tasks</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Review design specifications</span>
                  </div>
                  <Badge variant="outline" className="text-xs">High</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Update documentation</span>
                  </div>
                  <Badge variant="outline" className="text-xs">Medium</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}