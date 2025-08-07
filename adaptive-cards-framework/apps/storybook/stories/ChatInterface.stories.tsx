import type { Meta, StoryObj } from '@storybook/react';
import { ChatInterface, ChatMessage } from '@adaptive-cards/chat';
import { useState } from 'react';

// Mock data
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    type: 'text',
    sender: 'bot',
    content: '👋 Hello! I\'m your AI assistant. How can I help you today?',
    timestamp: new Date(Date.now() - 300000),
    status: 'read',
  },
  {
    id: '2',
    type: 'text',
    sender: 'user',
    content: 'Hi! Can you help me with adaptive cards?',
    timestamp: new Date(Date.now() - 240000),
    status: 'read',
  },
  {
    id: '3',
    type: 'text',
    sender: 'bot',
    content: 'Absolutely! I can help you create, customize, and implement adaptive cards. What would you like to know?',
    timestamp: new Date(Date.now() - 180000),
    status: 'read',
    reactions: ['👍', '❤️'],
  },
  {
    id: '4',
    type: 'card',
    sender: 'bot',
    content: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '🎯 Quick Help Options',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: 'Here are some things I can help you with:',
          wrap: true,
        },
        {
          type: 'Container',
          items: [
            { type: 'TextBlock', text: '• Create adaptive card templates', wrap: true },
            { type: 'TextBlock', text: '• Design interactive forms', wrap: true },
            { type: 'TextBlock', text: '• Implement card actions', wrap: true },
            { type: 'TextBlock', text: '• Debug card issues', wrap: true },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🚀 Get Started',
          data: { action: 'getStarted' },
        },
        {
          type: 'Action.Submit',
          title: '📚 View Examples',
          data: { action: 'viewExamples' },
        },
      ],
    },
    timestamp: new Date(Date.now() - 120000),
    status: 'delivered',
  },
  {
    id: '5',
    type: 'text',
    sender: 'user',
    content: 'That\'s exactly what I need! 🎉',
    timestamp: new Date(Date.now() - 60000),
    status: 'sent',
  },
];

const meta: Meta<typeof ChatInterface> = {
  title: 'Chat/ChatInterface',
  component: ChatInterface,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive chat interface component with support for text messages, adaptive cards, reactions, attachments, and various interactive features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    messages: {
      description: 'Array of chat messages to display',
    },
    onSendMessage: {
      description: 'Callback fired when user sends a message',
    },
    onCardAction: {
      description: 'Callback fired when user interacts with card actions',
    },
    features: {
      description: 'Feature flags to enable/disable chat capabilities',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatInterface>;

export const Default: Story = {
  render: () => {
    const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);

    const handleSendMessage = (content: string, attachments?: any[]) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'text',
        sender: 'user',
        content,
        timestamp: new Date(),
        status: 'sending',
        attachments,
      };

      setMessages([...messages, newMessage]);

      // Simulate message status updates
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        ));
      }, 500);

      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'delivered' as const }
            : msg
        ));
      }, 1000);

      // Add bot response
      setTimeout(() => {
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          sender: 'bot',
          content: `Thanks for your message: "${content}". I'm here to help! 🤖`,
          timestamp: new Date(),
          status: 'read',
        };
        setMessages(prev => [...prev, botResponse]);
      }, 2000);
    };

    const handleCardAction = (action: any, inputs: any) => {
      console.log('Card action:', action, inputs);
      
      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'text',
        sender: 'bot',
        content: `Great! You clicked "${action.title}". Let me help you with that! ✨`,
        timestamp: new Date(),
        status: 'read',
      };
      
      setMessages(prev => [...prev, responseMessage]);
    };

    const handleReaction = (messageId: string, reaction: string) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const hasReaction = reactions.includes(reaction);
          return {
            ...msg,
            reactions: hasReaction 
              ? reactions.filter(r => r !== reaction)
              : [...reactions, reaction]
          };
        }
        return msg;
      }));
    };

    return (
      <div className="h-screen">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onCardAction={handleCardAction}
          onReaction={handleReaction}
          currentUser={{
            id: 'user1',
            name: 'John Doe',
            avatar: '👤',
          }}
        />
      </div>
    );
  },
};

export const WithAllFeatures: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Chat interface with all features enabled including reactions, editing, attachments, voice input, and smart suggestions.',
      },
    },
  },
  render: () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: '1',
        type: 'text',
        sender: 'bot',
        content: '🎉 Welcome to the enhanced chat experience! Try out all the features:',
        timestamp: new Date(Date.now() - 60000),
        status: 'read',
      },
      {
        id: '2',
        type: 'text',
        sender: 'bot',
        content: '• React with emojis 😊\n• Edit your messages ✏️\n• Send attachments 📎\n• Use voice input 🎤\n• Get smart suggestions ✨',
        timestamp: new Date(Date.now() - 30000),
        status: 'read',
        reactions: ['🔥', '💯'],
      },
    ]);

    const handleSendMessage = (content: string, attachments?: any[]) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'text',
        sender: 'user',
        content,
        timestamp: new Date(),
        status: 'sending',
        attachments,
      };

      setMessages([...messages, newMessage]);

      // Simulate delivery
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'delivered' as const }
            : msg
        ));

        // Add contextual bot response
        const responses = [
          "That's interesting! Tell me more. 🤔",
          "I understand! How can I help with that? 🚀",
          "Great message! What would you like to explore next? ✨",
          "Thanks for sharing! Let's dive deeper. 🔍",
        ];

        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          sender: 'bot',
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          status: 'read',
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, botResponse]);
        }, 1000);
      }, 800);
    };

    return (
      <div className="h-screen">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onCardAction={(action, inputs) => console.log('Action:', action, inputs)}
          onReaction={(messageId, reaction) => {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                const reactions = msg.reactions || [];
                const hasReaction = reactions.includes(reaction);
                return {
                  ...msg,
                  reactions: hasReaction 
                    ? reactions.filter(r => r !== reaction)
                    : [...reactions, reaction]
                };
              }
              return msg;
            }));
          }}
          onEditMessage={(messageId, newContent) => {
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: newContent }
                : msg
            ));
          }}
          onDeleteMessage={(messageId) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
          }}
          features={{
            reactions: true,
            editing: true,
            attachments: true,
            voiceInput: true,
            smartSuggestions: true,
            readReceipts: true,
          }}
          currentUser={{
            id: 'user1',
            name: 'Chat User',
            avatar: '😊',
          }}
        />
      </div>
    );
  },
};

export const BasicTextOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Simplified chat interface with only basic text messaging features.',
      },
    },
  },
  render: () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: '1',
        type: 'text',
        sender: 'bot',
        content: 'Hello! This is a simple text-only chat interface.',
        timestamp: new Date(Date.now() - 60000),
        status: 'read',
      },
    ]);

    const handleSendMessage = (content: string) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'text',
        sender: 'user',
        content,
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages([...messages, newMessage]);

      // Simple echo response
      setTimeout(() => {
        const echoMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          sender: 'bot',
          content: `Echo: ${content}`,
          timestamp: new Date(),
          status: 'read',
        };
        setMessages(prev => [...prev, echoMessage]);
      }, 1000);
    };

    return (
      <div className="h-screen">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          features={{
            reactions: false,
            editing: false,
            attachments: false,
            voiceInput: false,
            smartSuggestions: false,
            readReceipts: false,
          }}
        />
      </div>
    );
  },
};

export const WithTypingIndicator: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Chat interface demonstrating typing indicators and message states.',
      },
    },
  },
  render: () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: '1',
        type: 'text',
        sender: 'bot',
        content: 'Try sending a message and watch for the typing indicator! ⌨️',
        timestamp: new Date(Date.now() - 60000),
        status: 'read',
      },
    ]);

    const [isTyping, setIsTyping] = useState(false);

    const handleSendMessage = (content: string) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'text',
        sender: 'user',
        content,
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages([...messages, newMessage]);

      // Update status to sent
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        ));

        // Show typing indicator
        setIsTyping(true);
        const typingMessage: ChatMessage = {
          id: 'typing',
          type: 'typing',
          sender: 'bot',
          content: '',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, typingMessage]);
      }, 500);

      // Remove typing and add response
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => {
          const withoutTyping = prev.filter(msg => msg.id !== 'typing');
          const response: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'text',
            sender: 'bot',
            content: `I received your message: "${content}". Thanks for testing the typing indicator! 🎯`,
            timestamp: new Date(),
            status: 'read',
          };
          return [...withoutTyping, response];
        });

        // Mark user message as delivered and read
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'read' as const }
              : msg
          ));
        }, 1000);
      }, 2500);
    };

    const handleTyping = (typing: boolean) => {
      // Handle user typing state if needed
      console.log('User is typing:', typing);
    };

    return (
      <div className="h-screen">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          features={{
            reactions: true,
            editing: false,
            attachments: false,
            voiceInput: false,
            smartSuggestions: true,
            readReceipts: true,
          }}
          currentUser={{
            id: 'user1',
            name: 'Test User',
            avatar: '🧪',
          }}
        />
      </div>
    );
  },
};