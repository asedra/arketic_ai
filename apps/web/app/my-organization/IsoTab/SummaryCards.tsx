"use client"

import { Gauge, AlertTriangle, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ISOMeta } from "./types/iso"

interface SummaryCardsProps {
  data: ISOMeta
  onOpenFindingsClick: () => void
}

export function SummaryCards({ data, onOpenFindingsClick }: SummaryCardsProps) {
  /** NEW **/ // Format audit date
  const formatAuditDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Coverage Card */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Gauge className="h-4 w-4" />
            Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {data.coverage}%
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            ISO compliance rate
          </p>
        </CardContent>
      </Card>

      {/* Open Findings Card */}
      <Card 
        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onOpenFindingsClick}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <AlertTriangle className="h-4 w-4" />
            Open Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {data.openFindings}
            </Badge>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              gaps identified
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Next Audit Card */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            Next Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatAuditDate(data.nextAuditDate)}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Scheduled audit date
          </p>
        </CardContent>
      </Card>
    </div>
  )
}