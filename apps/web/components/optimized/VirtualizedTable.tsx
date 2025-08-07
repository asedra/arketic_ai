"use client"

import React, { memo, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface VirtualizedTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    header: string
    width?: number
    render?: (value: any, item: T) => React.ReactNode
  }>
  height: number
  itemHeight?: number
  className?: string
}

function VirtualizedTableInner<T extends Record<string, any>>({
  data,
  columns,
  height,
  itemHeight = 50,
  className = ""
}: VirtualizedTableProps<T>) {
  const MemoizedRow = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index]
    
    return (
      <div style={style}>
        <TableRow className="hover:bg-muted/50">
          {columns.map((column) => (
            <TableCell key={String(column.key)} className="p-2">
              {column.render 
                ? column.render(item[column.key], item)
                : String(item[column.key] || '-')
              }
            </TableCell>
          ))}
        </TableRow>
      </div>
    )
  })

  MemoizedRow.displayName = 'MemoizedRow'

  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0)
  }, [columns])

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className={`border rounded-md ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={String(column.key)} 
                style={{ width: column.width || 150 }}
                className="p-2"
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      
      <div style={{ height }}>
        <List
          height={height}
          itemCount={data.length}
          itemSize={itemHeight}
          width="100%"
        >
          {MemoizedRow}
        </List>
      </div>
    </div>
  )
}

export const VirtualizedTable = memo(VirtualizedTableInner) as typeof VirtualizedTableInner