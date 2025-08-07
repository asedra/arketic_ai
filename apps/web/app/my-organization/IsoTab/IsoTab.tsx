"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import isoData from "../mock/iso.json"
import { SummaryCards } from "./SummaryCards"
import { ComplianceDashboard } from "./ComplianceDashboard"
import { MatrixView } from "./MatrixView"
import { ClauseDrawer } from "./ClauseDrawer"
import { Clause, ISOMeta } from "./types/iso"

export function IsoTab() {
  /** NEW **/ // Local state for selected clause and view
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null)
  const [view, setView] = useState<"dashboard" | "matrix">("dashboard")
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>()
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null)
  
  /** NEW **/ // Get URL search params
  const searchParams = useSearchParams()

  /** NEW **/ // Type assertion for mock data
  const typedIsoData = isoData as ISOMeta

  /** NEW **/ // Handle URL parameter for clause highlighting
  useEffect(() => {
    const clauseId = searchParams.get("clause")
    if (clauseId) {
      setHighlightedClauseId(clauseId)
      
      // Auto-select the clause if it exists
      const clause = typedIsoData.clauses.find(c => c.id === clauseId)
      if (clause) {
        setSelectedClause(clause)
      }
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedClauseId(null)
      }, 3000)
    }
  }, [searchParams, typedIsoData.clauses])

  /** NEW **/ // Handle open findings click
  const handleOpenFindingsClick = () => {
    setView("matrix")
  }

  /** NEW **/ // Handle clause selection
  const handleClauseSelect = (clause: Clause) => {
    setSelectedClause(clause)
  }

  /** NEW **/ // Handle matrix cell click
  const handleMatrixCellClick = (clause: Clause, department: string) => {
    setSelectedClause(clause)
    setSelectedDepartment(department)
  }

  /** NEW **/ // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedClause(null)
    setSelectedDepartment(undefined)
  }

  /** NEW **/ // Global keyboard shortcut for view toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "g" || event.key === "G") {
        setView(prev => prev === "dashboard" ? "matrix" : "dashboard")
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          ISO Compliance
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Monitor and manage ISO 9001 compliance across your organization
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards 
        data={typedIsoData}
        onOpenFindingsClick={handleOpenFindingsClick}
      />

      {/* Main Content Tabs */}
      <Tabs value={view} onValueChange={(value) => setView(value as "dashboard" | "matrix")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <ComplianceDashboard
            clauses={typedIsoData.clauses}
            selectedClause={selectedClause}
            onClauseSelect={handleClauseSelect}
            highlightedClauseId={highlightedClauseId}
          />
        </TabsContent>

        <TabsContent value="matrix" className="mt-0">
          <MatrixView
            clauses={typedIsoData.clauses}
            onCellClick={handleMatrixCellClick}
          />
        </TabsContent>
      </Tabs>

      {/* Clause Drawer */}
      <ClauseDrawer
        clause={selectedClause}
        selectedDepartment={selectedDepartment}
        isOpen={!!selectedClause}
        onClose={handleDrawerClose}
      />

      {/* Keyboard Shortcut Hint */}
      <div className="text-xs text-slate-500 text-center">
        💡 Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">G</kbd> to toggle between Dashboard and Matrix view
      </div>
    </div>
  )
}