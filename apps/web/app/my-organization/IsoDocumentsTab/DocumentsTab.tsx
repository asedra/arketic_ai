"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { UploadForm } from "./UploadForm"
import { DocumentsTable } from "./DocumentsTable"
import { DocumentDrawer } from "./DocumentDrawer"
import { ISODocument } from "./types/doc"
import documentsData from "../mock/documents.json"
import { addHighlight } from "@/lib/link-utils"

export function DocumentsTab() {
  /** NEW **/ // Local state for documents and selected document
  const [documents, setDocuments] = useState<ISODocument[]>([])
  const [selectedDocument, setSelectedDocument] = useState<ISODocument | null>(null)
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null)
  
  /** NEW **/ // Get URL search params
  const searchParams = useSearchParams()

  /** NEW **/ // Load mock data on first load
  useEffect(() => {
    // Type assertion for mock data
    const typedDocuments = documentsData as ISODocument[]
    setDocuments(typedDocuments)
  }, [])

  /** NEW **/ // Handle URL parameter for document highlighting
  useEffect(() => {
    const docId = searchParams.get("doc")
    const serviceId = searchParams.get("service")
    
    if (docId) {
      setHighlightedDocId(docId)
      
      // Auto-select the document if it exists
      const doc = documents.find(d => d.id === docId)
      if (doc) {
        setSelectedDocument(doc)
      }
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedDocId(null)
      }, 3000)
    }
    
    if (serviceId) {
      // Filter documents by service
      const typedDocuments = documentsData as ISODocument[]
      const filteredDocs = typedDocuments.filter(doc => doc.linkedServiceId === serviceId)
      setDocuments(filteredDocs)
      
      // Show toast
      if (filteredDocs.length > 0) {
        // Toast will be shown by the component that navigated here
      }
    }
  }, [searchParams, documents])

  /** NEW **/ // Handle document addition
  const handleAddDocuments = (newDocuments: ISODocument[]) => {
    setDocuments(prev => [...prev, ...newDocuments])
  }

  /** NEW **/ // Handle document selection
  const handleDocumentSelect = (document: ISODocument) => {
    setSelectedDocument(document)
  }

  /** NEW **/ // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedDocument(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          ISO Documents
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Upload and manage ISO compliance documents with automatic metadata extraction
        </p>
      </div>

      {/* Upload Form */}
      <UploadForm onAdd={handleAddDocuments} />

      {/* Documents Table */}
      <DocumentsTable 
        documents={documents}
        onSelect={handleDocumentSelect}
        highlightedDocId={highlightedDocId}
      />

      {/* Document Drawer */}
      <DocumentDrawer
        document={selectedDocument}
        isOpen={!!selectedDocument}
        onClose={handleDrawerClose}
      />
    </div>
  )
}