"use client"

import { useState } from "react"
import { Building2, Users, AlertTriangle, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OrgChartTab } from "./OrgChartTab/OrgChartTab"
import { IsoTab } from "./IsoTab/IsoTab"
import { DocumentsTab } from "./IsoDocumentsTab/DocumentsTab"
import PeopleTab from "./PeopleTab"

export default function MyOrganizationPage() {
  const [activeTab, setActiveTab] = useState("people")

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Organization
          </h1>
          
          {/* Metric Ribbon */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-slate-600 dark:text-slate-400">Sites</span>
              <Badge variant="secondary">2</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-slate-600 dark:text-slate-400">Departments</span>
              <Badge variant="secondary">5</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-slate-600 dark:text-slate-400">Users</span>
              <Badge variant="secondary">64</Badge>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-slate-600 dark:text-slate-400">ISO Gaps</span>
              <Badge variant="secondary">3</Badge>
            </div>
          </div>
        </div>

        {/* Secondary Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="org-chart">Org Chart</TabsTrigger>
            <TabsTrigger value="iso">ISO Compliance</TabsTrigger>
            <TabsTrigger value="documents">ISO Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="mt-0">
            <PeopleTab />
          </TabsContent>

          <TabsContent value="org-chart" className="mt-0">
            <OrgChartTab />
          </TabsContent>

          <TabsContent value="iso" className="mt-0">
            <IsoTab />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}