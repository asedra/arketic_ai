"use client"

import { ChevronDown, FileText } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Clause } from "./types/iso"
import { documents } from "@/lib/mockData"

interface ClauseExplorerProps {
  clauses: Clause[]
  selectedClauseId: string | null
  onClauseSelect: (clause: Clause) => void
  highlightedClauseId?: string | null
}

export function ClauseExplorer({ clauses, selectedClauseId, onClauseSelect, highlightedClauseId }: ClauseExplorerProps) {
  /** NEW **/ // Get status color
  const getStatusColor = (status: "compliant" | "gap") => {
    return status === "compliant" 
      ? "bg-emerald-500" 
      : "bg-rose-500"
  }

  /** NEW **/ // Get status badge color
  const getStatusBadgeColor = (status: "compliant" | "gap") => {
    return status === "compliant"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
  }

  /** NEW **/ // Get linked documents count
  const getLinkedDocumentsCount = (clauseId: string) => {
    return documents.filter(doc => doc.isoClause === clauseId).length
  }

  return (
    <div className="w-80 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        ISO Clauses ({clauses.length})
      </h3>
      
      <Accordion type="single" collapsible className="space-y-2">
        {clauses.map((clause) => {
          const isHighlighted = highlightedClauseId === clause.id
          const linkedDocsCount = getLinkedDocumentsCount(clause.id)
          return (
            <AccordionItem 
              key={clause.id}
              value={clause.id}
              className={`border border-slate-200 dark:border-slate-700 rounded-lg ${
                isHighlighted 
                  ? "ring-2 ring-blue-500 ring-offset-2 animate-pulse" 
                  : ""
              }`}
            >
              <AccordionTrigger 
                className="px-3 py-2 text-sm font-medium hover:no-underline"
                onClick={() => onClauseSelect(clause)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(clause.status)}`} />
                  <span className="text-slate-900 dark:text-slate-100">
                    {clause.id} - {clause.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline"
                      className={`text-xs ${getStatusBadgeColor(clause.status)}`}
                    >
                      {clause.linkedServices} service catalog
                    </Badge>
                    {linkedDocsCount > 0 && (
                      <Badge 
                        variant="outline"
                        className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                        title={`${linkedDocsCount} linked documents`}
                      >
                        <FileText className="h-2 w-2 mr-1" />
                        {linkedDocsCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {clause.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={`text-xs ${getStatusBadgeColor(clause.status)}`}
                  >
                    {clause.status === "compliant" ? "Compliant" : "Gap Identified"}
                  </Badge>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {clauses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No ISO clauses found
          </p>
        </div>
      )}
    </div>
  )
}