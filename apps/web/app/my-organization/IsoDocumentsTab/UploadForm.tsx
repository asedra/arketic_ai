"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ISODocument } from "./types/doc"
import { toast } from "sonner"

interface UploadFormProps {
  onAdd: (documents: ISODocument[]) => void
}

export function UploadForm({ onAdd }: UploadFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** NEW **/ // Extract metadata from file content
  const extractMeta = async (file: File): Promise<ISODocument> => {
    try {
      const text = await file.text()
      const clause = text.match(/ISO\s*(\d+\.\d+)/)?.[1] ?? "unknown"
      
      /** NEW **/ // Service mapping based on ISO clause
      const serviceMap: Record<string, string> = { 
        "10.2": "PROC_InvalidProduct", 
        "8.2": "PROC_Quotation",
        "9.1": "PROC_CustomerComplaint",
        "8.3": "PROC_DesignReview",
        "8.5": "PROC_MarketingCampaign",
        "8.6": "PROC_QualityControl",
        "7.5.3": "PROC_DocumentControl"
      }
      
      /** NEW **/ // Mock user for uploadedBy
      const mockUsers = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "David Kim"]
      const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      
      /** NEW **/ // Mock descriptions based on file name
      const getDescription = (fileName: string) => {
        if (fileName.toLowerCase().includes("doküman")) return "Doküman kontrol ve yönetim prosedürü"
        if (fileName.toLowerCase().includes("müşteri")) return "Müşteri şikayet ve geri bildirim yönetim prosedürü"
        if (fileName.toLowerCase().includes("tasarım")) return "Ürün tasarım gözden geçirme ve onay prosedürü"
        if (fileName.toLowerCase().includes("kalite")) return "Kalite kontrol ve test prosedürleri"
        if (fileName.toLowerCase().includes("pazarlama")) return "Pazarlama kampanya planlama ve yönetim prosedürü"
        if (fileName.toLowerCase().includes("teklif")) return "Müşteri teklif hazırlama ve sunum prosedürü"
        if (fileName.toLowerCase().includes("geçersiz")) return "Geçersiz ürün tespit ve yönetim prosedürü"
        if (fileName.toLowerCase().includes("denetim")) return "İç denetim planlama ve uygulama prosedürü"
        return "ISO uyumluluk prosedürü"
      }
      
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        isoClause: clause,
        linkedServiceId: serviceMap[clause],
        revision: "Rev-01",
        uploadedAt: new Date().toISOString(),
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedBy: randomUser,
        description: getDescription(file.name)
      }
    } catch (error) {
      // Fallback for files that can't be read as text
      const mockUsers = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "David Kim"]
      const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      
      return {
        id: crypto.randomUUID(),
        fileName: file.name,
        isoClause: "unknown",
        revision: "Rev-01",
        uploadedAt: new Date().toISOString(),
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedBy: randomUser,
        description: "ISO uyumluluk prosedürü"
      }
    }
  }

  /** NEW **/ // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['.docx', '.doc', '.pdf']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return validTypes.includes(fileExtension)
    })

    if (validFiles.length !== files.length) {
      toast.error("Some files were rejected. Only .docx, .doc, and .pdf files are allowed.")
    }

    setUploadedFiles(prev => [...prev, ...validFiles])
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /** NEW **/ // Handle file removal
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  /** NEW **/ // Handle upload
  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please select files to upload")
      return
    }

    try {
      const documents: ISODocument[] = []
      
      for (const file of uploadedFiles) {
        const doc = await extractMeta(file)
        documents.push(doc)
      }

      onAdd(documents)
      setUploadedFiles([])
      toast.success(`${documents.length} document(s) imported successfully`)
    } catch (error) {
      toast.error("Error processing files")
    }
  }

  /** NEW **/ // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => {
      const validTypes = ['.docx', '.doc', '.pdf']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return validTypes.includes(fileExtension)
    })

    if (validFiles.length !== files.length) {
      toast.error("Some files were rejected. Only .docx, .doc, and .pdf files are allowed.")
    }

    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload ISO Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-lg p-6 text-center cursor-pointer transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".docx,.doc,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <div>
            <p className="text-slate-600 dark:text-slate-400">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports .docx, .doc, .pdf files
            </p>
          </div>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Selected Files ({uploadedFiles.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {file.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {uploadedFiles.length > 0 && (
          <Button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import {uploadedFiles.length} Document(s)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}