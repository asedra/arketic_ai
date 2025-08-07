export const microsoftSamples = {
  activityUpdate: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '📋 Activity Update',
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'TextBlock',
        text: 'Your daily activity summary',
        isSubtle: true,
        wrap: true,
        spacing: 'Small'
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
                text: 'Tasks Completed',
                weight: 'Bolder',
                color: 'Default'
              },
              {
                type: 'TextBlock',
                text: '12',
                size: 'ExtraLarge',
                weight: 'Bolder',
                color: 'Good'
              }
            ]
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: 'Hours Worked',
                weight: 'Bolder',
                color: 'Default'
              },
              {
                type: 'TextBlock',
                text: '7.5',
                size: 'ExtraLarge',
                weight: 'Bolder',
                color: 'Accent'
              }
            ]
          }
        ]
      },
      {
        type: 'Container',
        separator: true,
        spacing: 'Medium',
        items: [
          {
            type: 'TextBlock',
            text: 'Recent Activities',
            weight: 'Bolder',
            size: 'Medium'
          },
          {
            type: 'FactSet',
            facts: [
              { title: '✅ Completed:', value: 'API Integration' },
              { title: '📝 Updated:', value: 'Documentation' },
              { title: '🔄 In Progress:', value: 'Testing Suite' }
            ]
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Details',
        url: 'https://example.com/activity'
      },
      {
        type: 'Action.Submit',
        title: 'Refresh',
        data: { action: 'refresh' }
      }
    ]
  },

  flightItinerary: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '✈️ Flight Itinerary',
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
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
                    text: 'SFO',
                    size: 'ExtraLarge',
                    weight: 'Bolder'
                  },
                  {
                    type: 'TextBlock',
                    text: 'San Francisco',
                    isSubtle: true,
                    spacing: 'None'
                  }
                ]
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: '→',
                    horizontalAlignment: 'Center',
                    size: 'Large'
                  },
                  {
                    type: 'TextBlock',
                    text: 'AA 1234',
                    horizontalAlignment: 'Center',
                    isSubtle: true
                  }
                ]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: 'JFK',
                    size: 'ExtraLarge',
                    weight: 'Bolder',
                    horizontalAlignment: 'Right'
                  },
                  {
                    type: 'TextBlock',
                    text: 'New York',
                    isSubtle: true,
                    spacing: 'None',
                    horizontalAlignment: 'Right'
                  }
                ]
              }
            ]
          },
          {
            type: 'FactSet',
            separator: true,
            facts: [
              { title: 'Date:', value: 'March 15, 2025' },
              { title: 'Departure:', value: '9:00 AM PST' },
              { title: 'Arrival:', value: '5:30 PM EST' },
              { title: 'Duration:', value: '5h 30m' },
              { title: 'Seat:', value: '12A' },
              { title: 'Gate:', value: 'B42' }
            ]
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Check In',
        url: 'https://example.com/checkin'
      },
      {
        type: 'Action.Submit',
        title: 'Change Seat',
        data: { action: 'changeSeat' }
      }
    ]
  },

  foodOrder: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '🍕 Food Order',
        size: 'Large',
        weight: 'Bolder',
        color: 'Warning'
      },
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: 'Your order is ready!',
            wrap: true,
            color: 'Good',
            weight: 'Bolder'
          },
          {
            type: 'TextBlock',
            text: 'Order #12345',
            isSubtle: true
          }
        ]
      },
      {
        type: 'Container',
        separator: true,
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: '1x Margherita Pizza',
                    wrap: true
                  }
                ]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '$18.99',
                    horizontalAlignment: 'Right'
                  }
                ]
              }
            ]
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
                    text: '2x Garlic Bread',
                    wrap: true
                  }
                ]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '$7.98',
                    horizontalAlignment: 'Right'
                  }
                ]
              }
            ]
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
                    text: '1x Caesar Salad',
                    wrap: true
                  }
                ]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '$9.99',
                    horizontalAlignment: 'Right'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'Container',
        separator: true,
        style: 'emphasis',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: 'Total',
                    weight: 'Bolder',
                    size: 'Medium'
                  }
                ]
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '$36.96',
                    weight: 'Bolder',
                    size: 'Medium',
                    color: 'Accent',
                    horizontalAlignment: 'Right'
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: '✅ Confirm Pickup',
        style: 'positive',
        data: { action: 'confirmPickup' }
      },
      {
        type: 'Action.Submit',
        title: 'Track Order',
        data: { action: 'trackOrder' }
      }
    ]
  },

  inputForm: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '📝 Contact Form',
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'TextBlock',
        text: 'Please fill out the form below',
        isSubtle: true,
        wrap: true
      },
      {
        type: 'Container',
        separator: true,
        items: [
          {
            type: 'Input.Text',
            id: 'name',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            isRequired: true
          },
          {
            type: 'Input.Text',
            id: 'email',
            label: 'Email Address',
            placeholder: 'email@example.com',
            style: 'email',
            isRequired: true
          },
          {
            type: 'Input.Text',
            id: 'phone',
            label: 'Phone Number',
            placeholder: '+1 (555) 123-4567',
            style: 'tel'
          },
          {
            type: 'Input.ChoiceSet',
            id: 'subject',
            label: 'Subject',
            placeholder: 'Select a subject',
            choices: [
              { title: 'General Inquiry', value: 'general' },
              { title: 'Technical Support', value: 'support' },
              { title: 'Sales', value: 'sales' },
              { title: 'Feedback', value: 'feedback' }
            ],
            isRequired: true
          },
          {
            type: 'Input.Text',
            id: 'message',
            label: 'Message',
            placeholder: 'Enter your message here...',
            isMultiline: true,
            isRequired: true
          },
          {
            type: 'Input.Toggle',
            id: 'newsletter',
            title: 'Subscribe to newsletter',
            value: 'false',
            valueOn: 'true',
            valueOff: 'false'
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Submit',
        style: 'positive',
        data: { action: 'submit' }
      },
      {
        type: 'Action.Submit',
        title: 'Reset',
        data: { action: 'reset' }
      }
    ]
  },

  dataTable: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '📊 Sales Report',
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'TextBlock',
        text: 'Q1 2025 Performance',
        isSubtle: true
      },
      {
        type: 'Table',
        columns: [
          { title: 'Product', width: 'stretch' },
          { title: 'Units', width: 'auto' },
          { title: 'Revenue', width: 'auto' }
        ],
        rows: [
          {
            cells: [
              { items: [{ type: 'TextBlock', text: 'Widget A' }] },
              { items: [{ type: 'TextBlock', text: '145' }] },
              { items: [{ type: 'TextBlock', text: '$14,500', color: 'Good' }] }
            ]
          },
          {
            cells: [
              { items: [{ type: 'TextBlock', text: 'Widget B' }] },
              { items: [{ type: 'TextBlock', text: '89' }] },
              { items: [{ type: 'TextBlock', text: '$8,900', color: 'Good' }] }
            ]
          },
          {
            cells: [
              { items: [{ type: 'TextBlock', text: 'Widget C' }] },
              { items: [{ type: 'TextBlock', text: '234' }] },
              { items: [{ type: 'TextBlock', text: '$23,400', color: 'Good' }] }
            ]
          },
          {
            cells: [
              { items: [{ type: 'TextBlock', text: 'Total', weight: 'Bolder' }] },
              { items: [{ type: 'TextBlock', text: '468', weight: 'Bolder' }] },
              { items: [{ type: 'TextBlock', text: '$46,800', weight: 'Bolder', color: 'Accent' }] }
            ]
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: '📥 Export CSV',
        data: { action: 'exportCSV' }
      },
      {
        type: 'Action.Submit',
        title: '📈 View Details',
        data: { action: 'viewDetails' }
      }
    ]
  },

  simpleCard: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: '🏷️ Simple Card',
        size: 'Large',
        weight: 'Bolder'
      },
      {
        type: 'TextBlock',
        text: 'This is a simple adaptive card with basic text content.',
        wrap: true
      },
      {
        type: 'Image',
        url: 'https://via.placeholder.com/400x200/007ACC/FFFFFF?text=Adaptive+Card',
        size: 'Stretch',
        altText: 'Placeholder Image'
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Learn More',
        url: 'https://adaptivecards.io'
      }
    ]
  }
};