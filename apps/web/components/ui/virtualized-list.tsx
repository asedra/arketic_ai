"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useVirtualization } from "@/lib/performance"

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = "",
  overscan = 5,
  onScroll
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const {
    visibleItems,
    startIndex,
    offsetY,
    totalHeight
  } = useVirtualization(items, containerHeight, itemHeight, overscan)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Virtualized table component for large datasets
interface VirtualizedTableProps<T> {
  data: T[]
  itemHeight?: number
  containerHeight: number
  columns: Array<{
    key: keyof T
    header: string
    render?: (value: any, item: T, index: number) => React.ReactNode
    width?: string
  }>
  className?: string
}

export function VirtualizedTable<T>({
  data,
  itemHeight = 60,
  containerHeight,
  columns,
  className = ""
}: VirtualizedTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <div className={`grid gap-4 px-4 py-2 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50`}
         style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
      {columns.map((column) => (
        <div key={String(column.key)} className="flex items-center">
          {column.render 
            ? column.render(item[column.key], item, index)
            : String(item[column.key] || '')
          }
        </div>
      ))}
    </div>
  ), [columns])

  return (
    <div className={`border border-slate-200 dark:border-slate-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className={`grid gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-medium`}
           style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
        {columns.map((column) => (
          <div key={String(column.key)}>
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Virtualized rows */}
      <VirtualizedList
        items={data}
        itemHeight={itemHeight}
        containerHeight={containerHeight - 60} // Account for header
        renderItem={renderRow}
      />
    </div>
  )
}

// Grid virtualization for card layouts
interface VirtualizedGridProps<T> {
  items: T[]
  itemHeight: number
  itemsPerRow: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  gap?: number
  className?: string
}

export function VirtualizedGrid<T>({
  items,
  itemHeight,
  itemsPerRow,
  containerHeight,
  renderItem,
  gap = 16,
  className = ""
}: VirtualizedGridProps<T>) {
  // Group items into rows
  const rows = useMemo(() => {
    const result = []
    for (let i = 0; i < items.length; i += itemsPerRow) {
      result.push(items.slice(i, i + itemsPerRow))
    }
    return result
  }, [items, itemsPerRow])

  const renderRow = useCallback((row: T[], rowIndex: number) => (
    <div 
      className="grid"
      style={{ 
        gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
        gap: `${gap}px`,
        padding: `0 ${gap}px`
      }}
    >
      {row.map((item, colIndex) => (
        <div key={rowIndex * itemsPerRow + colIndex}>
          {renderItem(item, rowIndex * itemsPerRow + colIndex)}
        </div>
      ))}
    </div>
  ), [itemsPerRow, gap, renderItem])

  return (
    <VirtualizedList
      items={rows}
      itemHeight={itemHeight + gap}
      containerHeight={containerHeight}
      renderItem={renderRow}
      className={className}
    />
  )
}