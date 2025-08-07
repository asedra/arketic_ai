"use client"

import { X, FileText, ArrowRight, ExternalLink, History, Calendar, User, Info } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ISODocument } from "./types/doc"
import { toast } from "sonner"
import { go } from "@/lib/link-utils"

interface DocumentDrawerProps {
  document: ISODocument | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentDrawer({ document, isOpen, onClose }: DocumentDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle URL parameter for document highlighting - moved before early return
  useEffect(() => {
    const docId = searchParams.get("doc")
    if (docId && document && docId === document.id) {
      // Document is already selected via URL
    }
  }, [searchParams, document?.id])

  if (!document) return null

  /** NEW **/ // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /** NEW **/ // Get file extension
  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || 'DOC'
  }

  /** NEW **/ // Handle ISO clause navigation
  const handleISONavigation = () => {
    if (document.isoClause !== "unknown") {
      go(router, { tab: "iso", clause: document.isoClause })
      onClose()
    }
  }

  /** NEW **/ // Handle service navigation
  const handleServiceNavigation = () => {
    if (document.linkedServiceId) {
      go(router, { tab: "services", service: document.linkedServiceId })
      onClose()
    }
  }

  /** NEW **/ // Handle open in new tab
  const handleOpenInNewTab = () => {
    // Create a blob URL for the document (mock)
    const blob = new Blob(['Mock document content'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
  }

  /** NEW **/ // Mock revision history
  const revisionHistory = [
    { version: "Rev-01", date: "2024-01-15", author: "John Doe", changes: "Initial version" },
    { version: "Rev-02", date: "2024-03-20", author: "Jane Smith", changes: "Updated procedures" },
    { version: "Rev-03", date: "2024-05-01", author: "Mike Johnson", changes: "ISO compliance updates" }
  ]

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {document.fileName}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge variant="outline" className="w-fit">
            {getFileExtension(document.fileName)} Document
          </Badge>
        </SheetHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Information
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">File Name:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {document.fileName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">File Size:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {document.fileSize || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Revision:</span>
                <Badge variant="outline" className="text-xs">
                  {document.revision}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Uploaded:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {formatDate(document.uploadedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Uploaded By:</span>
                <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {document.uploadedBy || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {document.description && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Description
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {document.description}
                </p>
              </div>
            </div>
          )}

          {/* ISO Clause Link */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              ISO Compliance
            </h4>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline"
                  className={document.isoClause === "unknown" 
                    ? "text-slate-600 border-slate-300" 
                    : "text-blue-600 border-blue-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  }
                  onClick={document.isoClause !== "unknown" ? handleISONavigation : undefined}
                >
                  {document.isoClause === "unknown" ? "Unknown Clause" : `ISO ${document.isoClause}`}
                </Badge>
                {document.isoClause !== "unknown" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleISONavigation}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    View Clause
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Linked Service */}
          {document.linkedServiceId && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Linked Service
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className="text-sm cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/20"
                    onClick={handleServiceNavigation}
                  >
                    {document.linkedServiceId}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleServiceNavigation}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    View Service
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Revision History */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Revision History
            </h4>
            <div className="space-y-2">
              {revisionHistory.map((rev, index) => (
                <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {rev.version}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(rev.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {rev.changes}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    by {rev.author}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleOpenInNewTab}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => {
              toast.success("Document downloaded")
            }}
          >
            Download Document
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}