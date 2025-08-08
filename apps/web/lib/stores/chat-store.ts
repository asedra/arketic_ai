import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { chatApi, ChatResponse, MessageResponse, ChatHistoryResponse, settingsApi } from '../api-client'

export interface ChatMessage extends MessageResponse {
  timestamp: Date
  isAI: boolean
  isUser: boolean
  isStreaming?: boolean
}

export interface Chat extends ChatResponse {
  lastActivity: Date
  createdAt: Date
  assistant_id?: string | null
  assistant_name?: string | null
}

interface TypingUser {
  userId: string
  chatId: string
  timestamp: Date
}

interface ChatStore {
  // State
  chats: Chat[]
  currentChatId: string | null
  messages: Record<string, ChatMessage[]>
  isLoading: boolean
  isSending: boolean
  error: string | null
  typingUsers: TypingUser[]
  connectionStatus: Record<string, 'connecting' | 'connected' | 'disconnected' | 'error'>
  
  // WebSocket connections
  connections: Record<string, WebSocket>
  
  // Actions
  setCurrentChat: (chatId: string | null) => void
  loadChats: () => Promise<void>
  loadChatHistory: (chatId: string) => Promise<void>
  createChat: (data: any) => Promise<string | null>
  sendMessage: (chatId: string, content: string) => Promise<void>
  sendAIMessage: (chatId: string, content: string, streaming?: boolean) => Promise<void>
  addMessage: (chatId: string, message: MessageResponse) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void
  deleteChat: (chatId: string) => Promise<void>
  
  // Real-time features
  connectToChat: (chatId: string) => void
  disconnectFromChat: (chatId: string) => void
  addTypingUser: (userId: string, chatId: string) => void
  removeTypingUser: (userId: string, chatId: string) => void
  
  // Utility
  clearError: () => void
  reset: () => void
}

const initialState = {
  chats: [],
  currentChatId: null,
  messages: {},
  isLoading: false,
  isSending: false,
  error: null,
  typingUsers: [],
  connectionStatus: {},
  connections: {},
}

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setCurrentChat: (chatId) => {
          const state = get()
          
          // Disconnect from previous chat
          if (state.currentChatId && state.connections[state.currentChatId]) {
            state.disconnectFromChat(state.currentChatId)
          }
          
          set({ currentChatId: chatId, error: null })
          
          // Connect to new chat and load history
          if (chatId) {
            state.connectToChat(chatId)
            if (!state.messages[chatId]) {
              state.loadChatHistory(chatId)
            }
          }
        },
        
        loadChats: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await chatApi.getUserChats()
            if (response.success) {
              const formattedChats = response.data.map(chat => chatApi.formatChat(chat))
              set({ chats: formattedChats, isLoading: false })
            } else {
              set({ error: response.message || 'Failed to load chats', isLoading: false })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load chats', 
              isLoading: false 
            })
          }
        },
        
        loadChatHistory: async (chatId) => {
          set({ isLoading: true, error: null })
          try {
            const response = await chatApi.getChatHistory(chatId)
            if (response.success) {
              const formattedMessages = response.data.messages.map(msg => ({
                ...chatApi.formatMessage(msg),
                isStreaming: false
              }))
              set(state => ({
                messages: {
                  ...state.messages,
                  [chatId]: formattedMessages
                },
                isLoading: false
              }))
            } else {
              set({ error: response.message || 'Failed to load chat history', isLoading: false })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load chat history', 
              isLoading: false 
            })
          }
        },
        
        createChat: async (data) => {
          set({ isLoading: true, error: null })
          try {
            console.log('Chat store: Creating chat with data:', data)
            const response = await chatApi.createChat(data)
            console.log('Chat store: Create chat response:', response)
            
            if (response.success) {
              const newChat = chatApi.formatChat(response.data)
              set(state => ({
                chats: [newChat, ...state.chats],
                isLoading: false
              }))
              return response.data.id
            } else {
              console.error('Chat store: Create chat failed:', response)
              set({ error: response.message || 'Failed to create chat', isLoading: false })
              return null
            }
          } catch (error) {
            console.error('Chat store: Create chat error:', error)
            let errorMessage = 'Failed to create chat'
            
            if (error instanceof Error) {
              errorMessage = error.message
              
              // Check if it's a validation error with details
              if ((error as any).detail) {
                errorMessage = `Validation error: ${(error as any).detail}`
              }
            }
            
            set({ 
              error: errorMessage, 
              isLoading: false 
            })
            return null
          }
        },
        
        sendMessage: async (chatId, content) => {
          set({ error: null, isSending: true })
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`
          
          try {
            // Add optimistic user message
            const optimisticMessage: ChatMessage = {
              id: tempId,
              chat_id: chatId,
              sender_id: 'current-user',
              content,
              message_type: 'USER',
              status: 'sending',
              created_at: new Date().toISOString(),
              is_edited: false,
              timestamp: new Date(),
              isAI: false,
              isUser: true,
              isStreaming: false
            }
            
            get().addMessage(chatId, optimisticMessage)
            
            // Check if OpenAI settings exist before sending to AI endpoint
            try {
              const settingsCheck = await settingsApi.getOpenAISettings()
              console.log('OpenAI settings check:', settingsCheck)
              
              if (!settingsCheck.success || !settingsCheck.data) {
                throw new Error('OpenAI API key not configured. Please set up your API key in Settings.')
              }
            } catch (settingsError) {
              console.log('No OpenAI settings found, prompting user to configure')
              throw new Error('OpenAI API key not configured. Please set up your API key in Settings to enable AI chat.')
            }
            
            // Use AI chat endpoint for all messages (with streaming)
            console.log('Chat Store: Sending message via AI endpoint:', { 
              chatId, 
              content, 
              contentLength: content?.length,
              contentType: typeof content
            })
            
            const requestPayload = { 
              message: content, 
              stream: false, 
              save_to_history: true 
            }
            console.log('Chat Store: Request payload:', requestPayload)
            
            const response = await chatApi.chatWithAI(chatId, requestPayload)
            console.log('Chat Store: AI message response:', response)
            
            if (response.success) {
              // Replace optimistic message with user message from response if available
              if (response.data.user_message) {
                const realMessage = {
                  ...chatApi.formatMessage(response.data.user_message),
                  isStreaming: false
                }
                
                set(state => ({
                  messages: {
                    ...state.messages,
                    [chatId]: state.messages[chatId]?.map(msg => 
                      msg.id === tempId ? realMessage : msg
                    ) || [realMessage]
                  }
                }))
              } else {
                // Just mark the optimistic message as delivered
                set(state => ({
                  messages: {
                    ...state.messages,
                    [chatId]: state.messages[chatId]?.map(msg => 
                      msg.id === tempId ? { ...msg, status: 'delivered' } : msg
                    ) || []
                  }
                }))
              }
              
              // Handle AI response for non-streaming mode
              if (response.data.ai_response) {
                console.log('Chat Store: Raw AI response from backend:', response.data.ai_response)
                // Ensure AI response has the correct message_type
                const aiResponseWithType = {
                  ...response.data.ai_response,
                  message_type: 'AI'  // Force AI message type
                }
                const aiMessage = {
                  ...chatApi.formatMessage(aiResponseWithType),
                  isStreaming: false
                }
                
                console.log('Chat Store: Formatted AI message:', aiMessage)
                console.log('Chat Store: AI message type check:', {
                  message_type: aiMessage.message_type,
                  isAI: aiMessage.isAI,
                  isUser: aiMessage.isUser,
                  sender_id: aiMessage.sender_id
                })
                
                set(state => ({
                  messages: {
                    ...state.messages,
                    [chatId]: [...(state.messages[chatId] || []), aiMessage]
                  }
                }))
              }
              
              // Update chat's last activity
              set(state => ({
                chats: state.chats.map(chat => 
                  chat.id === chatId 
                    ? { ...chat, lastActivity: new Date(), message_count: chat.message_count + (response.data.ai_response ? 2 : 1) }
                    : chat
                )
              }))
              
              set({ isSending: false })
            } else {
              // Mark message as failed
              set(state => ({
                messages: {
                  ...state.messages,
                  [chatId]: state.messages[chatId]?.map(msg => 
                    msg.id === tempId ? { ...msg, status: 'failed' } : msg
                  ) || []
                },
                error: response.message || 'Failed to send message',
                isSending: false
              }))
            }
          } catch (error) {
            console.error('Chat Store: Send message error:', error)
            
            // Mark message as failed
            let errorMessage = 'Failed to send message'
            
            if (error instanceof Error) {
              errorMessage = error.message
              
              // Check for specific error types
              if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                errorMessage = 'Server error - This might be due to missing OpenAI API key. Please check your AI settings.'
              } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
                errorMessage = 'OpenAI API key not configured. Please set up your API key in Settings.'
              }
            }
            
            set(state => ({
              messages: {
                ...state.messages,
                [chatId]: state.messages[chatId]?.map(msg => 
                  msg.id === tempId ? { ...msg, status: 'failed' } : msg
                ) || []
              },
              error: errorMessage,
              isSending: false
            }))
          }
        },
        
        sendAIMessage: async (chatId, content, streaming = true) => {
          set({ error: null, isSending: true })
          
          try {
            const response = await chatApi.chatWithAI(chatId, {
              message: content,
              stream: streaming,
              save_to_history: true
            })
            
            if (response.success) {
              if (!streaming && response.data.ai_response) {
                // Add AI response directly for non-streaming
                get().addMessage(chatId, response.data.ai_response)
              }
              // For streaming, AI response will come via WebSocket
              set({ isSending: false })
            } else {
              set({ 
                error: response.message || 'Failed to get AI response',
                isSending: false 
              })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to get AI response',
              isSending: false 
            })
          }
        },
        
        addMessage: (chatId, message) => {
          const formattedMessage = {
            ...chatApi.formatMessage(message),
            isStreaming: false
          }
          
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: [...(state.messages[chatId] || []), formattedMessage]
            }
          }))
        },
        
        updateMessage: (chatId, messageId, updates) => {
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId]?.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ) || []
            }
          }))
        },
        
        deleteChat: async (chatId) => {
          set({ isLoading: true, error: null })
          try {
            const response = await chatApi.deleteChat(chatId)
            if (response.success) {
              get().disconnectFromChat(chatId)
              set(state => ({
                chats: state.chats.filter(chat => chat.id !== chatId),
                messages: Object.fromEntries(
                  Object.entries(state.messages).filter(([id]) => id !== chatId)
                ),
                currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
                isLoading: false
              }))
            } else {
              set({ error: response.message || 'Failed to delete chat', isLoading: false })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to delete chat', 
              isLoading: false 
            })
          }
        },
        
        connectToChat: (chatId) => {
          const state = get()
          if (state.connections[chatId]) return // Already connected
          
          // Set connecting status
          set(prevState => ({
            connectionStatus: {
              ...prevState.connectionStatus,
              [chatId]: 'connecting'
            }
          }))
          
          try {
            const ws = chatApi.connectToChat(
              chatId,
              (data) => {
              // Set connected status on first message
              const currentStatus = get().connectionStatus[chatId]
              if (currentStatus !== 'connected') {
                set(prevState => ({
                  connectionStatus: {
                    ...prevState.connectionStatus,
                    [chatId]: 'connected'
                  }
                }))
              }
              
              switch (data.type) {
                case 'welcome':
                  console.log(`Connected to chat ${chatId} as ${data.username}`)
                  break
                  
                case 'new_message':
                  if (data.message.sender_id !== 'current-user') { // Don't duplicate our own messages
                    get().addMessage(chatId, data.message)
                  }
                  break
                  
                case 'ai_response_start':
                  // Handle streaming AI response start
                  if (data.message) {
                    const streamingMessage = {
                      ...chatApi.formatMessage(data.message),
                      isStreaming: true,
                      content: data.message.content || '' // Start with empty or initial content
                    }
                    get().addMessage(chatId, streamingMessage)
                  }
                  break
                  
                case 'ai_response_chunk':
                  // Handle streaming AI response chunks
                  if (data.message_id && data.full_content !== undefined) {
                    get().updateMessage(chatId, data.message_id, {
                      content: data.full_content,
                      isStreaming: true
                    })
                  }
                  break
                  
                case 'ai_response_complete':
                  // Handle streaming AI response completion
                  if (data.message) {
                    const completedMessage = {
                      ...chatApi.formatMessage(data.message),
                      isStreaming: false
                    }
                    get().updateMessage(chatId, data.message.id, completedMessage)
                  }
                  break
                  
                case 'ai_response':
                  // Handle non-streaming AI responses (fallback)
                  if (data.message) {
                    get().addMessage(chatId, data.message)
                  }
                  break
                  
                case 'ai_error':
                  set(prevState => ({ 
                    error: data.error,
                    connectionStatus: {
                      ...prevState.connectionStatus,
                      [chatId]: 'error'
                    }
                  }))
                  
                  // Remove any streaming message that might be in progress
                  const messages = get().messages[chatId] || []
                  const streamingMessage = messages.find(msg => msg.isStreaming)
                  if (streamingMessage) {
                    get().updateMessage(chatId, streamingMessage.id, { isStreaming: false })
                  }
                  break
                  
                case 'typing_indicator':
                  if (data.user_id) {
                    get().addTypingUser(data.user_id, chatId)
                    // Remove after timeout
                    setTimeout(() => {
                      get().removeTypingUser(data.user_id, chatId)
                    }, 3000)
                  }
                  break
                  
                case 'pong':
                  console.log('Received pong from server', data.server_time)
                  break
                  
                case 'connection_status':
                  set(prevState => ({
                    connectionStatus: {
                      ...prevState.connectionStatus,
                      [chatId]: data.status
                    }
                  }))
                  break
              }
            },
            (error) => {
              console.error('WebSocket error:', error)
              
              let errorMessage = 'Connection lost. Attempting to reconnect...'
              
              // Handle specific error types
              if (error instanceof Error) {
                if (error.message.includes('authentication') || error.message.includes('token')) {
                  errorMessage = 'Authentication failed. Please log in again.'
                } else if (error.message.includes('Max reconnection attempts')) {
                  errorMessage = 'Unable to connect after multiple attempts. Please check your connection.'
                } else if (error.message.includes('No authentication token')) {
                  errorMessage = 'Authentication required. Redirecting to login...'
                }
              }
              
              set(prevState => ({ 
                error: errorMessage,
                connectionStatus: {
                  ...prevState.connectionStatus,
                  [chatId]: 'error'
                }
              }))
              
              // Stop any streaming messages
              const messages = get().messages[chatId] || []
              messages.forEach(msg => {
                if (msg.isStreaming) {
                  get().updateMessage(chatId, msg.id, { isStreaming: false })
                }
              })
            }
            )
            
            // Store the connection if ws was successfully created
            if (ws) {
              set(state => ({
                connections: {
                  ...state.connections,
                  [chatId]: ws
                }
              }))
            }
          } catch (connectionError) {
            console.error('Failed to create WebSocket connection:', connectionError)
            
            set(prevState => ({
              error: connectionError instanceof Error ? connectionError.message : 'Failed to connect to chat. Please try again.',
              connectionStatus: {
                ...prevState.connectionStatus,
                [chatId]: 'error'
              }
            }))
            
            return // Exit early if connection creation failed
          }
        },
        
        disconnectFromChat: (chatId) => {
          const state = get()
          if (state.connections[chatId]) {
            chatApi.disconnectFromChat(chatId)
            set(state => {
              const { [chatId]: removedConnection, ...restConnections } = state.connections
              const { [chatId]: removedStatus, ...restStatus } = state.connectionStatus
              return { 
                connections: restConnections,
                connectionStatus: restStatus
              }
            })
          }
        },
        
        addTypingUser: (userId, chatId) => {
          set(state => ({
            typingUsers: [
              ...state.typingUsers.filter(user => !(user.userId === userId && user.chatId === chatId)),
              { userId, chatId, timestamp: new Date() }
            ]
          }))
          
          // Remove after 3 seconds
          setTimeout(() => {
            get().removeTypingUser(userId, chatId)
          }, 3000)
        },
        
        removeTypingUser: (userId, chatId) => {
          set(state => ({
            typingUsers: state.typingUsers.filter(user => 
              !(user.userId === userId && user.chatId === chatId)
            )
          }))
        },
        
        clearError: () => set({ error: null }),
        
        reset: () => {
          // Disconnect all WebSocket connections
          const state = get()
          Object.keys(state.connections).forEach(chatId => {
            state.disconnectFromChat(chatId)
          })
          
          set(initialState)
        }
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          chats: state.chats,
          messages: state.messages,
          currentChatId: state.currentChatId
        })
      }
    ),
    { name: 'chat-store' }
  )
)

// Helper hook for current chat data
export const useCurrentChat = () => {
  const { 
    currentChatId, 
    chats, 
    messages, 
    typingUsers, 
    connectionStatus,
    isSending,
    isLoading,
    error
  } = useChatStore()
  
  const currentChat = currentChatId ? chats.find(chat => chat.id === currentChatId) : null
  const currentMessages = currentChatId ? messages[currentChatId] || [] : []
  const currentTypingUsers = typingUsers.filter(user => user.chatId === currentChatId)
  const currentConnectionStatus = currentChatId ? connectionStatus[currentChatId] || 'disconnected' : 'disconnected'
  
  return {
    currentChat,
    currentMessages,
    currentTypingUsers,
    connectionStatus: currentConnectionStatus,
    isConnected: currentConnectionStatus === 'connected',
    isConnecting: currentConnectionStatus === 'connecting',
    hasConnectionError: currentConnectionStatus === 'error',
    isSending,
    isLoading,
    error
  }
}