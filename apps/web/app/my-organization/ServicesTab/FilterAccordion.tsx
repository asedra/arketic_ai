"use client"

import { Check } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Service } from "./types/service"

interface FilterAccordionProps {
  services: Service[]
  filters: { dept?: string; iso?: string; status?: string }
  onFiltersChange: (filters: { dept?: string; iso?: string; status?: string }) => void
}

export function FilterAccordion({ services, filters, onFiltersChange }: FilterAccordionProps) {
  /** NEW **/ // Get unique departments from services
  const departments = Array.from(new Set(services.map(s => s.department)))
  
  /** NEW **/ // Get unique ISO clauses from services
  const isoClauses = Array.from(new Set(services.map(s => s.iso)))
  
  /** NEW **/ // Status options
  const statusOptions = ["active", "draft"]

  const handleFilterChange = (type: "dept" | "iso" | "status", value: string) => {
    const newFilters = { ...filters }
    
    if (newFilters[type] === value) {
      delete newFilters[type]
    } else {
      newFilters[type] = value
    }
    
    onFiltersChange(newFilters)
  }

  return (
    <div className="w-80 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Filters
      </h3>
      
      <Accordion type="multiple" className="space-y-2">
        {/* Department Filter */}
        <AccordionItem value="department" className="border border-slate-200 dark:border-slate-700 rounded-lg">
          <AccordionTrigger className="px-3 py-2 text-sm font-medium">
            Department ({departments.length})
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-2">
              {departments.map((dept) => (
                <div
                  key={dept}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleFilterChange("dept", dept)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    filters.dept === dept 
                      ? "bg-blue-600 border-blue-600" 
                      : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {filters.dept === dept && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{dept}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ISO Clause Filter */}
        <AccordionItem value="iso" className="border border-slate-200 dark:border-slate-700 rounded-lg">
          <AccordionTrigger className="px-3 py-2 text-sm font-medium">
            ISO Clause ({isoClauses.length})
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-2">
              {isoClauses.map((iso) => (
                <div
                  key={iso}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleFilterChange("iso", iso)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    filters.iso === iso 
                      ? "bg-blue-600 border-blue-600" 
                      : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {filters.iso === iso && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <Badge variant="outline" className="text-xs">{iso}</Badge>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Status Filter */}
        <AccordionItem value="status" className="border border-slate-200 dark:border-slate-700 rounded-lg">
          <AccordionTrigger className="px-3 py-2 text-sm font-medium">
            Status ({statusOptions.length})
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleFilterChange("status", status)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    filters.status === status 
                      ? "bg-blue-600 border-blue-600" 
                      : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {filters.status === status && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <Badge 
                    variant={status === "active" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {status}
                  </Badge>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Clear Filters */}
      {(filters.dept || filters.iso || filters.status) && (
        <button
          onClick={() => onFiltersChange({})}
          className="w-full mt-4 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}