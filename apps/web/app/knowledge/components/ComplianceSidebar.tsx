"use client"

import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ComplianceDocument, ComplianceFilters } from "../types/compliance"

interface ComplianceSidebarProps {
  filters: ComplianceFilters
  onFiltersChange: (filters: ComplianceFilters) => void
  documents: ComplianceDocument[]
}

export function ComplianceSidebar({ filters, onFiltersChange, documents }: ComplianceSidebarProps) {
  // Get unique values for filters
  const authorities = Array.from(new Set(documents.map(d => d.authority)))
  const countries = Array.from(new Set(documents.map(d => d.country)))
  const years = Array.from(new Set(documents.map(d => new Date(d.issuedDate).getFullYear().toString())))
  const languages = Array.from(new Set(documents.map(d => d.language)))
  const statuses = Array.from(new Set(documents.map(d => d.status)))

  const handleFilterChange = (type: keyof ComplianceFilters, value: string) => {
    const newFilters = { ...filters }
    
    if (type === 'authority' || type === 'country' || type === 'year' || type === 'language' || type === 'status') {
      const currentValues = newFilters[type] || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      newFilters[type] = newValues.length > 0 ? newValues : undefined
    }
    
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value && (Array.isArray(value) ? value.length > 0 : value !== '')
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Accordion type="multiple" className="space-y-2">
          {/* Authority Filter */}
          <AccordionItem value="authority" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-3 py-2 text-sm font-medium">
              Authority / Standard Body ({authorities.length})
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {authorities.map((authority) => (
                  <div
                    key={authority}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFilterChange("authority", authority)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      filters.authority?.includes(authority)
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300"
                    }`}>
                      {filters.authority?.includes(authority) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{authority}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Country Filter */}
          <AccordionItem value="country" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-3 py-2 text-sm font-medium">
              Country / Region ({countries.length})
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {countries.map((country) => (
                  <div
                    key={country}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFilterChange("country", country)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      filters.country?.includes(country)
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300"
                    }`}>
                      {filters.country?.includes(country) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{country}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Year Filter */}
          <AccordionItem value="year" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-3 py-2 text-sm font-medium">
              Year ({years.length})
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {years.sort((a, b) => parseInt(b) - parseInt(a)).map((year) => (
                  <div
                    key={year}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFilterChange("year", year)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      filters.year?.includes(year)
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300"
                    }`}>
                      {filters.year?.includes(year) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{year}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Language Filter */}
          <AccordionItem value="language" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-3 py-2 text-sm font-medium">
              Language ({languages.length})
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {languages.map((language) => (
                  <div
                    key={language}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFilterChange("language", language)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      filters.language?.includes(language)
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300"
                    }`}>
                      {filters.language?.includes(language) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">
                      {language === 'en' ? 'English' : language === 'tr' ? 'Turkish' : language}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Status Filter */}
          <AccordionItem value="status" className="border border-gray-200 rounded-lg">
            <AccordionTrigger className="px-3 py-2 text-sm font-medium">
              Status ({statuses.length})
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFilterChange("status", status)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      filters.status?.includes(status)
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300"
                    }`}>
                      {filters.status?.includes(status) && <Check className="h-3 w-3 text-white" />}
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
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="w-full mt-4"
          >
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  )
}