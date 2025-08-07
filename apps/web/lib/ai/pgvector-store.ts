import { OpenAIEmbeddings } from "@langchain/openai"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { VectorStoreRetriever } from "@langchain/core/vectorstores"
import { Pool } from "pg"

export interface PGVectorConfig {
  connectionString: string
  tableName?: string
  columns?: {
    idColumnName?: string
    vectorColumnName?: string
    contentColumnName?: string
    metadataColumnName?: string
  }
  chunkSize?: number
  chunkOverlap?: number
}

export interface PGVectorSearchOptions {
  k?: number
  scoreThreshold?: number
  filter?: Record<string, any>
  includeMetadata?: boolean
}

export interface PGVectorSearchResult {
  content: string
  metadata: Record<string, any>
  score: number
  id?: string
}

class PGVectorStoreService {
  private pool: Pool
  private embeddings: OpenAIEmbeddings
  private textSplitter: RecursiveCharacterTextSplitter
  private vectorStore: PGVectorStore | null = null
  private config: PGVectorConfig
  private initialized: boolean = false
  
  // Performance metrics
  private metrics = {
    totalQueries: 0,
    avgQueryTime: 0,
    totalInserts: 0,
    avgInsertTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  constructor(config?: Partial<PGVectorConfig>) {
    this.config = {
      connectionString: process.env.DATABASE_URL || "",
      tableName: "knowledge_embeddings",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata"
      },
      chunkSize: 1000,
      chunkOverlap: 200,
      ...config
    }

    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: this.config.connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-3-small",
      batchSize: 512,
      stripNewLines: false
    })

    // Initialize text splitter
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
      keepSeparator: false
    })
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Test database connection
      const client = await this.pool.connect()
      
      // Check if PGVector extension is installed
      const extensionCheck = await client.query(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      )
      
      if (extensionCheck.rows.length === 0) {
        throw new Error("PGVector extension is not installed in the database")
      }

      // Check if table exists
      const tableCheck = await client.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = $1`,
        [this.config.tableName]
      )

      if (tableCheck.rows.length === 0) {
        console.warn(`Table ${this.config.tableName} does not exist. Migration may be needed.`)
      }

      client.release()

      // Initialize PGVector store
      this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
        postgresConnectionOptions: {
          connectionString: this.config.connectionString
        },
        tableName: this.config.tableName,
        columns: this.config.columns
      })

      this.initialized = true
      console.log("PGVector store initialized successfully")
    } catch (error) {
      console.error("Failed to initialize PGVector store:", error)
      throw error
    }
  }

  async addDocuments(
    documents: Document[],
    metadata?: Record<string, any>
  ): Promise<string[]> {
    if (!this.initialized) await this.initialize()
    if (!this.vectorStore) throw new Error("Vector store not initialized")

    const startTime = Date.now()
    const ids: string[] = []

    try {
      // Split documents into chunks
      const chunks = await this.textSplitter.splitDocuments(documents)
      
      // Add metadata to each chunk
      const enrichedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          createdAt: new Date().toISOString()
        }
      }))

      // Add documents to vector store in batches
      const batchSize = 100
      for (let i = 0; i < enrichedChunks.length; i += batchSize) {
        const batch = enrichedChunks.slice(i, i + batchSize)
        const batchIds = await this.vectorStore.addDocuments(batch)
        ids.push(...batchIds)
      }

      // Update metrics
      const elapsed = Date.now() - startTime
      this.metrics.totalInserts++
      this.metrics.avgInsertTime = 
        (this.metrics.avgInsertTime * (this.metrics.totalInserts - 1) + elapsed) / 
        this.metrics.totalInserts

      console.log(`Added ${chunks.length} chunks in ${elapsed}ms`)
      return ids
    } catch (error) {
      console.error("Failed to add documents to PGVector:", error)
      throw error
    }
  }

  async searchSimilar(
    query: string,
    options: PGVectorSearchOptions = {}
  ): Promise<PGVectorSearchResult[]> {
    if (!this.initialized) await this.initialize()
    if (!this.vectorStore) throw new Error("Vector store not initialized")

    const startTime = Date.now()
    const {
      k = 5,
      scoreThreshold = 0.7,
      filter = {},
      includeMetadata = true
    } = options

    try {
      // Check semantic cache first
      const cachedResult = await this.checkSemanticCache(query)
      if (cachedResult) {
        this.metrics.cacheHits++
        return cachedResult
      }
      this.metrics.cacheMisses++

      // Perform similarity search
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k,
        filter
      )

      // Filter by score threshold and format results
      const formattedResults: PGVectorSearchResult[] = results
        .filter(([_, score]) => score >= scoreThreshold)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: includeMetadata ? doc.metadata : {},
          score: score,
          id: doc.metadata?.id
        }))

      // Update metrics
      const elapsed = Date.now() - startTime
      this.metrics.totalQueries++
      this.metrics.avgQueryTime = 
        (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + elapsed) / 
        this.metrics.totalQueries

      // Cache high-scoring results
      if (formattedResults.length > 0 && formattedResults[0].score > 0.95) {
        await this.updateSemanticCache(query, formattedResults)
      }

      return formattedResults
    } catch (error) {
      console.error("PGVector search failed:", error)
      throw error
    }
  }

  async hybridSearch(
    query: string,
    options: PGVectorSearchOptions & { keywordWeight?: number } = {}
  ): Promise<PGVectorSearchResult[]> {
    const { keywordWeight = 0.3, ...searchOptions } = options
    const semanticWeight = 1 - keywordWeight

    // Perform semantic search
    const semanticResults = await this.searchSimilar(query, {
      ...searchOptions,
      k: (searchOptions.k || 5) * 2
    })

    // Perform keyword search using PostgreSQL full-text search
    const keywordResults = await this.keywordSearch(query, searchOptions)

    // Combine and rerank results
    const combinedScores = new Map<string, PGVectorSearchResult>()
    
    // Add semantic results
    semanticResults.forEach(result => {
      const key = result.content.substring(0, 100)
      combinedScores.set(key, {
        ...result,
        score: result.score * semanticWeight
      })
    })

    // Add keyword results
    keywordResults.forEach(result => {
      const key = result.content.substring(0, 100)
      const existing = combinedScores.get(key)
      if (existing) {
        existing.score += result.score * keywordWeight
      } else {
        combinedScores.set(key, {
          ...result,
          score: result.score * keywordWeight
        })
      }
    })

    // Sort by combined score and return top k
    const sorted = Array.from(combinedScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, searchOptions.k || 5)

    return sorted
  }

  async keywordSearch(
    query: string,
    options: PGVectorSearchOptions = {}
  ): Promise<PGVectorSearchResult[]> {
    const { k = 5, filter = {} } = options
    
    try {
      const client = await this.pool.connect()
      
      // Build filter conditions
      let whereClause = "to_tsvector('english', content) @@ plainto_tsquery('english', $1)"
      const params: any[] = [query]
      let paramIndex = 2

      Object.entries(filter).forEach(([key, value]) => {
        whereClause += ` AND metadata->>'${key}' = $${paramIndex}`
        params.push(value)
        paramIndex++
      })

      params.push(k)

      const result = await client.query(
        `SELECT id, content, metadata,
                ts_rank(to_tsvector('english', content), 
                       plainto_tsquery('english', $1)) as rank
         FROM ${this.config.tableName}
         WHERE ${whereClause}
         ORDER BY rank DESC
         LIMIT $${paramIndex}`,
        params
      )

      client.release()

      return result.rows.map(row => ({
        content: row.content,
        metadata: row.metadata || {},
        score: Math.min(row.rank * 10, 1), // Normalize to 0-1 range
        id: row.id
      }))
    } catch (error) {
      console.error("Keyword search failed:", error)
      return []
    }
  }

  async getRetriever(
    options: PGVectorSearchOptions = {}
  ): Promise<VectorStoreRetriever> {
    if (!this.initialized) await this.initialize()
    if (!this.vectorStore) throw new Error("Vector store not initialized")

    return this.vectorStore.asRetriever({
      k: options.k || 5,
      searchType: "similarity",
      filter: options.filter
    })
  }

  async deleteDocuments(documentIds: string[]): Promise<void> {
    try {
      const client = await this.pool.connect()
      
      await client.query(
        `DELETE FROM ${this.config.tableName} WHERE id = ANY($1::uuid[])`,
        [documentIds]
      )
      
      client.release()
      console.log(`Deleted ${documentIds.length} documents`)
    } catch (error) {
      console.error("Failed to delete documents:", error)
      throw error
    }
  }

  async updateDocument(
    documentId: string,
    newContent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Delete existing document
    await this.deleteDocuments([documentId])
    
    // Add updated document
    const doc = new Document({
      pageContent: newContent,
      metadata: { ...metadata, id: documentId }
    })
    await this.addDocuments([doc])
  }

  async getStatistics(): Promise<any> {
    try {
      const client = await this.pool.connect()
      
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT metadata->>'documentId') as unique_documents,
          AVG(CHAR_LENGTH(content)) as avg_content_length,
          pg_size_pretty(pg_relation_size('${this.config.tableName}')) as table_size
        FROM ${this.config.tableName}
      `)
      
      const indexStats = await client.query(`
        SELECT 
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE tablename = $1
      `, [this.config.tableName])
      
      client.release()
      
      return {
        ...stats.rows[0],
        indexes: indexStats.rows,
        metrics: this.getMetrics()
      }
    } catch (error) {
      console.error("Failed to get statistics:", error)
      throw error
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / 
        Math.max(this.metrics.cacheHits + this.metrics.cacheMisses, 1)
    }
  }

  async checkSemanticCache(query: string): Promise<PGVectorSearchResult[] | null> {
    try {
      const client = await this.pool.connect()
      
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query)
      
      // Check cache for similar query (>95% similarity)
      const result = await client.query(`
        SELECT response, metadata
        FROM semantic_cache
        WHERE 1 - (query_embedding <=> $1::vector) > 0.95
        AND expires_at > NOW()
        ORDER BY query_embedding <=> $1::vector
        LIMIT 1
      `, [queryEmbedding])
      
      client.release()
      
      if (result.rows.length > 0) {
        // Update cache hit count
        await this.updateCacheHitCount(result.rows[0].id)
        
        return JSON.parse(result.rows[0].response)
      }
      
      return null
    } catch (error) {
      console.error("Semantic cache check failed:", error)
      return null
    }
  }

  async updateSemanticCache(
    query: string,
    results: PGVectorSearchResult[]
  ): Promise<void> {
    try {
      const client = await this.pool.connect()
      
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query)
      
      // Store in cache with 7-day expiration
      await client.query(`
        INSERT INTO semantic_cache 
        (id, query, query_embedding, response, expires_at, created_at)
        VALUES (gen_random_uuid(), $1, $2::vector, $3, NOW() + INTERVAL '7 days', NOW())
        ON CONFLICT DO NOTHING
      `, [query, queryEmbedding, JSON.stringify(results)])
      
      client.release()
    } catch (error) {
      console.error("Failed to update semantic cache:", error)
    }
  }

  async updateCacheHitCount(cacheId: string): Promise<void> {
    try {
      const client = await this.pool.connect()
      
      await client.query(`
        UPDATE semantic_cache 
        SET hit_count = hit_count + 1,
            last_accessed_at = NOW()
        WHERE id = $1
      `, [cacheId])
      
      client.release()
    } catch (error) {
      console.error("Failed to update cache hit count:", error)
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
    this.initialized = false
  }
}

// Export singleton instance
export const pgVectorStore = new PGVectorStoreService()

// Export for backward compatibility with existing code
export { pgVectorStore as pgvectorStoreService }