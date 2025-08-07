import React, { useState, useRef, useEffect } from 'react';
import { SimpleAdaptiveCardRenderer } from './SimpleCardRenderer';
import { AdvancedCardRenderer } from './AdvancedCardRenderer';
import { JsonImporter } from './components/JsonImporter';

interface Message {
  id: string;
  type: 'text' | 'adaptive-card';
  content: string | any;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface CardAction {
  action: string;
  data: any;
}

export const ArketicChatIntegration: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Arketic operations cards
  const arketicCards = {
    personManagement: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '👥 Person Management',
          size: 'Large',
          weight: 'Bolder',
          color: 'Accent'
        },
        {
          type: 'Container',
          items: [
            {
              type: 'Input.Text',
              id: 'name',
              label: 'Full Name',
              placeholder: 'Enter full name',
              isRequired: true
            },
            {
              type: 'Input.Text',
              id: 'email',
              label: 'Email',
              placeholder: 'email@example.com',
              style: 'Email',
              isRequired: true
            },
            {
              type: 'Input.Text',
              id: 'role',
              label: 'Role',
              placeholder: 'e.g., Software Engineer'
            },
            {
              type: 'Input.ChoiceSet',
              id: 'department',
              label: 'Department',
              placeholder: 'Select department',
              choices: [
                { title: 'Engineering', value: 'engineering' },
                { title: 'Product', value: 'product' },
                { title: 'Design', value: 'design' },
                { title: 'Marketing', value: 'marketing' },
                { title: 'Sales', value: 'sales' },
                { title: 'HR', value: 'hr' }
              ]
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.Submit',
              title: '✅ Add Person',
              style: 'positive',
              data: { action: 'addPerson' }
            },
            {
              type: 'Action.Submit',
              title: 'Cancel',
              data: { action: 'cancel' }
            }
          ]
        }
      ]
    },
    taskAssignment: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '📋 New Task Assignment',
          size: 'Large',
          weight: 'Bolder',
          color: 'Warning'
        },
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: 'Implement Adaptive Cards Integration',
              weight: 'Bolder',
              wrap: true
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Priority:', value: '🔴 High' },
                { title: 'Due Date:', value: '2025-01-15' },
                { title: 'Assigned to:', value: 'Development Team' },
                { title: 'Status:', value: '🟡 In Progress' }
              ]
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: 'Description:',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: 'Integrate Adaptive Cards into the Arketic chat system to enable interactive operations directly from chat messages.',
              wrap: true,
              spacing: 'Small'
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.Submit',
              title: '✅ Accept Task',
              style: 'positive',
              data: { action: 'acceptTask' }
            },
            {
              type: 'Action.Submit',
              title: '❌ Decline',
              data: { action: 'declineTask' }
            },
            {
              type: 'Action.OpenUrl',
              title: '🔗 View Details',
              url: 'http://localhost:4000'
            }
          ]
        }
      ]
    },
    approval: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '⚠️ Approval Required',
          size: 'Large',
          weight: 'Bolder',
          color: 'Warning'
        },
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzY3RjEiLz4KPHBhdGggZD0iTTIwIDEyQzIxLjY1NjkgMTIgMjMgMTMuMzQzMSAyMyAxNUMyMyAxNi42NTY5IDIxLjY1NjkgMTggMjAgMThDMTguMzQzMSAxOCAxNyAxNi42NTY5IDE3IDE1QzE3IDEzLjM0MzEgMTguMzQzMSAxMiAyMCAxMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiAyOEMxMiAyNC42ODYzIDE1LjU4MTcgMjIgMjAgMjJDMjQuNDE4MyAyMiAyOCAyNC42ODYzIDI4IDI4VjI5SDEyVjI4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                      size: 'Small',
                      style: 'Person'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Requested by: Ali Yılmaz',
                      weight: 'Bolder'
                    },
                    {
                      type: 'TextBlock',
                      text: 'Date: Jan 8, 2025',
                      isSubtle: true,
                      spacing: 'None'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: 'Budget Approval Request',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'TextBlock',
              text: 'Requesting approval for Q1 2025 development budget allocation of $50,000 for Adaptive Cards framework enhancement.',
              wrap: true,
              spacing: 'Small'
            },
            {
              type: 'Input.Text',
              id: 'comments',
              label: 'Comments (optional)',
              placeholder: 'Add your comments...',
              isMultiline: true
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.Submit',
              title: '✅ Approve',
              style: 'positive',
              data: { action: 'approve' }
            },
            {
              type: 'Action.Submit',
              title: '❌ Reject',
              style: 'destructive',
              data: { action: 'reject' }
            },
            {
              type: 'Action.Submit',
              title: '🔄 Request Info',
              data: { action: 'requestInfo' }
            }
          ]
        }
      ]
    },
    analytics: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '📊 Arketic Analytics Dashboard',
          size: 'Large',
          weight: 'Bolder'
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Active Users',
                  isSubtle: true,
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '1,234',
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: 'Accent',
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '↑ 12%',
                  color: 'Good',
                  size: 'Small',
                  horizontalAlignment: 'Center'
                }
              ]
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Tasks Completed',
                  isSubtle: true,
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '89',
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: 'Accent',
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '↑ 5%',
                  color: 'Good',
                  size: 'Small',
                  horizontalAlignment: 'Center'
                }
              ]
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Response Time',
                  isSubtle: true,
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '1.2s',
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: 'Good',
                  horizontalAlignment: 'Center'
                },
                {
                  type: 'TextBlock',
                  text: '↓ 8%',
                  color: 'Good',
                  size: 'Small',
                  horizontalAlignment: 'Center'
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          separator: true,
          items: [
            {
              type: 'TextBlock',
              text: 'System Health',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'API Status:', value: '✅ Operational' },
                { title: 'Database:', value: '✅ Healthy' },
                { title: 'Chat Service:', value: '✅ Connected' },
                { title: 'Uptime:', value: '99.9%' }
              ]
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '📈 Full Dashboard',
              url: 'http://localhost:3000/dashboard'
            },
            {
              type: 'Action.Submit',
              title: '📥 Export Report',
              data: { action: 'exportReport' }
            },
            {
              type: 'Action.Submit',
              title: '🔄 Refresh',
              data: { action: 'refresh' }
            }
          ]
        }
      ]
    },
    quickActions: {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '⚡ Arketic Quick Actions',
          size: 'Large',
          weight: 'Bolder'
        },
        {
          type: 'TextBlock',
          text: 'What would you like to do?',
          wrap: true,
          isSubtle: true
        },
        {
          type: 'Container',
          items: [
            {
              type: 'ActionSet',
              actions: [
                {
                  type: 'Action.Submit',
                  title: '👤 Manage People',
                  data: { action: 'showPersonManagement' }
                },
                {
                  type: 'Action.Submit',
                  title: '📋 View Tasks',
                  data: { action: 'showTasks' }
                }
              ]
            },
            {
              type: 'ActionSet',
              actions: [
                {
                  type: 'Action.Submit',
                  title: '📊 Analytics',
                  data: { action: 'showAnalytics' }
                },
                {
                  type: 'Action.Submit',
                  title: '💬 Start Chat',
                  data: { action: 'startChat' }
                }
              ]
            },
            {
              type: 'ActionSet',
              actions: [
                {
                  type: 'Action.Submit',
                  title: '📁 Documents',
                  data: { action: 'browseDocuments' }
                },
                {
                  type: 'Action.Submit',
                  title: '⚙️ Settings',
                  data: { action: 'openSettings' }
                }
              ]
            }
          ]
        }
      ]
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response with appropriate card
    setTimeout(() => {
      let responseCard: any = arketicCards.quickActions;
      let responseText = "Here's what I can help you with:";

      const lowerInput = inputValue.toLowerCase();
      
      if (lowerInput.includes('designer') || lowerInput.includes('import') || lowerInput.includes('paste') || lowerInput.includes('json')) {
        responseText = "🎨 You can import Adaptive Cards from the Microsoft Designer! Click the 'Import from Designer' button in the header to paste your JSON directly into the chat.";
        responseCard = null;
      } else if (lowerInput.includes('person') || lowerInput.includes('people') || lowerInput.includes('add') || lowerInput.includes('employee')) {
        responseCard = arketicCards.personManagement;
        responseText = "I'll help you add a new person to your organization:";
      } else if (lowerInput.includes('task') || lowerInput.includes('assign')) {
        responseCard = arketicCards.taskAssignment;
        responseText = "Here's a task that needs your attention:";
      } else if (lowerInput.includes('approval') || lowerInput.includes('approve') || lowerInput.includes('budget')) {
        responseCard = arketicCards.approval;
        responseText = "You have a pending approval request:";
      } else if (lowerInput.includes('analytics') || lowerInput.includes('report') || lowerInput.includes('dashboard') || lowerInput.includes('stats')) {
        responseCard = arketicCards.analytics;
        responseText = "Here's your current analytics dashboard:";
      }

      const textMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: responseText,
        sender: 'assistant',
        timestamp: new Date()
      };

      setIsTyping(false);
      
      if (responseCard) {
        const cardMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'adaptive-card',
          content: responseCard,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, textMessage, cardMessage]);
      } else {
        setMessages(prev => [...prev, textMessage]);
      }
    }, 1500);
  };

  const handleCardAction = (action: CardAction) => {
    console.log('Card action:', action);
    
    // Create user feedback message
    const userAction: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: `Action performed: ${action.action}`,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userAction]);
    
    // Simulate response
    setTimeout(() => {
      let response = '';
      let nextCard: any = null;
      
      switch (action.action) {
        case 'addPerson':
          response = '✅ Person added successfully to your organization!';
          break;
        case 'acceptTask':
          response = '✅ Task accepted and added to your task list.';
          break;
        case 'declineTask':
          response = '❌ Task declined.';
          break;
        case 'approve':
          response = '✅ Request approved successfully!';
          break;
        case 'reject':
          response = '❌ Request rejected.';
          break;
        case 'requestInfo':
          response = '🔄 Additional information requested from the requester.';
          break;
        case 'showPersonManagement':
          response = 'Opening person management form:';
          nextCard = arketicCards.personManagement;
          break;
        case 'showTasks':
          response = 'Here\'s a task for you:';
          nextCard = arketicCards.taskAssignment;
          break;
        case 'showAnalytics':
          response = 'Loading analytics dashboard:';
          nextCard = arketicCards.analytics;
          break;
        case 'exportReport':
          response = '📥 Report exported successfully! Check your downloads folder.';
          break;
        case 'refresh':
          response = '🔄 Dashboard refreshed with latest data:';
          nextCard = arketicCards.analytics;
          break;
        default:
          response = `Processing action: ${action.action}`;
      }
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      if (nextCard) {
        const cardMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'adaptive-card',
          content: nextCard,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, responseMessage, cardMessage]);
      } else {
        setMessages(prev => [...prev, responseMessage]);
      }
    }, 1000);
  };

  const handleImportCard = (cardJson: any) => {
    const cardMessage: Message = {
      id: Date.now().toString(),
      type: 'adaptive-card',
      content: cardJson,
      sender: 'assistant',
      timestamp: new Date()
    };
    
    const textMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'text',
      content: '🎨 Here\'s your imported card from the Designer:',
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, textMessage, cardMessage]);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
        `
      }} />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb', 
        padding: '24px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1f2937',
              margin: 0 
            }}>
              🚀 Arketic Chat with Adaptive Cards
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginTop: '4px',
              margin: '4px 0 0 0'
            }}>
              Interactive operations through chat messages
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowImporter(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              📋 Import from Designer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                color: '#6b7280',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              ← Back to Demo
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '16px' }}>
              Welcome to Arketic Chat! Try these commands:
            </p>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px', 
              justifyContent: 'center' 
            }}>
              <button 
                onClick={() => setInputValue('Show me people management')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bfdbfe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
              >
                👥 People Management
              </button>
              <button 
                onClick={() => setInputValue('Show tasks')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbf7d0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
              >
                📋 Tasks
              </button>
              <button 
                onClick={() => setInputValue('Show approvals')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fde68a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
              >
                ⚠️ Approvals
              </button>
              <button 
                onClick={() => setInputValue('Show analytics')}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#e9d5ff',
                  color: '#7c2d92',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd6fe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e9d5ff'}
              >
                📊 Analytics
              </button>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{ maxWidth: '600px' }}>
              {message.type === 'text' ? (
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: message.sender === 'user' ? '#2563eb' : 'white',
                    color: message.sender === 'user' ? 'white' : 'black',
                    border: message.sender === 'user' ? 'none' : '1px solid #e5e7eb',
                    boxShadow: message.sender === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {message.content}
                </div>
              ) : (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <AdvancedCardRenderer
                    card={message.content}
                    onAction={handleCardAction}
                    onInputChange={(id, value) => console.log('Input:', id, value)}
                  />
                </div>
              )}
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                paddingLeft: '4px'
              }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              padding: '8px 16px',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s ease-in-out 0ms infinite both'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s ease-in-out 0.16s infinite both'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s ease-in-out 0.32s infinite both'
                }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message or ask for help..."
            style={{
              flex: 1,
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: '8px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Send
          </button>
        </div>
      </div>
      </div>
      
      {showImporter && (
        <JsonImporter
          onImport={handleImportCard}
          onClose={() => setShowImporter(false)}
        />
      )}
    </>
  );
};