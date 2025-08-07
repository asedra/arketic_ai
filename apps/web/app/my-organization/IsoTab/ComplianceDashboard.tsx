"use client"

import React, { useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DelightfulEmptyState } from "@/components/ui/delightful-empty-state"
import { SuccessCelebration } from "@/components/ui/success-celebration"
import { ClauseExplorer } from "./ClauseExplorer"
import { Clause } from "./types/iso"
import { Shield, CheckCircle, AlertTriangle, Sparkles, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComplianceDashboardProps {
  clauses: Clause[]
  selectedClause: Clause | null
  onClauseSelect: (clause: Clause) => void
  highlightedClauseId?: string | null
}

export function ComplianceDashboard({ clauses, selectedClause, onClauseSelect, highlightedClauseId }: ComplianceDashboardProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [animatingClause, setAnimatingClause] = useState<string | null>(null)
  
  /** NEW **/ // Prepare pie chart data for selected clause
  const getPieChartData = (clause: Clause) => {
    const compliantCount = Object.values(clause.departments).filter(status => status === "compliant").length
    const gapCount = Object.values(clause.departments).filter(status => status === "gap").length
    
    return [
      { name: "Compliant", value: compliantCount, color: "#10b981" },
      { name: "Gap", value: gapCount, color: "#ef4444" }
    ]
  }
  
  // Calculate overall compliance percentage
  const getOverallCompliance = () => {
    const totalDepartments = clauses.reduce((acc, clause) => {
      return acc + Object.keys(clause.departments).length
    }, 0)
    
    const compliantDepartments = clauses.reduce((acc, clause) => {
      return acc + Object.values(clause.departments).filter(status => status === "compliant").length
    }, 0)
    
    return Math.round((compliantDepartments / totalDepartments) * 100)
  }
  
  // Handle clause selection with animation
  const handleClauseSelect = (clause: Clause) => {
    setAnimatingClause(clause.id)
    setTimeout(() => {
      onClauseSelect(clause)
      setAnimatingClause(null)
      
      // Show celebration for fully compliant clauses
      if (clause.status === 'compliant') {
        setShowCelebration(true)
      }
    }, 200)
  }
  
  const overallCompliance = getOverallCompliance()

  /** NEW **/ // Get status badge color
  const getStatusBadgeColor = (status: "compliant" | "gap") => {
    return status === "compliant"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
  }

  // Show celebration for high compliance
  React.useEffect(() => {
    if (overallCompliance >= 90 && selectedClause?.status === 'compliant') {
      setShowCelebration(true)
    }
  }, [overallCompliance, selectedClause])
  
  if (showCelebration) {
    return (
      <SuccessCelebration
        type="achievement"
        message="Excellent Compliance!"
        description={`${overallCompliance}% compliance achieved across all departments`}
        onComplete={() => setShowCelebration(false)}
      />
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Compliance Overview Banner */}
      <Card className={cn(
        "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10",
        "border-blue-200/50 dark:border-blue-800/50 animate-slide-in-up"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  ISO Compliance Dashboard
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track your organization's compliance across all ISO clauses
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {overallCompliance}%
                </span>
                {overallCompliance >= 90 ? (
                  <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                ) : overallCompliance >= 70 ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Overall Compliance
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className={cn(
                  "h-3 rounded-full transition-all duration-1000 ease-out",
                  overallCompliance >= 90 
                    ? "bg-gradient-to-r from-green-400 to-green-600 animate-glow" 
                    : overallCompliance >= 70
                    ? "bg-gradient-to-r from-blue-400 to-blue-600"
                    : "bg-gradient-to-r from-orange-400 to-orange-600"
                )}
                style={{ width: `${overallCompliance}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-6">
        {/* Left: Clause Explorer */}
        <ClauseExplorer
          clauses={clauses}
          selectedClauseId={selectedClause?.id || null}
          onClauseSelect={handleClauseSelect}
          highlightedClauseId={highlightedClauseId}
        />

        {/* Right: Selected Clause Details */}
        <div className="flex-1">
          {selectedClause ? (
            <div className="space-y-6 animate-fade-in-scale">
              {/* Clause Header */}
              <Card className={cn(
                "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                "hover-lift transition-all duration-200",
                animatingClause === selectedClause.id && "animate-pulse"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      {selectedClause.status === 'compliant' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        ISO {selectedClause.id} - {selectedClause.title}
                      </span>
                    </div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        getStatusBadgeColor(selectedClause.status),
                        selectedClause.status === 'compliant' && "animate-heartbeat"
                      )}
                    >
                      {selectedClause.status === "compliant" ? (
                        <span className="flex items-center space-x-1">
                          <Sparkles className="h-3 w-3" />
                          <span>Compliant</span>
                        </span>
                      ) : (
                        "Gap Identified"
                      )}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedClause.description}
                  </p>
                </CardContent>
              </Card>

              {/* Department Compliance Chart */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Department Compliance
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    {/* Pie Chart */}
                    <div className="w-48 h-48 animate-fade-in-scale">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData(selectedClause)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            animationBegin={200}
                            animationDuration={800}
                          >
                            {getPieChartData(selectedClause).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-3">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <span>Department Status</span>
                        {selectedClause.status === 'compliant' && (
                          <Sparkles className="h-4 w-4 text-yellow-500 animate-bounce" />
                        )}
                      </h4>
                      {Object.entries(selectedClause.departments).map(([dept, status], index) => (
                        <div 
                          key={dept} 
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg transition-all duration-200",
                            "hover:bg-slate-50 dark:hover:bg-slate-700/50",
                            "animate-slide-in-up",
                            `stagger-${Math.min(index + 1, 5)}`
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            {status === 'compliant' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {dept}
                            </span>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs transition-all duration-200",
                              getStatusBadgeColor(status),
                              status === 'compliant' && "animate-pulse"
                            )}
                          >
                            {status === "compliant" ? "Compliant" : "Gap"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Services */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <span className="text-lg">🔗</span>
                    </div>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Linked Service Catalog ({selectedClause.linkedServices})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      This clause is linked to {selectedClause.linkedServices} services in the organization.
                      Click on a service to view its details and compliance status.
                    </p>
                    
                    {/* Service integration preview */}
                    <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Services are automatically monitored for compliance changes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <DelightfulEmptyState
              type="organization"
              title="Select an ISO Clause"
              description="Choose a clause from the explorer to view detailed compliance information, department status, and linked services."
              actionLabel="Explore clauses"
              onAction={() => {
                // Auto-select first clause if available
                if (clauses.length > 0) {
                  handleClauseSelect(clauses[0])
                }
              }}
              illustration={
                <div className="relative">
                  <Shield className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-xs">📋</span>
                  </div>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}