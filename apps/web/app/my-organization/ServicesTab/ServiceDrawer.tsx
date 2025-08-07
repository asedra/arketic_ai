"use client"

import { X, Link, TrendingUp, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Service } from "./types/service"
import { go } from "@/lib/link-utils"
import { documents } from "@/lib/mockData"

interface ServiceDrawerProps {
  service: Service | null
  isOpen: boolean
  onClose: () => void
}

export function ServiceDrawer({ service, isOpen, onClose }: ServiceDrawerProps) {
  const router = useRouter()

  if (!service) return null

  /** NEW **/ // Get linked documents count
  const linkedDocumentsCount = documents.filter(doc => doc.linkedServiceId === service.id).length

  /** NEW **/ // Handle documents navigation
  const handleDocumentsClick = () => {
    if (linkedDocumentsCount > 0) {
      go(router, { tab: "documents", service: service.id })
      onClose()
    }
  }

  /** NEW **/ // Handle ISO clause navigation
  const handleISOClick = () => {
    go(router, { tab: "iso", clause: service.iso })
    onClose()
  }

  /** NEW **/ // Prepare KPI data for larger chart
  const kpiData = service.kpi.map((value, index) => ({
    period: `P${index + 1}`,
    value
  }))

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {service.title}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge 
            variant={service.status === "active" ? "default" : "secondary"}
            className="w-fit"
          >
            {service.status}
          </Badge>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="kpi">KPI Trend</TabsTrigger>
            <TabsTrigger value="iso">ISO Clause</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Service Details
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Owner:</span>
                    <span className="font-medium">{service.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Department:</span>
                    <span className="font-medium">{service.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">SLA:</span>
                    <Badge variant="outline">{service.sla}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">ISO Clause:</span>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={handleISOClick}
                    >
                      ISO {service.iso}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Current KPI
                </h4>
                <div className="text-2xl font-bold text-blue-600">
                  {service.kpi[service.kpi.length - 1]}%
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Latest performance metric
                </p>
              </div>

              {/* Linked Documents */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Linked Documents
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {linkedDocumentsCount} document{linkedDocumentsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {linkedDocumentsCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDocumentsClick}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View Documents
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kpi" className="mt-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                KPI Performance Trend
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Performance over the last {service.kpi.length} periods
              </div>
            </div>
          </TabsContent>

          <TabsContent value="iso" className="mt-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Linked ISO Clause
              </h4>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="h-4 w-4 text-blue-600" />
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={handleISOClick}
                  >
                    ISO {service.iso}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This service is linked to ISO clause {service.iso}. 
                  Click to view detailed requirements and compliance status.
                </p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-slate-900 dark:text-slate-100">
                  Related Service Catalog
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <span className="text-sm">Quality Control Process</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <span className="text-sm">Document Review</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" className="w-full">
            Request Change
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}