"use client"

import { Play, User, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { Service } from "./types/service"
import { toast } from "sonner"
import { go } from "@/lib/link-utils"
import { documents } from "@/lib/mockData"

interface ServiceGridProps {
  services: Service[]
  onSelect: (service: Service) => void
  highlightedServiceId?: string | null
}

export function ServiceGrid({ services, onSelect, highlightedServiceId }: ServiceGridProps) {
  const router = useRouter()

  /** NEW **/ // Handle Start button click
  const handleStartService = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation()
    toast.success(`🚀 Service "${service.title}" started`)
  }

  /** NEW **/ // Handle ISO badge click
  const handleISOClick = (isoClause: string, e: React.MouseEvent) => {
    e.stopPropagation()
    go(router, { tab: "iso", clause: isoClause })
  }

  /** NEW **/ // Handle documents click
  const handleDocumentsClick = (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const linkedDocs = documents.filter(doc => doc.linkedServiceId === serviceId)
    if (linkedDocs.length > 0) {
      go(router, { tab: "documents", service: serviceId })
    } else {
      toast.info("No documents linked to this service")
    }
  }

  /** NEW **/ // Get owner initials
  const getOwnerInitials = (owner: string) => {
    return owner
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  /** NEW **/ // Prepare KPI data for chart
  const prepareKpiData = (kpi: number[]) => {
    return kpi.map((value, index) => ({
      period: index + 1,
      value
    }))
  }

  /** NEW **/ // Get linked documents count
  const getLinkedDocumentsCount = (serviceId: string) => {
    return documents.filter(doc => doc.linkedServiceId === serviceId).length
  }

  return (
    <div className="flex-1">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Service Catalog ({services.length})
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Click on a service to view details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const isHighlighted = highlightedServiceId === service.id
          const linkedDocsCount = getLinkedDocumentsCount(service.id)
          return (
            <Card
              key={service.id}
              className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer group ${
                isHighlighted 
                  ? "ring-2 ring-blue-500 ring-offset-2 animate-pulse" 
                  : ""
              }`}
              onClick={() => onSelect(service)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {service.title}
                  </CardTitle>
                  <Badge 
                    variant={service.status === "active" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {service.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* SLA and ISO Badges */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    SLA: {service.sla}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    onClick={(e) => handleISOClick(service.iso, e)}
                  >
                    ISO {service.iso}
                  </Badge>
                  {linkedDocsCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={(e) => handleDocumentsClick(service.id, e)}
                      title={`${linkedDocsCount} linked documents`}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Owner */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {getOwnerInitials(service.owner)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {service.owner}
                  </span>
                </div>

                {/* KPI Sparkline */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">KPI Trend</p>
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareKpiData(service.kpi)}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={(e) => handleStartService(service, e)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No services found
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try adjusting your filters to see more results
          </p>
        </div>
      )}
    </div>
  )
}