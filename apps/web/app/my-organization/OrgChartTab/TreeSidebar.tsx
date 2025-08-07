"use client"

import { useState } from "react"
import { ChevronRight, Building2, Users, User, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OrgNode } from "@/lib/state-manager"

interface TreeSidebarProps {
  data: OrgNode[]
  onNodeClick: (node: OrgNode) => void
}

export function TreeSidebar({ data, onNodeClick }: TreeSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: OrgNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    const getIcon = () => {
      switch (node.type) {
        case "site":
          return <Building2 className="h-4 w-4 text-blue-600" />
        case "department":
          return <Users className="h-4 w-4 text-purple-600" />
        case "title":
          return <User className="h-4 w-4 text-green-600" />
        case "user":
          return <User className="h-4 w-4 text-slate-600" />
        default:
          return <User className="h-4 w-4 text-slate-600" />
      }
    }

    const getBadgeVariant = () => {
      switch (node.type) {
        case "site":
          return "default"
        case "department":
          return "secondary"
        case "title":
          return "outline"
        case "user":
          return "outline"
        default:
          return "outline"
      }
    }

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
            level > 0 ? `ml-${level * 4}` : ""
          }`}
          onClick={() => onNodeClick(node)}
        >
          {hasChildren && (
            <ChevronRight
              className={`h-3 w-3 text-slate-500 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
            />
          )}
          
          {node.type === "user" ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={node.avatar} alt={node.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                {node.initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              {getIcon()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {node.name}
              </span>
              {node.type === "user" && node.role && (
                <Badge variant="outline" className="text-xs">
                  {node.role}
                </Badge>
              )}
            </div>
            {node.type === "user" && node.email && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Mail className="h-3 w-3" />
                <span className="truncate">{node.email}</span>
              </div>
            )}
          </div>

          {node.type !== "user" && (
            <Badge variant={getBadgeVariant()} className="text-xs">
              {node.children?.length || 0}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 space-y-1">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Organization Tree
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Click on nodes to view details
        </p>
      </div>

      <div className="space-y-1">
        {data.map((node) => renderNode(node))}
      </div>
    </div>
  )
}