"use client"

import { FileText, ArrowRight, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ISODocument } from "./types/doc"
import { go, pulseClass } from "@/lib/link-utils"
import { useEffect, useRef } from "react"

interface DocumentsTableProps {
  documents: ISODocument[]
  onSelect: (document: ISODocument) => void
  highlightedDocId?: string | null
}

export function DocumentsTable({ documents, onSelect, highlightedDocId }: DocumentsTableProps) {
  const router = useRouter()
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  /** LINK **/ // Highlight and scroll to row if highlightedDocId is set
  useEffect(() => {
    if (highlightedDocId && rowRefs.current[highlightedDocId]) {
      const el = rowRefs.current[highlightedDocId]
      el?.classList.add(pulseClass)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      setTimeout(() => {
        el?.classList.remove(pulseClass)
      }, 1600)
    }
  }, [highlightedDocId])

  /** NEW **/ // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /** NEW **/ // Get file extension
  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || 'DOC'
  }

  /** NEW **/ // Get file icon color
  const getFileIconColor = (extension: string) => {
    switch (extension) {
      case 'PDF':
        return 'text-red-600'
      case 'DOCX':
        return 'text-blue-600'
      case 'DOC':
        return 'text-blue-500'
      default:
        return 'text-slate-600'
    }
  }

  /** NEW **/ // Handle service click
  const handleServiceClick = (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    go(router, { tab: "services", service: serviceId })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          ISO Documents ({documents.length})
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Click on any document to view details and navigate to related ISO clauses or service catalog
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No documents uploaded
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload your first ISO document to get started
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">File</TableHead>
              <TableHead>ISO Clause</TableHead>
              <TableHead>Linked Service</TableHead>
              <TableHead>Revision</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const extension = getFileExtension(doc.fileName)
              return (
                <TableRow 
                  key={doc.id}
                  ref={el => { rowRefs.current[doc.id] = el || null; }}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => onSelect(doc)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${getFileIconColor(extension)}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {doc.fileName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {extension} Document
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={doc.isoClause === "unknown" 
                        ? "text-slate-600 border-slate-300" 
                        : "text-blue-600 border-blue-300"
                      }
                    >
                      {doc.isoClause === "unknown" ? "Unknown" : `ISO ${doc.isoClause}`}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {doc.linkedServiceId ? (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
                          onClick={(e) => handleServiceClick(doc.linkedServiceId!, e)}
                        >
                          {doc.linkedServiceId}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">No service linked</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {doc.revision}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {doc.fileSize || "N/A"}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {doc.uploadedBy || "Unknown"}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(doc)
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}