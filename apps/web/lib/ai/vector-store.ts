import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { VectorStoreRetriever } from "@langchain/core/vectorstores"

export interface VectorSearchResult {
  content: string
  metadata: Record<string, any>
  score: number
}

export interface VectorStoreConfig {
  indexName: string
  namespace?: string
  topK?: number
  scoreThreshold?: number
}

export interface EmbeddingMetadata {
  knowledgeId: string
  documentId: string
  fileName: string
  fileType: string
  chunkIndex: number
  totalChunks: number
  userId: string
  organizationId: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

class VectorStoreService {
  private pinecone: Pinecone
  private embeddings: OpenAIEmbeddings
  private textSplitter: RecursiveCharacterTextSplitter
  private vectorStores: Map<string, PineconeStore> = new Map()

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-3-small", // Cost-effective embedding model
      batchSize: 512
    })

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""]
    })
  }

  async initializeIndex(indexName: string, dimension = 1536): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes()
      const existingIndex = indexList.indexes?.find(index => index.name === indexName)

      if (!existingIndex) {
        await this.pinecone.createIndex({
          name: indexName,
          dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        })

        // Wait for index to be ready
        await this.waitForIndex(indexName)
      }

      // Initialize vector store
      const index = this.pinecone.index(indexName)
      const vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
        pineconeIndex: index
      })

      this.vectorStores.set(indexName, vectorStore)
    } catch (error) {
      console.error(`Failed to initialize index ${indexName}:`, error)
      throw error
    }
  }

  private async waitForIndex(indexName: string, timeout = 60000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const indexStats = await this.pinecone.index(indexName).describeIndexStats()
        if (indexStats) {
          return
        }
      } catch (error) {
        // Index not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error(`Index ${indexName} not ready after ${timeout}ms`)
  }

  async addDocuments(
    documents: Document[],
    config: VectorStoreConfig,
    metadata: Partial<EmbeddingMetadata>
  ): Promise<string[]> {
    const vectorStore = this.vectorStores.get(config.indexName)
    if (!vectorStore) {
      throw new Error(`Vector store ${config.indexName} not initialized`)
    }

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }))

    // Add to vector store with namespace
    const ids = await vectorStore.addDocuments(enrichedChunks, {
      namespace: config.namespace
    })

    return ids
  }

  async searchSimilar(
    query: string,
    config: VectorStoreConfig,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const vectorStore = this.vectorStores.get(config.indexName)
    if (!vectorStore) {
      throw new Error(`Vector store ${config.indexName} not initialized`)
    }

    const results = await vectorStore.similaritySearchWithScore(
      query,
      config.topK || 5,
      {
        ...filters,
        namespace: config.namespace
      }
    )

    return results
      .filter(([_, score]) => !config.scoreThreshold || score >= config.scoreThreshold)
      .map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score
      }))
  }

  async getRetriever(
    config: VectorStoreConfig,
    filters?: Record<string, any>
  ): Promise<VectorStoreRetriever> {
    const vectorStore = this.vectorStores.get(config.indexName)
    if (!vectorStore) {
      throw new Error(`Vector store ${config.indexName} not initialized`)
    }

    return vectorStore.asRetriever({
      k: config.topK || 5,
      searchType: "similarity",
      filter: {
        ...filters,
        namespace: config.namespace
      }
    })
  }

  async deleteDocuments(
    documentIds: string[],
    config: VectorStoreConfig
  ): Promise<void> {
    const index = this.pinecone.index(config.indexName)
    
    await index.namespace(config.namespace || '').deleteMany({
      ids: documentIds
    })
  }

  async deleteByMetadata(
    filters: Record<string, any>,
    config: VectorStoreConfig
  ): Promise<void> {
    const index = this.pinecone.index(config.indexName)
    
    await index.namespace(config.namespace || '').deleteMany({
      filter: filters
    })
  }

  async updateDocument(
    documentId: string,
    document: Document,
    config: VectorStoreConfig,
    metadata: Partial<EmbeddingMetadata>
  ): Promise<void> {
    // Delete existing document
    await this.deleteDocuments([documentId], config)
    
    // Add updated document
    await this.addDocuments([document], config, {
      ...metadata,
      updatedAt: new Date().toISOString()
    })
  }

  async getIndexStats(indexName: string): Promise<any> {
    const index = this.pinecone.index(indexName)
    return await index.describeIndexStats()
  }

  async createHybridRetriever(
    config: VectorStoreConfig,
    keywordWeight = 0.3,
    semanticWeight = 0.7
  ): Promise<VectorStoreRetriever> {
    // This would implement hybrid search combining keyword and semantic search
    const vectorStore = this.vectorStores.get(config.indexName)
    if (!vectorStore) {
      throw new Error(`Vector store ${config.indexName} not initialized`)
    }

    return vectorStore.asRetriever({
      k: config.topK || 5,
      searchType: "similarity"
    })
  }

  // Batch operations for better performance
  async batchAddDocuments(
    documentBatches: { documents: Document[], metadata: Partial<EmbeddingMetadata> }[],
    config: VectorStoreConfig,
    batchSize = 100
  ): Promise<string[][]> {
    const allIds: string[][] = []
    
    for (const batch of documentBatches) {
      const chunks = []
      for (let i = 0; i < batch.documents.length; i += batchSize) {
        chunks.push(batch.documents.slice(i, i + batchSize))
      }
      
      const batchIds = await Promise.all(
        chunks.map(chunk => this.addDocuments(chunk, config, batch.metadata))
      )
      
      allIds.push(...batchIds)
    }
    
    return allIds
  }

  // Semantic cache for frequently asked questions
  async semanticCache(
    query: string,
    config: VectorStoreConfig,
    cacheThreshold = 0.95
  ): Promise<VectorSearchResult | null> {
    const results = await this.searchSimilar(query, {
      ...config,
      topK: 1,
      scoreThreshold: cacheThreshold
    })
    
    return results.length > 0 ? results[0] : null
  }

  // Analytics and monitoring
  async getUsageStats(indexName: string): Promise<{
    totalVectors: number
    dimension: number
    indexFullness: number
    namespaces: Record<string, number>
  }> {
    const stats = await this.getIndexStats(indexName)
    
    return {
      totalVectors: stats.totalVectorCount || 0,
      dimension: stats.dimension || 0,
      indexFullness: stats.indexFullness || 0,
      namespaces: stats.namespaces || {}
    }
  }
}

export const vectorStoreService = new VectorStoreService()