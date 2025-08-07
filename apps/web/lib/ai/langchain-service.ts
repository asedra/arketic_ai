import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { ChatGroq } from "@langchain/groq"
import { HuggingFaceInference } from "@langchain/community/llms/hf"
import { BaseLanguageModel } from "@langchain/core/language_models/base"
import { PromptTemplate } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { RunnableSequence } from "@langchain/core/runnables"

export type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'local'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  temperature: number
  maxTokens: number
  topP?: number
  streaming?: boolean
  fallbackProvider?: LLMProvider
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
}

export interface LLMResponse {
  content: string
  usage: TokenUsage
  provider: LLMProvider
  model: string
  latency: number
}

class LangChainService {
  private models: Map<LLMProvider, BaseLanguageModel> = new Map()
  private readonly tokenPricing = {
    'openai': {
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4o': { input: 0.005, output: 0.015 }
    },
    'anthropic': {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    },
    'groq': {
      'llama3-70b-8192': { input: 0.00059, output: 0.00079 },
      'mixtral-8x7b-32768': { input: 0.00024, output: 0.00024 }
    }
  }

  constructor() {
    this.initializeModels()
  }

  private initializeModels() {
    // OpenAI Models
    this.models.set('openai', new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      streaming: true
    }))

    // Anthropic Models
    this.models.set('anthropic', new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2000,
      streaming: true
    }))

    // Groq Models (Fast inference)
    this.models.set('groq', new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: 'llama3-70b-8192',
      temperature: 0.7,
      maxTokens: 2000,
      streaming: true
    }))

    // HuggingFace Models
    this.models.set('huggingface', new HuggingFaceInference({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: 'microsoft/DialoGPT-large',
      maxTokens: 2000
    }))
  }

  async generateResponse(
    prompt: string,
    config: LLMConfig,
    context?: any
  ): Promise<LLMResponse> {
    const startTime = Date.now()
    
    try {
      const response = await this.executeWithFallback(prompt, config, context)
      const latency = Date.now() - startTime
      
      return {
        ...response,
        latency
      }
    } catch (error) {
      console.error('LLM generation failed:', error)
      throw new Error(`LLM generation failed: ${error.message}`)
    }
  }

  private async executeWithFallback(
    prompt: string,
    config: LLMConfig,
    context?: any
  ): Promise<Omit<LLMResponse, 'latency'>> {
    try {
      return await this.executeWithProvider(prompt, config, context)
    } catch (error) {
      if (config.fallbackProvider) {
        console.warn(`Primary provider ${config.provider} failed, trying fallback ${config.fallbackProvider}`)
        const fallbackConfig = { ...config, provider: config.fallbackProvider }
        return await this.executeWithProvider(prompt, fallbackConfig, context)
      }
      throw error
    }
  }

  private async executeWithProvider(
    prompt: string,
    config: LLMConfig,
    context?: any
  ): Promise<Omit<LLMResponse, 'latency'>> {
    const model = this.getModel(config)
    
    // Create prompt template with context
    const promptTemplate = PromptTemplate.fromTemplate(`
      {context}
      
      Human: {prompt}
      
      Assistant: I'll help you with that. Let me provide a comprehensive response.
    `)

    // Create chain
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser()
    ])

    // Execute chain
    const result = await chain.invoke({
      prompt,
      context: context ? JSON.stringify(context) : ''
    })

    // Calculate token usage and cost
    const usage = this.calculateTokenUsage(prompt, result, config)

    return {
      content: result,
      usage,
      provider: config.provider,
      model: config.model
    }
  }

  private getModel(config: LLMConfig): BaseLanguageModel {
    const baseModel = this.models.get(config.provider)
    if (!baseModel) {
      throw new Error(`Provider ${config.provider} not available`)
    }

    // Configure model with specific parameters
    return baseModel.bind({
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      stream: config.streaming
    })
  }

  private calculateTokenUsage(prompt: string, response: string, config: LLMConfig): TokenUsage {
    // Rough token estimation (1 token ≈ 4 characters)
    const promptTokens = Math.ceil(prompt.length / 4)
    const completionTokens = Math.ceil(response.length / 4)
    const totalTokens = promptTokens + completionTokens

    // Calculate cost based on provider pricing
    const pricing = this.tokenPricing[config.provider]?.[config.model]
    const cost = pricing ? 
      (promptTokens * pricing.input + completionTokens * pricing.output) / 1000 : 0

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      cost
    }
  }

  async streamResponse(
    prompt: string,
    config: LLMConfig,
    onChunk: (chunk: string) => void,
    context?: any
  ): Promise<LLMResponse> {
    const startTime = Date.now()
    const model = this.getModel({ ...config, streaming: true })
    
    const promptTemplate = PromptTemplate.fromTemplate(`
      {context}
      
      Human: {prompt}
      
      Assistant:
    `)

    const chain = RunnableSequence.from([
      promptTemplate,
      model
    ])

    let fullResponse = ''
    
    const stream = await chain.stream({
      prompt,
      context: context ? JSON.stringify(context) : ''
    })

    for await (const chunk of stream) {
      const content = chunk.content || chunk
      fullResponse += content
      onChunk(content)
    }

    const latency = Date.now() - startTime
    const usage = this.calculateTokenUsage(prompt, fullResponse, config)

    return {
      content: fullResponse,
      usage,
      provider: config.provider,
      model: config.model,
      latency
    }
  }

  // Health check for all providers
  async healthCheck(): Promise<Record<LLMProvider, boolean>> {
    const results: Record<LLMProvider, boolean> = {} as any
    
    for (const [provider, model] of this.models.entries()) {
      try {
        await model.invoke("Health check")
        results[provider] = true
      } catch (error) {
        results[provider] = false
      }
    }
    
    return results
  }

  // Get available models for each provider
  getAvailableModels(): Record<LLMProvider, string[]> {
    return {
      openai: ['gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      groq: ['llama3-70b-8192', 'mixtral-8x7b-32768'],
      huggingface: ['microsoft/DialoGPT-large', 'meta-llama/Llama-2-7b-chat-hf'],
      local: ['custom-model-1', 'custom-model-2']
    }
  }
}

export const langchainService = new LangChainService()