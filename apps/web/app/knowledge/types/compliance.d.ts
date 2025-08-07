export type ComplianceDocument = {
  id: string
  title: string
  version: string
  issuedDate: string
  effectiveDate: string
  authority: string
  country: string
  language: string
  status: string
  description: string
  tags: string[]
  fileUrl: string
  fileSize: string
  fileType: string
  createdAt: string
  updatedAt: string
  createdBy: string
  downloadCount: number
  viewCount: number
}

export type ComplianceFilters = {
  search?: string
  authority?: string[]
  country?: string[]
  year?: string[]
  language?: string[]
  status?: string[]
}

export type ViewMode = "cards" | "table" 