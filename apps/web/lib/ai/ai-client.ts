/**
 * AI Client for Frontend Integration
 * TypeScript client for interacting with Arketic AI backend services
 */

export interface AIConfig {
  baseUrl: string;
  apiKey?: string;
  organizationId: string;
  userId?: string;
  timeout?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AssistantConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  capabilities: string[];
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SearchOptions {
  query: string;
  knowledgeBase?: string;
  filters?: Record<string, any>;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
  documentId: string;
  chunkIndex: number;
}

export interface DocumentUploadOptions {
  file: File;
  metadata?: Record<string, any>;
  processingConfig?: {
    enableOCR?: boolean;
    extractImages?: boolean;
    chunkSize?: number;
  };
}

export interface UsageMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  requestsToday: number;
  costToday: number;
  averageResponseTime: number;
}

export interface SecurityAssessment {
  isSafe: boolean;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  threats: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  recommendations: string[];
}

export class AIClient {
  private config: AIConfig;
  private wsConnection: WebSocket | null = null;
  private streamingCallbacks: Map<string, StreamingOptions> = new Map();

  constructor(config: AIConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  // Authentication and connection management
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Organization-ID': this.config.organizationId,
    };

    if (this.config.userId) {
      headers['X-User-ID'] = this.config.userId;
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Chat and messaging
  async sendMessage(
    message: string,
    assistantId?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      context?: Record<string, any>;
    }
  ): Promise<ChatMessage> {
    const response = await this.request<{ content: string; usage: any; metadata: any }>(
      '/api/v1/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          assistant_id: assistantId,
          config: {
            model: options?.model || 'gpt-3.5-turbo',
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
          },
          context: options?.context,
        }),
      }
    );

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: response.metadata,
    };
  }

  // Streaming chat
  async streamMessage(
    message: string,
    options: StreamingOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      let fullResponse = '';

      // Store callbacks
      this.streamingCallbacks.set(requestId, {
        ...options,
        onComplete: (response: string) => {
          this.streamingCallbacks.delete(requestId);
          options.onComplete?.(response);
          resolve(response);
        },
        onError: (error: Error) => {
          this.streamingCallbacks.delete(requestId);
          options.onError?.(error);
          reject(error);
        },
      });

      // Connect to WebSocket if not already connected
      this.connectWebSocket().then(() => {
        if (this.wsConnection?.readyState === WebSocket.OPEN) {
          options.onStart?.();
          
          this.wsConnection.send(JSON.stringify({
            type: 'chat',
            message,
            model: options.model || 'gpt-3.5-turbo',
            request_id: requestId,
            config: {
              temperature: options.temperature || 0.7,
              max_tokens: options.maxTokens || 2000,
            },
          }));
        } else {
          reject(new Error('WebSocket connection not available'));
        }
      }).catch(reject);
    });
  }

  // WebSocket connection management
  private async connectWebSocket(): Promise<void> {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.baseUrl.replace('http', 'ws')}/ws/${crypto.randomUUID()}`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.wsConnection = null;
      };
    });
  }

  private handleWebSocketMessage(data: any) {
    const { message_type, content, metadata } = data;
    const requestId = metadata?.request_id;
    
    if (!requestId) return;

    const callbacks = this.streamingCallbacks.get(requestId);
    if (!callbacks) return;

    switch (message_type) {
      case 'chunk':
        callbacks.onChunk?.(content);
        break;
      
      case 'completion':
        callbacks.onComplete?.(''); // Full response is accumulated on client side
        break;
      
      case 'error':
        callbacks.onError?.(new Error(content));
        break;
    }
  }

  async disconnectWebSocket(): Promise<void> {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Assistant management
  async getAssistants(): Promise<AssistantConfig[]> {
    return this.request<AssistantConfig[]>('/api/v1/ai/assistants');
  }

  async createAssistant(config: Omit<AssistantConfig, 'id'>): Promise<AssistantConfig> {
    return this.request<AssistantConfig>('/api/v1/ai/assistants', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async updateAssistant(id: string, config: Partial<AssistantConfig>): Promise<AssistantConfig> {
    return this.request<AssistantConfig>(`/api/v1/ai/assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteAssistant(id: string): Promise<void> {
    await this.request(`/api/v1/ai/assistants/${id}`, {
      method: 'DELETE',
    });
  }

  // Knowledge base and vector search
  async searchKnowledge(options: SearchOptions): Promise<SearchResult[]> {
    return this.request<SearchResult[]>('/api/v1/vector/search', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async uploadDocument(options: DocumentUploadOptions): Promise<{ documentId: string; status: string }> {
    const formData = new FormData();
    formData.append('file', options.file);
    
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    if (options.processingConfig) {
      formData.append('processing_config', JSON.stringify(options.processingConfig));
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        // Remove Content-Type to let browser set it with boundary for FormData
        'Content-Type': undefined as any,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentStatus(documentId: string): Promise<{ status: string; progress: number }> {
    return this.request<{ status: string; progress: number }>(`/api/v1/documents/${documentId}/status`);
  }

  // Usage and analytics
  async getUsageMetrics(period: 'day' | 'week' | 'month' = 'day'): Promise<UsageMetrics> {
    return this.request<UsageMetrics>(`/api/v1/costs/usage?period=${period}`);
  }

  async getCostBreakdown(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCost: number;
    byModel: Record<string, { cost: number; tokens: number; requests: number }>;
    byUser: Record<string, { cost: number; tokens: number; requests: number }>;
    dailyCosts: Record<string, number>;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());

    return this.request(`/api/v1/costs/breakdown?${params.toString()}`);
  }

  // Security
  async assessSecurity(prompt: string): Promise<SecurityAssessment> {
    return this.request<SecurityAssessment>('/api/v1/security/assess', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  // Workflow automation
  async runWorkflow(
    workflowId: string,
    inputs: Record<string, any>
  ): Promise<{ workflowRunId: string; status: string }> {
    return this.request(`/api/v1/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });
  }

  async getWorkflowStatus(
    workflowRunId: string
  ): Promise<{ status: string; progress: number; outputs?: Record<string, any> }> {
    return this.request(`/api/v1/workflows/runs/${workflowRunId}/status`);
  }

  // System health
  async getSystemHealth(): Promise<Record<string, any>> {
    return this.request('/health');
  }

  // Event handling for real-time updates
  addEventListener(event: string, handler: (data: any) => void): void {
    // Implementation would depend on your event system
    // Could use Server-Sent Events or WebSocket-based events
  }

  removeEventListener(event: string, handler: (data: any) => void): void {
    // Remove event listener
  }
}

// React hooks for easy integration
export function useAIClient(config: AIConfig) {
  const [client] = useState(() => new AIClient(config));
  
  useEffect(() => {
    return () => {
      client.disconnectWebSocket();
    };
  }, [client]);

  return client;
}

export function useStreamingChat(client: AIClient) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const streamMessage = useCallback(async (message: string, options?: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError' | 'onStart'>) => {
    setIsStreaming(true);
    setCurrentResponse('');
    setError(null);

    try {
      await client.streamMessage(message, {
        ...options,
        onStart: () => setIsStreaming(true),
        onChunk: (chunk) => {
          setCurrentResponse(prev => prev + chunk);
        },
        onComplete: (response) => {
          setIsStreaming(false);
          setCurrentResponse(response);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
      });
    } catch (err) {
      setError(err as Error);
      setIsStreaming(false);
    }
  }, [client]);

  return {
    streamMessage,
    isStreaming,
    currentResponse,
    error,
  };
}

export function useAssistants(client: AIClient) {
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAssistants = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await client.getAssistants();
      setAssistants(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const createAssistant = useCallback(async (config: Omit<AssistantConfig, 'id'>) => {
    const newAssistant = await client.createAssistant(config);
    setAssistants(prev => [...prev, newAssistant]);
    return newAssistant;
  }, [client]);

  const updateAssistant = useCallback(async (id: string, config: Partial<AssistantConfig>) => {
    const updatedAssistant = await client.updateAssistant(id, config);
    setAssistants(prev => prev.map(a => a.id === id ? updatedAssistant : a));
    return updatedAssistant;
  }, [client]);

  const deleteAssistant = useCallback(async (id: string) => {
    await client.deleteAssistant(id);
    setAssistants(prev => prev.filter(a => a.id !== id));
  }, [client]);

  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  return {
    assistants,
    loading,
    error,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    refresh: loadAssistants,
  };
}

// Import React hooks
import { useState, useEffect, useCallback } from 'react';

export default AIClient;