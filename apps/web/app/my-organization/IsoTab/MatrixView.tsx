"use client"

import { Badge } from "@/components/ui/badge"
import { Clause } from "./types/iso"

interface MatrixViewProps {
  clauses: Clause[]
  onCellClick: (clause: Clause, department: string) => void
}

export function MatrixView({ clauses, onCellClick }: MatrixViewProps) {
  /** NEW **/ // Get all unique departments
  const departments = Array.from(
    new Set(
      clauses.flatMap(clause => Object.keys(clause.departments))
    )
  ).sort()

  /** NEW **/ // Get cell background color
  const getCellColor = (status: "compliant" | "gap") => {
    return status === "compliant"
      ? "bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
      : "bg-rose-100 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
  }

  /** NEW **/ // Get cell text color
  const getCellTextColor = (status: "compliant" | "gap") => {
    return status === "compliant"
      ? "text-emerald-800 dark:text-emerald-200"
      : "text-rose-800 dark:text-rose-200"
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Compliance Matrix
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Click on any cell to view detailed compliance information
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left p-3 font-medium text-slate-900 dark:text-slate-100 min-w-[200px]">
                ISO Clause
              </th>
              {departments.map((dept) => (
                <th key={dept} className="text-center p-3 font-medium text-slate-900 dark:text-slate-100 min-w-[120px]">
                  {dept}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clauses.map((clause) => (
              <tr key={clause.id} className="border-b border-slate-100 dark:border-slate-700">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {clause.id}
                    </span>
                    <Badge 
                      variant="outline"
                      className={clause.status === "compliant" 
                        ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      }
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {clause.linkedServices} service catalog
                      </span>
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {clause.title}
                  </p>
                </td>
                {departments.map((dept) => {
                  const status = clause.departments[dept] || "gap"
                  return (
                    <td key={dept} className="p-2">
                      <button
                        onClick={() => onCellClick(clause, dept)}
                        className={`w-full p-3 rounded-lg border transition-all hover:shadow-md ${getCellColor(status)} ${getCellTextColor(status)}`}
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {status === "compliant" ? "✓" : "✗"}
                          </div>
                          <div className="text-xs mt-1">
                            {status === "compliant" ? "Compliant" : "Gap"}
                          </div>
                        </div>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded"></div>
          <span className="text-slate-700 dark:text-slate-300">Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-100 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded"></div>
          <span className="text-slate-700 dark:text-slate-300">Gap Identified</span>
        </div>
      </div>
    </div>
  )
}