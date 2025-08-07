"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import services from "../mock/services.json"
import { FilterAccordion } from "./FilterAccordion"
import { ServiceGrid } from "./ServiceGrid"
import { ServiceDrawer } from "./ServiceDrawer"
import { FloatingActionButton } from "./FloatingActionButton"
import { Service } from "./types/service"

export function ServicesTab() {
  /** NEW **/ // Local state for filters and selected service
  const [filters, setFilters] = useState<{ dept?: string; iso?: string; status?: string }>({})
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null)
  
  /** NEW **/ // Get URL search params
  const searchParams = useSearchParams()

  /** NEW **/ // Handle URL parameter for service highlighting
  useEffect(() => {
    const serviceId = searchParams.get("service")
    if (serviceId) {
      setHighlightedServiceId(serviceId)
      
      // Auto-select the service if it exists
      const service = services.find(s => s.id === serviceId)
      if (service) {
        setSelectedService(service)
      }
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedServiceId(null)
      }, 3000)
    }
  }, [searchParams])

  /** NEW **/ // Filter services based on current filters
  const visibleServices = useMemo(() => {
    return services.filter((service) => {
      if (filters.dept && service.department !== filters.dept) return false
      if (filters.iso && service.iso !== filters.iso) return false
      if (filters.status && service.status !== filters.status) return false
      return true
    })
  }, [filters])

  /** NEW **/ // Handle service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
  }

  /** NEW **/ // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedService(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Service Catalog
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your organization's service catalog and process workflows
        </p>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        <FilterAccordion
          services={services}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <ServiceGrid
          services={visibleServices}
          onSelect={handleServiceSelect}
          highlightedServiceId={highlightedServiceId}
        />
      </div>

      {/* Service Drawer */}
      <ServiceDrawer
        service={selectedService}
        isOpen={!!selectedService}
        onClose={handleDrawerClose}
      />

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  )
}