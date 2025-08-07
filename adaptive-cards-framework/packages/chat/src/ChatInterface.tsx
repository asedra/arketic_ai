import React, { useState, useRef, useEffect } from 'react';
import { AdaptiveCard } from '@adaptive-cards/core';
import { AdaptiveCardRenderer } from '@adaptive-cards/react';

// Chat Message Types
export interface ChatMessage {
  id: string;
  type: 'text' | 'card' | 'typing' | 'system';
  sender: 'user' | 'bot' | 'system';
  content: string | AdaptiveCard;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  reactions?: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size?: number;
  thumbnail?: string;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, attachments?: Attachment[]) => void;
  onCardAction?: (action: any, inputs: any) => void;
  onTyping?: (isTyping: boolean) => void;
  onReaction?: (messageId: string, reaction: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  features?: {
    reactions?: boolean;
    editing?: boolean;
    attachments?: boolean;
    voiceInput?: boolean;
    smartSuggestions?: boolean;
    readReceipts?: boolean;
  };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onCardAction,
  onTyping,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  currentUser,
  features = {
    reactions: true,
    editing: true,
    attachments: true,
    voiceInput: false,
    smartSuggestions: true,
    readReceipts: true,
  },
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (inputValue && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    } else if (!inputValue && isTyping) {
      setIsTyping(false);
      onTyping?.(false);
    }
  }, [inputValue, isTyping, onTyping]);

  // Generate smart suggestions based on context
  useEffect(() => {
    if (features.smartSuggestions && messages.length > 0) {
      const lastBotMessage = messages
        .filter(m => m.sender === 'bot')
        .slice(-1)[0];
      
      if (lastBotMessage && typeof lastBotMessage.content === 'string') {
        // Simple suggestion logic - can be enhanced with AI
        if (lastBotMessage.content.toLowerCase().includes('help')) {
          setSuggestions(['Yes, please help', 'No, I got it', 'Tell me more']);
        } else if (lastBotMessage.content.toLowerCase().includes('confirm')) {
          setSuggestions(['Confirm', 'Cancel', 'Need more info']);
        } else {
          setSuggestions(['Thanks!', 'Got it', 'What else?']);
        }
      }
    }
  }, [messages, features.smartSuggestions]);

  const handleSend = () => {
    if (inputValue.trim() || attachments.length > 0) {
      // Haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      onSendMessage(inputValue.trim(), attachments);
      setInputValue('');
      setAttachments([]);
      setIsTyping(false);
      onTyping?.(false);

      // Play send sound (optional)
      playSound('send');

      // Confetti for special messages
      if (inputValue.includes('🎉') || inputValue.toLowerCase().includes('congratulations')) {
        triggerConfetti();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map(file => ({
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'file',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleVoiceRecord = async () => {
    if (!features.voiceInput) return;

    if (!isRecording) {
      setIsRecording(true);
      // Start recording logic
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
    } else {
      setIsRecording(false);
      // Stop recording and process
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (features.reactions) {
      onReaction?.(messageId, emoji);
      // Animation for reaction
      const element = document.getElementById(`message-${messageId}`);
      element?.classList.add('reaction-bounce');
      setTimeout(() => element?.classList.remove('reaction-bounce'), 500);
    }
  };

  const playSound = (type: 'send' | 'receive' | 'error') => {
    // Optional sound effects
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const triggerConfetti = () => {
    // Confetti animation for celebrations
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.animationDelay = `${Math.random() * 2}s`;
      confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#ffd93d'][Math.floor(Math.random() * 5)];
      confettiContainer.appendChild(confetti);
    }

    setTimeout(() => confettiContainer.remove(), 3000);
  };

  return (
    <div className="chat-interface">
      {/* Messages Area */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={message.id}
            id={`message-${message.id}`}
            className={`message-wrapper ${message.sender} ${
              selectedMessage === message.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedMessage(message.id)}
            style={{
              animation: 'slideInFromBottom 0.3s ease-out',
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both',
            }}
          >
            {/* Avatar */}
            {message.sender !== 'system' && (
              <div className="avatar">
                {message.sender === 'user' ? currentUser?.avatar || '👤' : '🤖'}
              </div>
            )}

            {/* Message Content */}
            <div className="message-content">
              {message.type === 'typing' ? (
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              ) : message.type === 'card' ? (
                <div className="card-message">
                  <AdaptiveCardRenderer
                    card={message.content as AdaptiveCard}
                    onAction={onCardAction}
                  />
                </div>
              ) : (
                <div className="text-message">
                  {message.content as string}
                </div>
              )}

              {/* Timestamp & Status */}
              <div className="message-meta">
                <span className="timestamp">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {features.readReceipts && message.sender === 'user' && (
                  <span className={`status ${message.status}`}>
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && <span className="read">✓✓</span>}
                  </span>
                )}
              </div>

              {/* Reactions */}
              {features.reactions && message.reactions && message.reactions.length > 0 && (
                <div className="reactions">
                  {message.reactions.map((reaction, i) => (
                    <span 
                      key={i} 
                      className="reaction"
                      onClick={() => handleReaction(message.id, reaction)}
                    >
                      {reaction}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Message Actions */}
            {selectedMessage === message.id && (
              <div className="message-actions">
                {features.reactions && (
                  <button 
                    className="action-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😊
                  </button>
                )}
                {features.editing && message.sender === 'user' && (
                  <button 
                    className="action-btn"
                    onClick={() => onEditMessage?.(message.id, message.content as string)}
                  >
                    ✏️
                  </button>
                )}
                {message.sender === 'user' && (
                  <button 
                    className="action-btn delete"
                    onClick={() => onDeleteMessage?.(message.id)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Suggestions */}
      {features.smartSuggestions && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => {
                setInputValue(suggestion);
                inputRef.current?.focus();
              }}
              style={{
                animation: 'fadeInUp 0.3s ease-out',
                animationDelay: `${i * 0.1}s`,
                animationFillMode: 'both',
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((attachment, i) => (
            <div key={i} className="attachment-item">
              {attachment.type === 'image' ? (
                <img src={attachment.url} alt={attachment.name} />
              ) : (
                <div className="file-icon">📎</div>
              )}
              <span>{attachment.name}</span>
              <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        {features.attachments && (
          <>
            <button 
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFileSelect}
            />
          </>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-input"
        />

        {features.voiceInput && (
          <button 
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleVoiceRecord}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
        )}

        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() && attachments.length === 0}
        >
          <span className="send-icon">➤</span>
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {['😊', '❤️', '👍', '😂', '🎉', '🔥', '💯', '🤔'].map(emoji => (
            <span
              key={emoji}
              className="emoji-option"
              onClick={() => {
                if (selectedMessage) {
                  handleReaction(selectedMessage, emoji);
                  setShowEmojiPicker(false);
                }
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};