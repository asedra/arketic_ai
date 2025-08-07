"use client"

import { X, FileText, Users, AlertTriangle, Link, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clause } from "./types/iso"
import { toast } from "sonner"
import { go } from "@/lib/link-utils"
import { services, documents } from "@/lib/mockData"

interface ClauseDrawerProps {
  clause: Clause | null
  selectedDepartment?: string
  isOpen: boolean
  onClose: () => void
}

export function ClauseDrawer({ clause, selectedDepartment, isOpen, onClose }: ClauseDrawerProps) {
  const router = useRouter()

  if (!clause) return null

  /** NEW **/ // Get linked services
  const linkedServices = services.filter(service => service.iso === clause.id)

  /** NEW **/ // Get linked documents
  const linkedDocuments = documents.filter(doc => doc.isoClause === clause.id)

  /** NEW **/ // Handle service navigation
  const handleServiceClick = (serviceId: string) => {
    go(router, { tab: "services", service: serviceId })
    onClose()
  }

  /** NEW **/ // Handle document navigation
  const handleDocumentClick = (docId: string) => {
    go(router, { tab: "documents", doc: docId })
    onClose()
  }

  /** NEW **/ // Handle CAPA creation
  const handleCreateCAPA = () => {
    toast.success("CAPA draft created")
  }

  /** NEW **/ // Get status badge color
  const getStatusBadgeColor = (status: "compliant" | "gap") => {
    return status === "compliant"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
  }

  /** NEW **/ // Get department status
  const getDepartmentStatus = (dept: string) => {
    return clause.departments[dept] || "gap"
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              ISO {clause.id} - {clause.title}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge 
            variant="outline"
            className={getStatusBadgeColor(clause.status)}
          >
            {clause.status === "compliant" ? "Compliant" : "Gap Identified"}
          </Badge>
        </SheetHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {clause.description}
            </p>
          </div>

          {/* Linked Services */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Linked Service Catalog ({linkedServices.length})
            </h4>
            <div className="space-y-2">
              {linkedServices.length > 0 ? (
                linkedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => handleServiceClick(service.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {service.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {service.department}
                      </Badge>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No service catalog linked</p>
              )}
            </div>
          </div>

          {/* Linked Documents */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Linked Documents ({linkedDocuments.length})
            </h4>
            <div className="space-y-2">
              {linkedDocuments.length > 0 ? (
                linkedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => handleDocumentClick(doc.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {doc.fileName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {doc.revision}
                      </Badge>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No documents linked</p>
              )}
            </div>
          </div>

          {/* Department Status */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Department Status
            </h4>
            <div className="space-y-2">
              {Object.entries(clause.departments).map(([dept, status]) => (
                <div 
                  key={dept}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedDepartment === dept 
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                      : "bg-slate-50 dark:bg-slate-700/50"
                  }`}
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {dept}
                  </span>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${getStatusBadgeColor(status)}`}
                  >
                    {status === "compliant" ? "Compliant" : "Gap"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Gap Analysis */}
          {clause.status === "gap" && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Gap Analysis
              </h4>
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  This clause has compliance gaps in some departments. 
                  Review the department status above and create corrective actions.
                </p>
              </div>
            </div>
          )}

          {/* Action Items */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Actions
            </h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Show audit history
                  toast.info("Show audit history")
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Audit History
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={handleCreateCAPA}
          >
            Create CAPA
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}