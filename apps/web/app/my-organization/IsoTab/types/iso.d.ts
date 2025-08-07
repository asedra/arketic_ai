export type Clause = {
  id: string
  title: string
  description: string
  linkedServices: number
  status: "compliant" | "gap"
  departments: Record<string, "compliant" | "gap">
}

export type ISOMeta = {
  coverage: number
  openFindings: number
  nextAuditDate: string
  clauses: Clause[]
} 