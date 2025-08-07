"use client"

import { useEffect, useRef } from "react"
import { Building2, Users, User } from "lucide-react"
import { OrgNode } from "@/lib/state-manager"

interface CanvasProps {
  data: OrgNode[]
  onNodeClick: (node: OrgNode) => void
}

export function Canvas({ data, onNodeClick }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // TODO: Implement D3 radial tree visualization
  // For now, showing a simple placeholder with node cards

  const renderNodeCard = (node: OrgNode) => {
    const getIcon = () => {
      switch (node.type) {
        case "site":
          return <Building2 className="h-8 w-8 text-blue-600" />
        case "department":
          return <Users className="h-8 w-8 text-purple-600" />
        case "title":
          return <User className="h-8 w-8 text-green-600" />
        case "user":
          return <User className="h-8 w-8 text-slate-600" />
        default:
          return <User className="h-8 w-8 text-slate-600" />
      }
    }

    const getCardStyle = () => {
      switch (node.type) {
        case "site":
          return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        case "department":
          return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
        case "title":
          return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        case "user":
          return "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
        default:
          return "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
      }
    }

    return (
      <div
        key={node.id}
        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getCardStyle()}`}
        onClick={() => onNodeClick(node)}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              {node.name}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
              {node.type}
            </p>
            {node.type === "user" && node.email && (
              <p className="text-xs text-slate-500">{node.email}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const flattenNodes = (nodes: OrgNode[]): OrgNode[] => {
    const result: OrgNode[] = []
    const traverse = (nodeList: OrgNode[]) => {
      nodeList.forEach(node => {
        result.push(node)
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return result
  }

  const allNodes = flattenNodes(data)

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Organization Chart
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Interactive organizational structure visualization
        </p>
      </div>

      <div ref={canvasRef} className="min-h-[400px]">
        {/* TODO: Replace with D3 radial tree visualization */}
        <div className="text-center py-12">
          <div className="mb-4">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              D3 Radial Tree Visualization
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Interactive organizational chart will be implemented here
            </p>
          </div>
          
          {/* Fallback: Simple node cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {allNodes.slice(0, 6).map(renderNodeCard)}
          </div>
          
          {allNodes.length > 6 && (
            <p className="text-sm text-slate-500 mt-4">
              +{allNodes.length - 6} more nodes
            </p>
          )}
        </div>
      </div>
    </div>
  )
}