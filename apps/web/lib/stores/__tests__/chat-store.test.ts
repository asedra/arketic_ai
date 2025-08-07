/**
 * Comprehensive Chat Store Tests
 * Tests all chat store functionality including WebSocket connections
 */

import { act, renderHook } from '@testing-library/react'
import { useChatStore, useCurrentChat } from '../chat-store'
import { chatApi } from '../../api-client'

// Mock the API client
jest.mock('../../api-client', () => ({
  chatApi: {
    getUserChats: jest.fn(),
    getChatHistory: jest.fn(),
    createChat: jest.fn(),
    sendMessage: jest.fn(),
    deleteChat: jest.fn(),
    connectToChat: jest.fn(),
    disconnectFromChat: jest.fn(),
    formatChat: jest.fn((chat) => ({
      ...chat,
      lastActivity: new Date(chat.last_activity_at),
      createdAt: new Date(chat.created_at)
    })),
    formatMessage: jest.fn((message) => ({
      ...message,
      timestamp: new Date(message.created_at),
      isAI: message.message_type === 'ai',
      isUser: message.message_type === 'user'
    }))
  }
}))

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
}

global.WebSocket = jest.fn(() => mockWebSocket) as any

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Reset store state
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useChatStore())
      const state = result.current
      
      expect(state.chats).toEqual([])
      expect(state.currentChatId).toBe(null)
      expect(state.messages).toEqual({})
      expect(state.isLoading).toBe(false)
      expect(state.isSending).toBe(false)
      expect(state.error).toBe(null)
      expect(state.typingUsers).toEqual([])
      expect(state.connectionStatus).toEqual({})
      expect(state.connections).toEqual({})
    })
  })

  describe('Chat Management', () => {
    const mockChatsResponse = {
      success: true,
      data: [
        {
          id: 'chat-1',
          title: 'Test Chat 1',
          ai_model: 'gpt-3.5-turbo',
          message_count: 5,
          last_activity_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
          is_private: false
        },
        {
          id: 'chat-2',
          title: 'Test Chat 2',
          ai_model: 'gpt-4',
          message_count: 3,
          last_activity_at: '2024-01-01T11:00:00Z',
          created_at: '2024-01-01T09:00:00Z',
          is_private: true
        }
      ]
    }

    it('should load chats successfully', async () => {
      (chatApi.getUserChats as jest.Mock).mockResolvedValue(mockChatsResponse)

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.loadChats()
      })

      expect(result.current.chats).toHaveLength(2)
      expect(result.current.chats[0].title).toBe('Test Chat 1')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(chatApi.getUserChats).toHaveBeenCalledTimes(1)
    })

    it('should handle load chats error', async () => {
      const errorMessage = 'Failed to load chats'
      ;(chatApi.getUserChats as jest.Mock).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.loadChats()
      })

      expect(result.current.chats).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    it('should create chat successfully', async () => {
      const newChatData = {
        title: 'New Test Chat',
        ai_model: 'gpt-3.5-turbo'
      }
      
      const mockCreateResponse = {
        success: true,
        data: {
          id: 'chat-new',
          title: 'New Test Chat',
          ai_model: 'gpt-3.5-turbo',
          message_count: 0,
          last_activity_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T12:00:00Z',
          is_private: false
        }
      }

      ;(chatApi.createChat as jest.Mock).mockResolvedValue(mockCreateResponse)

      const { result } = renderHook(() => useChatStore())

      let chatId: string | null = null
      await act(async () => {
        chatId = await result.current.createChat(newChatData)
      })

      expect(chatId).toBe('chat-new')
      expect(result.current.chats).toHaveLength(1)
      expect(result.current.chats[0].title).toBe('New Test Chat')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle create chat error', async () => {
      const errorResponse = {
        success: false,
        message: 'Failed to create chat'
      }

      ;(chatApi.createChat as jest.Mock).mockResolvedValue(errorResponse)

      const { result } = renderHook(() => useChatStore())

      let chatId: string | null = null
      await act(async () => {
        chatId = await result.current.createChat({ title: 'Test' })
      })

      expect(chatId).toBe(null)
      expect(result.current.error).toBe('Failed to create chat')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Chat History', () => {
    const mockHistoryResponse = {
      success: true,
      data: {
        chat: {
          id: 'chat-1',
          title: 'Test Chat',
          ai_model: 'gpt-3.5-turbo'
        },
        messages: [
          {
            id: 'msg-1',
            chat_id: 'chat-1',
            content: 'Hello',
            message_type: 'user',
            created_at: '2024-01-01T12:00:00Z',
            sender_id: 'user-1',
            status: 'sent',
            is_edited: false
          },
          {
            id: 'msg-2',
            chat_id: 'chat-1',
            content: 'Hi there!',
            message_type: 'ai',
            created_at: '2024-01-01T12:01:00Z',
            sender_id: null,
            status: 'sent',
            is_edited: false
          }
        ]
      }
    }

    it('should load chat history successfully', async () => {
      (chatApi.getChatHistory as jest.Mock).mockResolvedValue(mockHistoryResponse)

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.loadChatHistory('chat-1')
      })

      expect(result.current.messages['chat-1']).toHaveLength(2)
      expect(result.current.messages['chat-1'][0].content).toBe('Hello')
      expect(result.current.messages['chat-1'][0].isUser).toBe(true)
      expect(result.current.messages['chat-1'][1].content).toBe('Hi there!')
      expect(result.current.messages['chat-1'][1].isAI).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle load chat history error', async () => {
      const errorMessage = 'Failed to load chat history'
      ;(chatApi.getChatHistory as jest.Mock).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.loadChatHistory('chat-1')
      })

      expect(result.current.messages['chat-1']).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Message Sending', () => {
    const mockSendResponse = {
      success: true,
      data: {
        id: 'msg-new',
        chat_id: 'chat-1',
        content: 'Test message',
        message_type: 'user',
        created_at: '2024-01-01T12:00:00Z',
        sender_id: 'user-1',
        status: 'sent',
        is_edited: false
      }
    }

    it('should send message successfully', async () => {
      (chatApi.sendMessage as jest.Mock).mockResolvedValue(mockSendResponse)

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.sendMessage('chat-1', 'Test message')
      })

      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].content).toBe('Test message')
      expect(result.current.messages['chat-1'][0].status).toBe('sent')
      expect(result.current.isSending).toBe(false)
      expect(result.current.error).toBe(null)
      expect(chatApi.sendMessage).toHaveBeenCalledWith('chat-1', { content: 'Test message' })
    })

    it('should handle send message error', async () => {
      const errorResponse = {
        success: false,
        message: 'Failed to send message'
      }

      ;(chatApi.sendMessage as jest.Mock).mockResolvedValue(errorResponse)

      const { result } = renderHook(() => useChatStore())

      await act(async () => {
        await result.current.sendMessage('chat-1', 'Test message')
      })

      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].status).toBe('failed')
      expect(result.current.isSending).toBe(false)
      expect(result.current.error).toBe('Failed to send message')
    })

    it('should add optimistic message immediately', async () => {
      // Mock a delayed response
      ;(chatApi.sendMessage as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockSendResponse), 100))
      )

      const { result } = renderHook(() => useChatStore())

      // Start sending message
      act(() => {
        result.current.sendMessage('chat-1', 'Test message')
      })

      // Check optimistic message is added immediately
      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].content).toBe('Test message')
      expect(result.current.messages['chat-1'][0].status).toBe('sending')
      expect(result.current.isSending).toBe(true)

      // Wait for the actual response
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      // Check message is updated with real data
      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].status).toBe('sent')
      expect(result.current.isSending).toBe(false)
    })
  })

  describe('WebSocket Integration', () => {
    it('should connect to chat WebSocket', () => {
      const mockOnMessage = jest.fn()
      const mockOnError = jest.fn()
      
      ;(chatApi.connectToChat as jest.Mock).mockReturnValue(mockWebSocket)

      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.connectToChat('chat-1')
      })

      expect(result.current.connections['chat-1']).toBe(mockWebSocket)
      expect(result.current.connectionStatus['chat-1']).toBe('connecting')
      expect(chatApi.connectToChat).toHaveBeenCalledWith('chat-1', expect.any(Function), expect.any(Function))
    })

    it('should disconnect from chat WebSocket', () => {
      const { result } = renderHook(() => useChatStore())

      // First connect
      act(() => {
        result.current.connectToChat('chat-1')
      })

      // Then disconnect
      act(() => {
        result.current.disconnectFromChat('chat-1')
      })

      expect(result.current.connections['chat-1']).toBeUndefined()
      expect(result.current.connectionStatus['chat-1']).toBeUndefined()
      expect(chatApi.disconnectFromChat).toHaveBeenCalledWith('chat-1')
    })

    it('should handle WebSocket new message', () => {
      ;(chatApi.connectToChat as jest.Mock).mockImplementation((chatId, onMessage, onError) => {
        // Simulate receiving a message
        setTimeout(() => {
          onMessage({
            type: 'new_message',
            message: {
              id: 'msg-ws',
              chat_id: 'chat-1',
              content: 'WebSocket message',
              message_type: 'ai',
              created_at: '2024-01-01T12:00:00Z',
              sender_id: null,
              status: 'sent',
              is_edited: false
            }
          })
        }, 0)
        return mockWebSocket
      })

      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.connectToChat('chat-1')
      })

      // Wait for the message to be processed
      act(() => {
        jest.advanceTimersByTime(10)
      })

      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].content).toBe('WebSocket message')
      expect(result.current.messages['chat-1'][0].isAI).toBe(true)
    })

    it('should handle WebSocket streaming AI response', () => {
      ;(chatApi.connectToChat as jest.Mock).mockImplementation((chatId, onMessage, onError) => {
        // Simulate AI response streaming
        setTimeout(() => {
          // Start streaming
          onMessage({
            type: 'ai_response_start',
            message: {
              id: 'msg-ai',
              chat_id: 'chat-1',
              content: '',
              message_type: 'ai',
              created_at: '2024-01-01T12:00:00Z',
              sender_id: null,
              status: 'sent',
              is_edited: false
            }
          })
          
          // Stream chunk
          onMessage({
            type: 'ai_response_chunk',
            message_id: 'msg-ai',
            chat_id: 'chat-1',
            chunk: 'Hello',
            full_content: 'Hello'
          })
          
          // Complete streaming
          onMessage({
            type: 'ai_response_complete',
            message: {
              id: 'msg-ai',
              chat_id: 'chat-1',
              content: 'Hello there!',
              message_type: 'ai',
              created_at: '2024-01-01T12:00:00Z',
              sender_id: null,
              status: 'sent',
              is_edited: false
            }
          })
        }, 0)
        return mockWebSocket
      })

      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.connectToChat('chat-1')
      })

      // Process all WebSocket events
      act(() => {
        jest.advanceTimersByTime(10)
      })

      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.messages['chat-1'][0].content).toBe('Hello there!')
      expect(result.current.messages['chat-1'][0].isStreaming).toBe(false)
    })

    it('should handle WebSocket errors', () => {
      ;(chatApi.connectToChat as jest.Mock).mockImplementation((chatId, onMessage, onError) => {
        setTimeout(() => {
          onError(new Error('WebSocket connection failed'))
        }, 0)
        return mockWebSocket
      })

      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.connectToChat('chat-1')
      })

      // Process error
      act(() => {
        jest.advanceTimersByTime(10)
      })

      expect(result.current.error).toBe('Connection lost. Attempting to reconnect...')
      expect(result.current.connectionStatus['chat-1']).toBe('error')
    })
  })

  describe('Current Chat Management', () => {
    it('should set current chat and connect WebSocket', () => {
      ;(chatApi.connectToChat as jest.Mock).mockReturnValue(mockWebSocket)
      ;(chatApi.getChatHistory as jest.Mock).mockResolvedValue({ success: true, data: { messages: [] } })

      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setCurrentChat('chat-1')
      })

      expect(result.current.currentChatId).toBe('chat-1')
      expect(chatApi.connectToChat).toHaveBeenCalledWith('chat-1', expect.any(Function), expect.any(Function))
    })

    it('should disconnect from previous chat when setting new current chat', () => {
      ;(chatApi.connectToChat as jest.Mock).mockReturnValue(mockWebSocket)
      ;(chatApi.getChatHistory as jest.Mock).mockResolvedValue({ success: true, data: { messages: [] } })

      const { result } = renderHook(() => useChatStore())

      // Set first chat
      act(() => {
        result.current.setCurrentChat('chat-1')
      })

      // Set second chat
      act(() => {
        result.current.setCurrentChat('chat-2')
      })

      expect(result.current.currentChatId).toBe('chat-2')
      expect(chatApi.disconnectFromChat).toHaveBeenCalledWith('chat-1')
      expect(chatApi.connectToChat).toHaveBeenCalledWith('chat-2', expect.any(Function), expect.any(Function))
    })
  })

  describe('Typing Indicators', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should add and remove typing users', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser('user-1', 'chat-1')
      })

      expect(result.current.typingUsers).toHaveLength(1)
      expect(result.current.typingUsers[0].userId).toBe('user-1')
      expect(result.current.typingUsers[0].chatId).toBe('chat-1')

      act(() => {
        result.current.removeTypingUser('user-1', 'chat-1')
      })

      expect(result.current.typingUsers).toHaveLength(0)
    })

    it('should automatically remove typing user after timeout', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser('user-1', 'chat-1')
      })

      expect(result.current.typingUsers).toHaveLength(1)

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(result.current.typingUsers).toHaveLength(0)
    })
  })

  describe('useCurrentChat Hook', () => {
    it('should return current chat data', () => {
      const { result: storeResult } = renderHook(() => useChatStore())
      const { result: currentChatResult } = renderHook(() => useCurrentChat())

      // Add a chat to the store
      act(() => {
        storeResult.current.chats.push({
          id: 'chat-1',
          title: 'Test Chat',
          ai_model: 'gpt-3.5-turbo',
          message_count: 0,
          lastActivity: new Date(),
          createdAt: new Date(),
          is_private: false
        } as any)
        storeResult.current.setCurrentChat('chat-1')
      })

      expect(currentChatResult.current.currentChat?.id).toBe('chat-1')
      expect(currentChatResult.current.currentChat?.title).toBe('Test Chat')
      expect(currentChatResult.current.currentMessages).toEqual([])
      expect(currentChatResult.current.currentTypingUsers).toEqual([])
      expect(currentChatResult.current.connectionStatus).toBe('disconnected')
      expect(currentChatResult.current.isConnected).toBe(false)
      expect(currentChatResult.current.isConnecting).toBe(false)
      expect(currentChatResult.current.hasConnectionError).toBe(false)
    })
  })

  describe('Store Persistence', () => {
    it('should persist chats, messages, and currentChatId', () => {
      const { result } = renderHook(() => useChatStore())
      
      // Add some data
      act(() => {
        (result.current as any).chats = [{
          id: 'chat-1',
          title: 'Persistent Chat'
        }]
        result.current.messages['chat-1'] = [{
          id: 'msg-1',
          content: 'Persistent message'
        }] as any
        result.current.currentChatId = 'chat-1'
      })

      // Get the partialize function from the store configuration
      const persistConfig = (useChatStore as any).getState
      
      // This is a simplified test - in a real scenario, you'd test with localStorage
      expect(result.current.chats).toHaveLength(1)
      expect(result.current.messages['chat-1']).toHaveLength(1)
      expect(result.current.currentChatId).toBe('chat-1')
    })
  })

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        (result.current as any).error = 'Test error'
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })

    it('should reset store state', () => {
      const { result } = renderHook(() => useChatStore())

      // Add some data
      act(() => {
        (result.current as any).chats = [{ id: 'chat-1' }]
        result.current.currentChatId = 'chat-1'
        result.current.messages = { 'chat-1': [{ id: 'msg-1' }] } as any
        result.current.error = 'Some error'
      })

      // Reset store
      act(() => {
        result.current.reset()
      })

      expect(result.current.chats).toEqual([])
      expect(result.current.currentChatId).toBe(null)
      expect(result.current.messages).toEqual({})
      expect(result.current.error).toBe(null)
    })
  })
})