import { AdaptiveCard } from '@adaptive-cards/core';

export interface CardAction {
  type: 'Action.Submit' | 'Action.OpenUrl' | 'Action.ShowCard';
  title: string;
  data?: any;
  url?: string;
}

export interface AdaptiveCardMessage {
  id: string;
  type: 'adaptive-card';
  card: any;
  timestamp: Date;
  userId: string;
}

export class AdaptiveCardsService {
  // Create person management card
  static createPersonCard(person?: any): any {
    return {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: person ? `Edit Person: ${person.name}` : 'Add New Person',
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
              isRequired: true,
              value: person?.name || ''
            },
            {
              type: 'Input.Text',
              id: 'email',
              label: 'Email',
              placeholder: 'email@example.com',
              style: 'Email',
              isRequired: true,
              value: person?.email || ''
            },
            {
              type: 'Input.Text',
              id: 'role',
              label: 'Role',
              placeholder: 'e.g., Software Engineer',
              value: person?.role || ''
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
              ],
              value: person?.department || ''
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.Submit',
              title: person ? 'Update Person' : 'Add Person',
              style: 'positive',
              data: {
                action: person ? 'updatePerson' : 'addPerson',
                personId: person?.id
              }
            },
            {
              type: 'Action.Submit',
              title: 'Cancel',
              data: {
                action: 'cancel'
              }
            }
          ]
        }
      ]
    };
  }

  // Create task assignment card
  static createTaskCard(task: any): any {
    return {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'Image',
                  url: '/placeholder-logo.svg',
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
                  text: 'New Task Assignment',
                  weight: 'Bolder',
                  size: 'Medium'
                },
                {
                  type: 'TextBlock',
                  text: `${task.title}`,
                  wrap: true,
                  spacing: 'None',
                  isSubtle: true
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'FactSet',
              facts: [
                { title: 'Priority:', value: task.priority || 'Normal' },
                { title: 'Due Date:', value: task.dueDate || 'Not set' },
                { title: 'Assigned to:', value: task.assignee || 'Unassigned' },
                { title: 'Status:', value: task.status || 'Open' }
              ]
            },
            {
              type: 'TextBlock',
              text: 'Description',
              weight: 'Bolder',
              spacing: 'Medium'
            },
            {
              type: 'TextBlock',
              text: task.description || 'No description provided',
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
              title: 'Accept Task',
              style: 'positive',
              data: {
                action: 'acceptTask',
                taskId: task.id
              }
            },
            {
              type: 'Action.Submit',
              title: 'Decline',
              data: {
                action: 'declineTask',
                taskId: task.id
              }
            },
            {
              type: 'Action.OpenUrl',
              title: 'View Details',
              url: `/tasks/${task.id}`
            }
          ]
        }
      ]
    };
  }

  // Create approval request card
  static createApprovalCard(request: any): any {
    return {
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
          type: 'TextBlock',
          text: request.title,
          wrap: true,
          size: 'Medium'
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
                      type: 'TextBlock',
                      text: '👤',
                      size: 'Large'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `Requested by: ${request.requester}`,
                      weight: 'Bolder'
                    },
                    {
                      type: 'TextBlock',
                      text: `Date: ${new Date(request.date).toLocaleDateString()}`,
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
              text: 'Details:',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: request.details,
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
              data: {
                action: 'approve',
                requestId: request.id
              }
            },
            {
              type: 'Action.Submit',
              title: '❌ Reject',
              style: 'destructive',
              data: {
                action: 'reject',
                requestId: request.id
              }
            },
            {
              type: 'Action.Submit',
              title: '🔄 Request More Info',
              data: {
                action: 'requestInfo',
                requestId: request.id
              }
            }
          ]
        }
      ]
    };
  }

  // Create data visualization card
  static createDataCard(data: any): any {
    return {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '📊 Weekly Analytics Report',
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
                  text: 'Total Users',
                  isSubtle: true
                },
                {
                  type: 'TextBlock',
                  text: data.totalUsers || '1,234',
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: 'Accent'
                },
                {
                  type: 'TextBlock',
                  text: '↑ 12% from last week',
                  color: 'Good',
                  size: 'Small'
                }
              ]
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Active Sessions',
                  isSubtle: true
                },
                {
                  type: 'TextBlock',
                  text: data.activeSessions || '89',
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: 'Accent'
                },
                {
                  type: 'TextBlock',
                  text: '↑ 5% from last week',
                  color: 'Good',
                  size: 'Small'
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
              text: 'Top Actions This Week',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Documents Created:', value: '45' },
                { title: 'Tasks Completed:', value: '128' },
                { title: 'Approvals Processed:', value: '23' },
                { title: 'Messages Sent:', value: '892' }
              ]
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Full Report',
              url: '/analytics/weekly'
            },
            {
              type: 'Action.Submit',
              title: 'Export Data',
              data: {
                action: 'exportData',
                format: 'csv'
              }
            },
            {
              type: 'Action.Submit',
              title: 'Schedule Report',
              data: {
                action: 'scheduleReport'
              }
            }
          ]
        }
      ]
    };
  }

  // Create quick actions card
  static createQuickActionsCard(): any {
    return {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '⚡ Quick Actions',
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
                  title: '👤 Add Person',
                  data: { action: 'showAddPerson' }
                },
                {
                  type: 'Action.Submit',
                  title: '📋 Create Task',
                  data: { action: 'showCreateTask' }
                },
                {
                  type: 'Action.Submit',
                  title: '📊 View Reports',
                  data: { action: 'showReports' }
                }
              ]
            },
            {
              type: 'ActionSet',
              actions: [
                {
                  type: 'Action.Submit',
                  title: '💬 Start Chat',
                  data: { action: 'startChat' }
                },
                {
                  type: 'Action.Submit',
                  title: '📁 Browse Files',
                  data: { action: 'browseFiles' }
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
    };
  }

  // Handle card actions
  static async handleCardAction(action: string, data: any): Promise<any> {
    switch (action) {
      case 'addPerson':
      case 'updatePerson':
        // Handle person management
        return {
          success: true,
          message: `Person ${action === 'addPerson' ? 'added' : 'updated'} successfully`,
          data: data
        };
      
      case 'acceptTask':
      case 'declineTask':
        // Handle task actions
        return {
          success: true,
          message: `Task ${action === 'acceptTask' ? 'accepted' : 'declined'}`,
          taskId: data.taskId
        };
      
      case 'approve':
      case 'reject':
        // Handle approval actions
        return {
          success: true,
          message: `Request ${action === 'approve' ? 'approved' : 'rejected'}`,
          requestId: data.requestId,
          comments: data.comments
        };
      
      default:
        return {
          success: false,
          message: 'Unknown action'
        };
    }
  }
}