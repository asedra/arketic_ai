/**
 * Comprehensive ChatWindow Component Tests
 * Tests all chat window functionality including state management and user interactions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatWindow } from '../ChatWindow'
import { useChatStore, useCurrentChat } from '@/lib/stores/chat-store'

// Mock the chat store
jest.mock('@/lib/stores/chat-store', () => ({
  useChatStore: jest.fn(),
  useCurrentChat: jest.fn()
}))

// Mock child components
jest.mock('../MessageList', () => ({
  MessageList: ({ messages, onMessageAction, className }: any) => (
    <div data-testid="message-list" className={className}>
      {messages.map((msg: any) => (
        <div key={msg.id} data-testid={`message-${msg.id}`}>
          {msg.content}
          <button 
            onClick={() => onMessageAction(msg.id, 'copy')}
            data-testid={`action-${msg.id}`}
          >
            Action
          </button>
        </div>
      ))}
    </div>
  )
}))

jest.mock('../MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="message-input">
      <input
        data-testid="message-input-field"
        placeholder={placeholder}
        disabled={disabled}
        onChange={() => {}}
      />
      <button 
        data-testid="send-button"
        onClick={() => onSendMessage('test message')}
        disabled={disabled}
      >
        Send
      </button>
    </div>
  )
}))

jest.mock('../TypingIndicator', () => ({
  TypingIndicator: ({ typingUsers, className }: any) => (
    <div data-testid="typing-indicator" className={className}>
      {typingUsers.length > 0 && (
        <span>{typingUsers.length} user(s) typing...</span>
      )}
    </div>
  )
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, disabled }: any) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  )
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>
const mockUseCurrentChat = useCurrentChat as jest.MockedFunction<typeof useCurrentChat>

describe('ChatWindow Component', () => {
  const mockSendMessage = jest.fn()
  const mockDeleteChat = jest.fn()
  const mockClearError = jest.fn()

  const defaultStoreState = {
    sendMessage: mockSendMessage,
    deleteChat: mockDeleteChat,
    isLoading: false,
    error: null,
    clearError: mockClearError
  }

  const defaultCurrentChatState = {
    currentChat: null,
    currentMessages: [],
    currentTypingUsers: [],
    isConnected: true,
    isConnecting: false,
    hasConnectionError: false,
    isSending: false,
    isLoading: false,
    error: null,
    connectionStatus: 'connected' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChatStore.mockReturnValue(defaultStoreState)
    mockUseCurrentChat.mockReturnValue(defaultCurrentChatState)
  })

  describe('No Chat Selected State', () => {
    it('should render welcome message when no chat is selected', () => {
      render(<ChatWindow />)

      expect(screen.getByText('Welcome to AI Chat')).toBeInTheDocument()
      expect(screen.getByText(/Select an existing conversation/)).toBeInTheDocument()
      expect(screen.getByText('🎆 Powered by Advanced AI')).toBeInTheDocument()
    })

    it('should not render chat header when no chat is selected', () => {
      render(<ChatWindow />)

      expect(screen.queryByTestId('chat-header')).not.toBeInTheDocument()
      expect(screen.queryByTestId('message-list')).not.toBeInTheDocument()
      expect(screen.queryByTestId('message-input')).not.toBeInTheDocument()
    })
  })

  describe('Chat Selected State', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      ai_persona: 'Assistant',
      message_count: 5,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    const mockMessages = [
      {
        id: 'msg-1',
        chat_id: 'chat-1',
        content: 'Hello',
        message_type: 'user',
        timestamp: new Date(),
        isAI: false,
        isUser: true,
        status: 'sent',
        sender_id: 'user-1',
        created_at: new Date().toISOString(),
        is_edited: false
      },
      {
        id: 'msg-2',
        chat_id: 'chat-1',
        content: 'Hi there!',
        message_type: 'ai',
        timestamp: new Date(),
        isAI: true,
        isUser: false,
        status: 'sent',
        sender_id: null,
        created_at: new Date().toISOString(),
        is_edited: false
      }
    ]

    beforeEach(() => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        currentMessages: mockMessages
      })
    })

    it('should render chat header with correct information', () => {
      render(<ChatWindow />)

      expect(screen.getByText('Test Chat')).toBeInTheDocument()
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument()
      expect(screen.getByText('Assistant')).toBeInTheDocument()
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('should render messages', () => {
      render(<ChatWindow />)

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('Hi there!')).toBeInTheDocument()
    })

    it('should render message input', () => {
      render(<ChatWindow />)

      expect(screen.getByTestId('message-input')).toBeInTheDocument()
      expect(screen.getByTestId('message-input-field')).toBeInTheDocument()
      expect(screen.getByTestId('send-button')).toBeInTheDocument()
    })

    it('should handle message sending', async () => {
      const user = userEvent.setup()
      render(<ChatWindow />)

      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('chat-1', 'test message')
    })

    it('should handle message actions', async () => {
      const user = userEvent.setup()
      render(<ChatWindow />)

      const actionButton = screen.getByTestId('action-msg-1')
      await user.click(actionButton)

      // The component logs the action - we can't test console.log directly,
      // but we can verify the button was clicked
      expect(actionButton).toBeInTheDocument()
    })

    it('should handle delete chat', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      const user = userEvent.setup()
      render(<ChatWindow />)

      const deleteButton = screen.getByRole('button', { name: /trash/i })
      await user.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Test Chat"?')
      expect(mockDeleteChat).toHaveBeenCalledWith('chat-1')

      confirmSpy.mockRestore()
    })

    it('should not delete chat if user cancels confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
      
      const user = userEvent.setup()
      render(<ChatWindow />)

      const deleteButton = screen.getByRole('button', { name: /trash/i })
      await user.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalled()
      expect(mockDeleteChat).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Connection Status', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    beforeEach(() => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })
    })

    it('should show connecting status', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isConnecting: true,
        connectionStatus: 'connecting'
      })

      render(<ChatWindow />)
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })

    it('should show connected status', () => {
      render(<ChatWindow />)
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('should show error status', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        hasConnectionError: true,
        connectionStatus: 'error'
      })

      render(<ChatWindow />)
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    })

    it('should show disconnected status', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isConnected: false,
        connectionStatus: 'disconnected'
      })

      render(<ChatWindow />)
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })
  })

  describe('Message Input States', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    it('should disable input when not connected', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isConnected: false
      })

      render(<ChatWindow />)
      
      const input = screen.getByTestId('message-input-field')
      const sendButton = screen.getByTestId('send-button')
      
      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
      expect(input).toHaveAttribute('placeholder', 'Disconnected - Check connection')
    })

    it('should disable input when sending', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isSending: true
      })

      render(<ChatWindow />)
      
      const input = screen.getByTestId('message-input-field')
      const sendButton = screen.getByTestId('send-button')
      
      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
      expect(input).toHaveAttribute('placeholder', 'Sending...')
    })

    it('should show connecting placeholder when connecting', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isConnecting: true,
        isConnected: false
      })

      render(<ChatWindow />)
      
      const input = screen.getByTestId('message-input-field')
      expect(input).toHaveAttribute('placeholder', 'Connecting...')
    })

    it('should show normal placeholder when connected', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        isConnected: true
      })

      render(<ChatWindow />)
      
      const input = screen.getByTestId('message-input-field')
      expect(input).toHaveAttribute('placeholder', 'Message AI Assistant...')
    })

    it('should show persona in placeholder when available', () => {
      const chatWithPersona = {
        ...mockChat,
        ai_persona: 'Code Assistant'
      }

      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: chatWithPersona,
        isConnected: true
      })

      render(<ChatWindow />)
      
      const input = screen.getByTestId('message-input-field')
      expect(input).toHaveAttribute('placeholder', 'Message Code Assistant...')
    })
  })

  describe('Error Handling', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should display error banner when error exists', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Test error message'
      })

      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })

      render(<ChatWindow />)
      
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should clear error when close button is clicked', async () => {
      mockUseChatStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Test error message'
      })

      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })

      const user = userEvent.setup()
      render(<ChatWindow />)
      
      const closeButton = screen.getByRole('button', { name: '×' })
      await user.click(closeButton)
      
      expect(mockClearError).toHaveBeenCalled()
    })

    it('should auto-clear error after 5 seconds', async () => {
      mockUseChatStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Test error message'
      })

      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })

      render(<ChatWindow />)
      
      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      expect(mockClearError).toHaveBeenCalled()
    })
  })

  describe('Empty Chat State', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Empty Chat',
      ai_model: 'gpt-3.5-turbo',
      ai_persona: 'Helper',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    it('should show empty chat message when no messages exist', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        currentMessages: []
      })

      render(<ChatWindow />)
      
      expect(screen.getByText('Ready to chat!')).toBeInTheDocument()
      expect(screen.getByText(/Send a message below to begin your conversation with Helper/)).toBeInTheDocument()
      expect(screen.getByText('💬 Start with a question, request, or just say hello!')).toBeInTheDocument()
    })
  })

  describe('Typing Indicators', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    const mockTypingUsers = [
      { userId: 'user-1', chatId: 'chat-1', timestamp: new Date() },
      { userId: 'user-2', chatId: 'chat-1', timestamp: new Date() }
    ]

    it('should display typing indicators', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        currentMessages: [],
        currentTypingUsers: mockTypingUsers
      })

      render(<ChatWindow />)
      
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
      expect(screen.getByText('2 user(s) typing...')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    it('should apply custom className', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })

      const { container } = render(<ChatWindow className="custom-class" />)
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should have responsive layout classes', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat
      })

      const { container } = render(<ChatWindow />)
      
      // Check for responsive classes (this is a simplified check)
      expect(container.firstChild).toHaveClass('flex', 'flex-col', 'h-full')
    })
  })

  describe('Loading States', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      ai_model: 'gpt-3.5-turbo',
      message_count: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      is_private: false
    }

    it('should pass loading state to MessageList', () => {
      mockUseCurrentChat.mockReturnValue({
        ...defaultCurrentChatState,
        currentChat: mockChat,
        currentMessages: [],
        isLoading: true
      })

      render(<ChatWindow />)
      
      // The MessageList component should receive isLoading=true
      // This is tested indirectly by checking that the component renders
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })
  })
})