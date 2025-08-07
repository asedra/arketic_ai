import { Document } from "@langchain/core/documents"
import { VectorStoreRetriever } from "@langchain/core/vectorstores"
import { pgVectorStore } from "./pgvector-store"
import { vectorStoreService as pineconeStore } from "./vector-store"

export interface VectorStoreConfig {
  primary: "pgvector" | "pinecone"
  fallbackEnabled: boolean
  autoSwitch: boolean
  performanceThreshold: {
    maxLatencyMs: number
    maxErrorRate: number
  }
}

export interface VectorSearchResult {
  content: string
  metadata: Record<string, any>
  score: number
  source: "pgvector" | "pinecone" | "cache"
}

class UnifiedVectorStore {
  private config: VectorStoreConfig
  private metrics = {
    pgvectorErrors: 0,
    pgvectorSuccesses: 0,
    pineconeErrors: 0,
    pineconeSuccesses: 0,
    fallbackTriggers: 0,
    lastSwitchTime: null as Date | null
  }
  
  constructor(config?: Partial<VectorStoreConfig>) {
    this.config = {
      primary: "pgvector",
      fallbackEnabled: true,
      autoSwitch: true,
      performanceThreshold: {
        maxLatencyMs: 5000,
        maxErrorRate: 0.1
      },
      ...config
    }
    
    // Initialize both stores
    this.initialize()
  }
  
  private async initialize() {
    try {
      // Initialize PGVector
      await pgVectorStore.initialize()
      console.log("PGVector store initialized")
    } catch (error) {
      console.error("Failed to initialize PGVector, using Pinecone as primary:", error)
      this.config.primary = "pinecone"
    }
  }
  
  async addDocuments(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    const startTime = Date.now()
    let ids: string[] = []
    
    try {
      if (this.config.primary === "pgvector") {
        // Try PGVector first
        ids = await this.addToPGVector(documents, metadata)
        this.metrics.pgvectorSuccesses++
        
        // Optionally sync to Pinecone for redundancy
        if (this.config.fallbackEnabled) {
          this.syncToPinecone(documents, metadata).catch(err => 
            console.warn("Background Pinecone sync failed:", err)
          )
        }
      } else {
        // Use Pinecone as primary
        ids = await this.addToPinecone(documents, metadata)
        this.metrics.pineconeSuccesses++
      }
      
      const elapsed = Date.now() - startTime
      console.log(`Documents added in ${elapsed}ms using ${this.config.primary}`)
      
      return ids
    } catch (error) {
      console.error(`Failed to add documents to ${this.config.primary}:`, error)
      
      if (this.config.primary === "pgvector") {
        this.metrics.pgvectorErrors++
      } else {
        this.metrics.pineconeErrors++
      }
      
      // Try fallback
      if (this.config.fallbackEnabled) {
        return await this.addWithFallback(documents, metadata)
      }
      
      throw error
    }
  }
  
  private async addToPGVector(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    return await pgVectorStore.addDocuments(documents, metadata)
  }
  
  private async addToPinecone(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    // Convert metadata to match Pinecone format
    const pineconeMetadata = {
      knowledgeId: metadata?.knowledgeId || "",
      documentId: metadata?.documentId || "",
      fileName: metadata?.fileName || "",
      fileType: metadata?.fileType || "",
      chunkIndex: 0,
      totalChunks: documents.length,
      userId: metadata?.userId || "",
      organizationId: metadata?.organizationId || "",
      tags: metadata?.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return await pineconeStore.addDocuments(
      documents,
      {
        indexName: "arketic-knowledge",
        namespace: metadata?.organizationId || "default"
      },
      pineconeMetadata
    )
  }
  
  private async syncToPinecone(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<void> {
    // Background sync to Pinecone for redundancy
    try {
      await this.addToPinecone(documents, metadata)
    } catch (error) {
      console.warn("Background Pinecone sync failed:", error)
    }
  }
  
  private async addWithFallback(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    this.metrics.fallbackTriggers++
    
    const fallbackStore = this.config.primary === "pgvector" ? "pinecone" : "pgvector"
    console.log(`Falling back to ${fallbackStore}`)
    
    try {
      if (fallbackStore === "pgvector") {
        const ids = await this.addToPGVector(documents, metadata)
        this.metrics.pgvectorSuccesses++
        
        // Consider switching primary if fallback succeeds
        if (this.config.autoSwitch) {
          this.considerPrimarySwitch(fallbackStore)
        }
        
        return ids
      } else {
        const ids = await this.addToPinecone(documents, metadata)
        this.metrics.pineconeSuccesses++
        
        if (this.config.autoSwitch) {
          this.considerPrimarySwitch(fallbackStore)
        }
        
        return ids
      }
    } catch (fallbackError) {
      console.error(`Fallback to ${fallbackStore} also failed:`, fallbackError)
      throw new Error("Both primary and fallback vector stores failed")
    }
  }
  
  async searchSimilar(
    query: string,
    options: {
      k?: number
      scoreThreshold?: number
      filter?: Record<string, any>
      knowledgeBaseId?: string
    } = {}
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now()
    
    try {
      let results: VectorSearchResult[]
      
      if (this.config.primary === "pgvector") {
        // Search PGVector
        const pgResults = await pgVectorStore.searchSimilar(query, {
          k: options.k,
          scoreThreshold: options.scoreThreshold,
          filter: {
            ...options.filter,
            knowledge_base_id: options.knowledgeBaseId
          }
        })
        
        results = pgResults.map(r => ({
          ...r,
          source: "pgvector" as const
        }))
        
        this.metrics.pgvectorSuccesses++
      } else {
        // Search Pinecone
        const pineconeResults = await pineconeStore.searchSimilar(
          query,
          {
            indexName: "arketic-knowledge",
            namespace: options.filter?.organizationId || "default",
            topK: options.k,
            scoreThreshold: options.scoreThreshold
          },
          options.filter
        )
        
        results = pineconeResults.map(r => ({
          ...r,
          source: "pinecone" as const
        }))
        
        this.metrics.pineconeSuccesses++
      }
      
      const elapsed = Date.now() - startTime
      
      // Check performance and trigger fallback if needed
      if (elapsed > this.config.performanceThreshold.maxLatencyMs && this.config.fallbackEnabled) {
        console.warn(`Search latency exceeded threshold: ${elapsed}ms`)
        return await this.searchWithFallback(query, options)
      }
      
      return results
    } catch (error) {
      console.error(`Search failed on ${this.config.primary}:`, error)
      
      if (this.config.primary === "pgvector") {
        this.metrics.pgvectorErrors++
      } else {
        this.metrics.pineconeErrors++
      }
      
      if (this.config.fallbackEnabled) {
        return await this.searchWithFallback(query, options)
      }
      
      throw error
    }
  }
  
  private async searchWithFallback(
    query: string,
    options: any
  ): Promise<VectorSearchResult[]> {
    this.metrics.fallbackTriggers++
    
    const fallbackStore = this.config.primary === "pgvector" ? "pinecone" : "pgvector"
    console.log(`Searching fallback store: ${fallbackStore}`)
    
    try {
      if (fallbackStore === "pgvector") {
        const pgResults = await pgVectorStore.searchSimilar(query, {
          k: options.k,
          scoreThreshold: options.scoreThreshold,
          filter: {
            ...options.filter,
            knowledge_base_id: options.knowledgeBaseId
          }
        })
        
        this.metrics.pgvectorSuccesses++
        
        if (this.config.autoSwitch) {
          this.considerPrimarySwitch(fallbackStore)
        }
        
        return pgResults.map(r => ({
          ...r,
          source: "pgvector" as const
        }))
      } else {
        const pineconeResults = await pineconeStore.searchSimilar(
          query,
          {
            indexName: "arketic-knowledge",
            namespace: options.filter?.organizationId || "default",
            topK: options.k,
            scoreThreshold: options.scoreThreshold
          },
          options.filter
        )
        
        this.metrics.pineconeSuccesses++
        
        if (this.config.autoSwitch) {
          this.considerPrimarySwitch(fallbackStore)
        }
        
        return pineconeResults.map(r => ({
          ...r,
          source: "pinecone" as const
        }))
      }
    } catch (fallbackError) {
      console.error(`Fallback search also failed:`, fallbackError)
      return []
    }
  }
  
  async hybridSearch(
    query: string,
    options: {
      k?: number
      keywordWeight?: number
      semanticWeight?: number
      filter?: Record<string, any>
    } = {}
  ): Promise<VectorSearchResult[]> {
    // Only PGVector supports hybrid search natively
    if (this.config.primary === "pgvector" || this.config.fallbackEnabled) {
      try {
        const results = await pgVectorStore.hybridSearch(query, {
          k: options.k,
          keywordWeight: options.keywordWeight,
          filter: options.filter
        })
        
        return results.map(r => ({
          ...r,
          source: "pgvector" as const
        }))
      } catch (error) {
        console.error("Hybrid search failed, falling back to semantic search:", error)
        return await this.searchSimilar(query, options)
      }
    }
    
    // Fallback to semantic search for Pinecone
    return await this.searchSimilar(query, options)
  }
  
  private considerPrimarySwitch(successfulStore: "pgvector" | "pinecone") {
    const now = new Date()
    
    // Don't switch too frequently
    if (this.metrics.lastSwitchTime && 
        now.getTime() - this.metrics.lastSwitchTime.getTime() < 300000) { // 5 minutes
      return
    }
    
    // Calculate error rates
    const pgvectorErrorRate = this.metrics.pgvectorErrors / 
      Math.max(this.metrics.pgvectorErrors + this.metrics.pgvectorSuccesses, 1)
    const pineconeErrorRate = this.metrics.pineconeErrors / 
      Math.max(this.metrics.pineconeErrors + this.metrics.pineconeSuccesses, 1)
    
    // Switch if current primary has high error rate and fallback is working well
    if (this.config.primary === "pgvector" && 
        pgvectorErrorRate > this.config.performanceThreshold.maxErrorRate &&
        pineconeErrorRate < 0.05) {
      console.log("Switching primary to Pinecone due to high PGVector error rate")
      this.config.primary = "pinecone"
      this.metrics.lastSwitchTime = now
    } else if (this.config.primary === "pinecone" && 
               pineconeErrorRate > this.config.performanceThreshold.maxErrorRate &&
               pgvectorErrorRate < 0.05) {
      console.log("Switching primary to PGVector due to high Pinecone error rate")
      this.config.primary = "pgvector"
      this.metrics.lastSwitchTime = now
    }
  }
  
  async deleteDocuments(documentIds: string[]): Promise<void> {
    const promises = []
    
    // Delete from PGVector
    if (this.config.primary === "pgvector" || this.config.fallbackEnabled) {
      promises.push(
        pgVectorStore.deleteDocuments(documentIds).catch(err =>
          console.error("Failed to delete from PGVector:", err)
        )
      )
    }
    
    // Delete from Pinecone
    if (this.config.primary === "pinecone" || this.config.fallbackEnabled) {
      promises.push(
        pineconeStore.deleteDocuments(documentIds, {
          indexName: "arketic-knowledge",
          namespace: "default"
        }).catch(err =>
          console.error("Failed to delete from Pinecone:", err)
        )
      )
    }
    
    await Promise.all(promises)
  }
  
  async getStatistics(): Promise<any> {
    const stats: any = {
      primary: this.config.primary,
      fallbackEnabled: this.config.fallbackEnabled,
      metrics: this.metrics
    }
    
    try {
      if (this.config.primary === "pgvector" || this.config.fallbackEnabled) {
        stats.pgvector = await pgVectorStore.getStatistics()
      }
    } catch (error) {
      stats.pgvector = { error: error.message }
    }
    
    try {
      if (this.config.primary === "pinecone" || this.config.fallbackEnabled) {
        stats.pinecone = await pineconeStore.getUsageStats("arketic-knowledge")
      }
    } catch (error) {
      stats.pinecone = { error: error.message }
    }
    
    return stats
  }
  
  getConfig(): VectorStoreConfig {
    return { ...this.config }
  }
  
  updateConfig(config: Partial<VectorStoreConfig>): void {
    this.config = { ...this.config, ...config }
  }
  
  resetMetrics(): void {
    this.metrics = {
      pgvectorErrors: 0,
      pgvectorSuccesses: 0,
      pineconeErrors: 0,
      pineconeSuccesses: 0,
      fallbackTriggers: 0,
      lastSwitchTime: null
    }
  }
}

// Export singleton instance with automatic fallback
export const unifiedVectorStore = new UnifiedVectorStore()

// Export for backward compatibility
export { unifiedVectorStore as vectorStore }