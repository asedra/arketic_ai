import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// Mock Adaptive Card Renderer for Storybook
const AdaptiveCardRenderer = ({ card, onAction }: any) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <pre className="text-xs">{JSON.stringify(card, null, 2)}</pre>
      {card.body?.[card.body.length - 1]?.type === 'ActionSet' && (
        <div className="mt-4 flex gap-2">
          {card.body[card.body.length - 1].actions?.map((action: any, idx: number) => (
            <button
              key={idx}
              onClick={() => onAction({ action: action.data?.action, data: action.data })}
              className={`px-4 py-2 rounded ${
                action.style === 'positive' 
                  ? 'bg-green-500 text-white' 
                  : action.style === 'destructive'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {action.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Arketic Cards Collection
const ArketicCards = {
  PersonManagement: {
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
            type: 'Input.ChoiceSet',
            id: 'department',
            label: 'Department',
            choices: [
              { title: 'Engineering', value: 'engineering' },
              { title: 'Product', value: 'product' },
              { title: 'Design', value: 'design' }
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
  TaskAssignment: {
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
              { title: 'Status:', value: '🟡 In Progress' }
            ]
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
          }
        ]
      }
    ]
  },
  ApprovalRequest: {
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
        items: [
          {
            type: 'TextBlock',
            text: 'Budget Approval Request',
            weight: 'Bolder',
            size: 'Medium'
          },
          {
            type: 'TextBlock',
            text: 'Requesting approval for Q1 2025 development budget allocation of $50,000.',
            wrap: true
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
          }
        ]
      }
    ]
  },
  Analytics: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '📊 Analytics Dashboard',
        size: 'Large',
        weight: 'Bolder'
      },
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            items: [
              {
                type: 'TextBlock',
                text: 'Active Users',
                isSubtle: true
              },
              {
                type: 'TextBlock',
                text: '1,234',
                size: 'ExtraLarge',
                weight: 'Bolder',
                color: 'Accent'
              }
            ]
          },
          {
            type: 'Column',
            items: [
              {
                type: 'TextBlock',
                text: 'Tasks',
                isSubtle: true
              },
              {
                type: 'TextBlock',
                text: '89',
                size: 'ExtraLarge',
                weight: 'Bolder',
                color: 'Accent'
              }
            ]
          }
        ]
      },
      {
        type: 'ActionSet',
        actions: [
          {
            type: 'Action.Submit',
            title: '📥 Export',
            data: { action: 'export' }
          },
          {
            type: 'Action.Submit',
            title: '🔄 Refresh',
            data: { action: 'refresh' }
          }
        ]
      }
    ]
  }
};

// Chat Message Component
const ChatMessage = ({ message, card, isUser = false }: any) => {
  const [actionResult, setActionResult] = React.useState<string>('');

  const handleAction = (action: any) => {
    setActionResult(`Action performed: ${action.action}`);
    console.log('Card action:', action);
  };

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl ${isUser ? 'order-2' : ''}`}>
        {card ? (
          <AdaptiveCardRenderer card={card} onAction={handleAction} />
        ) : (
          <div
            className={`px-4 py-2 rounded-lg ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200'
            }`}
          >
            {message}
          </div>
        )}
        {actionResult && (
          <div className="mt-2 text-sm text-green-600">{actionResult}</div>
        )}
      </div>
    </div>
  );
};

// Chat Interface Component
const ChatInterface = ({ initialCard }: { initialCard?: any }) => {
  const [messages, setMessages] = React.useState<any[]>([
    { id: 1, text: 'Hello! How can I help you today?', isUser: false },
    initialCard && { id: 2, card: initialCard, isUser: false }
  ].filter(Boolean));

  return (
    <div className="bg-gray-50 p-6 rounded-lg" style={{ minHeight: '500px' }}>
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="border-b pb-4 mb-4">
          <h3 className="text-xl font-bold">Arketic Chat Assistant</h3>
          <p className="text-sm text-gray-600">Interactive operations through Adaptive Cards</p>
        </div>
        
        <div className="space-y-4" style={{ minHeight: '300px' }}>
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg.text}
              card={msg.card}
              isUser={msg.isUser}
            />
          ))}
        </div>
        
        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'Arketic Integration/Chat with Adaptive Cards',
  component: ChatInterface,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChatInterface>;

export const PersonManagementCard: Story = {
  name: '👥 Person Management',
  args: {
    initialCard: ArketicCards.PersonManagement
  },
  parameters: {
    docs: {
      description: {
        story: 'Add or edit person information in your organization through an interactive card.'
      }
    }
  }
};

export const TaskAssignmentCard: Story = {
  name: '📋 Task Assignment',
  args: {
    initialCard: ArketicCards.TaskAssignment
  },
  parameters: {
    docs: {
      description: {
        story: 'Receive and respond to task assignments with detailed information and actions.'
      }
    }
  }
};

export const ApprovalRequestCard: Story = {
  name: '⚠️ Approval Request',
  args: {
    initialCard: ArketicCards.ApprovalRequest
  },
  parameters: {
    docs: {
      description: {
        story: 'Handle approval requests with comments and multiple action options.'
      }
    }
  }
};

export const AnalyticsDashboardCard: Story = {
  name: '📊 Analytics Dashboard',
  args: {
    initialCard: ArketicCards.Analytics
  },
  parameters: {
    docs: {
      description: {
        story: 'View real-time analytics and metrics in an interactive dashboard card.'
      }
    }
  }
};

export const EmptyChatInterface: Story = {
  name: '💬 Empty Chat',
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Start with an empty chat interface ready for Adaptive Card interactions.'
      }
    }
  }
};

export const MultipleCards: Story = {
  name: '🎯 Multiple Cards Flow',
  render: () => {
    const [currentCard, setCurrentCard] = React.useState<any>(null);
    
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCurrentCard(ArketicCards.PersonManagement)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded"
          >
            Show Person Card
          </button>
          <button
            onClick={() => setCurrentCard(ArketicCards.TaskAssignment)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded"
          >
            Show Task Card
          </button>
          <button
            onClick={() => setCurrentCard(ArketicCards.ApprovalRequest)}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded"
          >
            Show Approval Card
          </button>
          <button
            onClick={() => setCurrentCard(ArketicCards.Analytics)}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded"
          >
            Show Analytics Card
          </button>
        </div>
        
        <ChatInterface initialCard={currentCard} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrate switching between different Adaptive Card types in the chat interface.'
      }
    }
  }
};