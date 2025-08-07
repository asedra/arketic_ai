export type ISODocument = {
  id: string
  fileName: string
  isoClause: string        // "8.5.1" vs "10.2" …
  linkedServiceId?: string // services.json'daki id
  revision: string         // "Rev-01"
  uploadedAt: string
  fileSize?: string        // "2.4 MB"
  uploadedBy?: string      // "John Doe"
  description?: string     // "Doküman kontrol ve yönetim prosedürü"
} 