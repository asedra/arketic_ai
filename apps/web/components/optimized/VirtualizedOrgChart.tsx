"use client"

import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Building2, Users, User, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVirtualList } from '@/lib/performance-hooks'

interface OrgNode {
  id: string
  name: string
  type: 'site' | 'department' | 'title' | 'user'
  email?: string
  children?: OrgNode[]
  level?: number
  isExpanded?: boolean
}

interface VirtualizedOrgChartProps {
  data: OrgNode[]
  onNodeClick: (node: OrgNode) => void
  height?: number
}

// Flatten tree structure for virtualization
function flattenTree(nodes: OrgNode[], level = 0, expandedIds = new Set<string>()): OrgNode[] {
  const result: OrgNode[] = []
  
  for (const node of nodes) {
    const nodeWithLevel = { ...node, level, isExpanded: expandedIds.has(node.id) }
    result.push(nodeWithLevel)
    
    if (node.children && expandedIds.has(node.id)) {
      result.push(...flattenTree(node.children, level + 1, expandedIds))
    }
  }
  
  return result
}

// Memoized tree node component
const TreeNode = memo(function TreeNode({ 
  node, 
  onNodeClick, 
  onToggle 
}: { 
  node: OrgNode
  onNodeClick: (node: OrgNode) => void
  onToggle: (nodeId: string) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const paddingLeft = (node.level || 0) * 24 + 16

  const getIcon = () => {
    switch (node.type) {
      case "site":
        return <Building2 className="h-5 w-5 text-blue-600" />
      case "department":
        return <Users className="h-5 w-5 text-purple-600" />
      case "title":
        return <User className="h-5 w-5 text-green-600" />
      case "user":
        return <User className="h-5 w-5 text-slate-600" />
      default:
        return <User className="h-5 w-5 text-slate-600" />
    }
  }

  const getCardStyle = () => {
    switch (node.type) {
      case "site":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
      case "department":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
      case "title":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
      case "user":
        return "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
      default:
        return "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
    }
  }

  return (
    <div
      style={{ paddingLeft }}
      className="py-1"
    >
      <Card className={`cursor-pointer transition-all duration-200 ${getCardStyle()}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(node.id)
                }}
              >
                {node.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <div 
              className="flex items-center gap-3 flex-1"
              onClick={() => onNodeClick(node)}
            >
              {getIcon()}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {node.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                  {node.type}
                </p>
                {node.type === "user" && node.email && (
                  <p className="text-xs text-slate-500">{node.email}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export const VirtualizedOrgChart = memo(function VirtualizedOrgChart({
  data,
  onNodeClick,
  height = 600
}: VirtualizedOrgChartProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Auto-expand first level by default
  useEffect(() => {
    const firstLevelIds = data.map(node => node.id)
    setExpandedIds(new Set(firstLevelIds))
  }, [data])

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const flattenedNodes = useMemo(() => {
    return flattenTree(data, 0, expandedIds)
  }, [data, expandedIds])

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = flattenedNodes[index]
    
    return (
      <div style={style}>
        <TreeNode
          node={node}
          onNodeClick={onNodeClick}
          onToggle={handleToggle}
        />
      </div>
    )
  })

  Row.displayName = 'OrgChartRow'

  if (flattenedNodes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          No organization data
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          The organization chart will appear here when data is available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Organization Structure
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {flattenedNodes.length} items visible
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (expandedIds.size === 0) {
              // Expand all
              const allIds = new Set<string>()
              const collectIds = (nodes: OrgNode[]) => {
                nodes.forEach(node => {
                  allIds.add(node.id)
                  if (node.children) {
                    collectIds(node.children)
                  }
                })
              }
              collectIds(data)
              setExpandedIds(allIds)
            } else {
              // Collapse all
              setExpandedIds(new Set())
            }
          }}
        >
          {expandedIds.size === 0 ? 'Expand All' : 'Collapse All'}
        </Button>
      </div>

      <div className="border rounded-lg bg-white dark:bg-slate-800">
        <List
          height={height}
          itemCount={flattenedNodes.length}
          itemSize={76}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  )
})