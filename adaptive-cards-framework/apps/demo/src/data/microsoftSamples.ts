// Microsoft Adaptive Cards official samples
export const microsoftSamples = {
  // Activity Update Sample
  activityUpdate: {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "size": "Medium",
        "weight": "Bolder",
        "text": "Publish Adaptive Card Schema"
      },
      {
        "type": "ColumnSet",
        "columns": [
          {
            "type": "Column",
            "items": [
              {
                "type": "Image",
                "style": "Person",
                "url": "https://pbs.twimg.com/profile_images/3647943215/d7f12830b3c17a5a9e4afcc370e3a37e_400x400.jpeg",
                "size": "Small"
              }
            ],
            "width": "auto"
          },
          {
            "type": "Column",
            "items": [
              {
                "type": "TextBlock",
                "weight": "Bolder",
                "text": "Matt Hidinger",
                "wrap": true
              },
              {
                "type": "TextBlock",
                "spacing": "None",
                "text": "Created {{DATE(2017-02-14T06:08:39Z,SHORT)}}",
                "isSubtle": true,
                "wrap": true
              }
            ],
            "width": "stretch"
          }
        ]
      },
      {
        "type": "TextBlock",
        "text": "Now that we have defined the main rules and features of the format, we need to produce a schema and publish it to GitHub. The schema will be the starting point of our reference documentation.",
        "wrap": true
      },
      {
        "type": "FactSet",
        "facts": [
          {
            "title": "Board:",
            "value": "Adaptive Cards"
          },
          {
            "title": "List:",
            "value": "Backlog"
          },
          {
            "title": "Assigned to:",
            "value": "Matt Hidinger"
          },
          {
            "title": "Due date:",
            "value": "Not set"
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.ShowCard",
        "title": "Set due date",
        "card": {
          "type": "AdaptiveCard",
          "body": [
            {
              "type": "Input.Date",
              "id": "dueDate"
            },
            {
              "type": "Input.Text",
              "id": "comment",
              "placeholder": "Add a comment",
              "isMultiline": true
            }
          ],
          "actions": [
            {
              "type": "Action.Submit",
              "title": "OK"
            }
          ]
        }
      },
      {
        "type": "Action.ShowCard",
        "title": "Comment",
        "card": {
          "type": "AdaptiveCard",
          "body": [
            {
              "type": "Input.Text",
              "id": "comment",
              "isMultiline": true,
              "placeholder": "Enter your comment"
            }
          ],
          "actions": [
            {
              "type": "Action.Submit",
              "title": "OK"
            }
          ]
        }
      }
    ]
  },

  // Flight Itinerary Sample
  flightItinerary: {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "✈️ Your Flight Itinerary",
        "size": "Large",
        "weight": "Bolder"
      },
      {
        "type": "Container",
        "style": "emphasis",
        "items": [
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "FROM",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "Seattle",
                    "size": "large",
                    "color": "dark"
                  },
                  {
                    "type": "TextBlock",
                    "text": "SEA",
                    "color": "dark",
                    "weight": "bolder",
                    "spacing": "none"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": " "
                  },
                  {
                    "type": "Image",
                    "url": "https://adaptivecards.io/content/airplane.png",
                    "size": "small"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "TO",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "San Francisco",
                    "size": "large",
                    "color": "dark"
                  },
                  {
                    "type": "TextBlock",
                    "text": "SFO",
                    "color": "dark",
                    "weight": "bolder",
                    "spacing": "none"
                  }
                ]
              }
            ]
          },
          {
            "type": "ColumnSet",
            "separator": true,
            "spacing": "medium",
            "columns": [
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "DEPARTS",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "{{DATE(2017-02-14T06:00:00Z, COMPACT)}}",
                    "color": "dark"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "ARRIVES",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "{{DATE(2017-02-14T09:15:00Z, COMPACT)}}",
                    "color": "dark"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "type": "Container",
        "spacing": "medium",
        "items": [
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "FLIGHT",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "KL0605",
                    "color": "dark"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "SEAT",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "14A",
                    "color": "dark"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "GATE",
                    "color": "accent",
                    "size": "small",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "C7",
                    "color": "dark"
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.OpenUrl",
        "title": "Check-in Online",
        "url": "https://www.klm.com/"
      },
      {
        "type": "Action.Submit",
        "title": "View Boarding Pass",
        "data": {
          "action": "viewBoardingPass"
        }
      }
    ]
  },

  // Food Order Sample
  foodOrder: {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "🍕 Your Order",
        "size": "Large",
        "weight": "Bolder"
      },
      {
        "type": "TextBlock",
        "text": "Thanks for your order! Here's what we're preparing for you:",
        "wrap": true
      },
      {
        "type": "FactSet",
        "facts": [
          {
            "title": "Order #:",
            "value": "123456"
          },
          {
            "title": "Restaurant:",
            "value": "Mario's Pizzeria"
          },
          {
            "title": "Address:",
            "value": "123 Main St, Seattle, WA"
          },
          {
            "title": "Estimated Delivery:",
            "value": "6:30 PM"
          }
        ]
      },
      {
        "type": "Container",
        "separator": true,
        "items": [
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "Image",
                    "url": "https://contososcubademo.azurewebsites.net/assets/steak.jpg",
                    "size": "medium",
                    "altText": "Steak"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "New York Strip",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "Prepared medium-rare",
                    "spacing": "none"
                  },
                  {
                    "type": "TextBlock",
                    "text": "$27.50",
                    "weight": "bolder",
                    "color": "good"
                  }
                ]
              }
            ]
          },
          {
            "type": "ColumnSet",
            "spacing": "medium",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "Image",
                    "url": "https://contososcubademo.azurewebsites.net/assets/chicken.jpg",
                    "size": "medium",
                    "altText": "Chicken"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "Chicken Marsala",
                    "weight": "bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "With mushrooms and wine sauce",
                    "spacing": "none"
                  },
                  {
                    "type": "TextBlock",
                    "text": "$22.50",
                    "weight": "bolder",
                    "color": "good"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "type": "Container",
        "separator": true,
        "items": [
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "Subtotal",
                    "horizontalAlignment": "right"
                  },
                  {
                    "type": "TextBlock",
                    "text": "Tax",
                    "horizontalAlignment": "right",
                    "spacing": "none"
                  },
                  {
                    "type": "TextBlock",
                    "text": "Total",
                    "horizontalAlignment": "right",
                    "spacing": "none",
                    "weight": "bolder"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "$50.00"
                  },
                  {
                    "type": "TextBlock",
                    "text": "$5.00",
                    "spacing": "none"
                  },
                  {
                    "type": "TextBlock",
                    "text": "$55.00",
                    "weight": "bolder",
                    "spacing": "none"
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "👍 Track Order",
        "data": {
          "action": "trackOrder"
        }
      },
      {
        "type": "Action.Submit",
        "title": "📞 Call Restaurant",
        "data": {
          "action": "callRestaurant"
        }
      }
    ]
  },

  // Microsoft Official Input.ChoiceSet Example
  choiceSetOfficial: {
    "type": "AdaptiveCard",
    "version": "1.3",
    "body": [
      {
        "type": "Input.ChoiceSet",
        "id": "myColor",
        "style": "compact",
        "label": "Compact single select",
        "isMultiSelect": false,
        "value": "1",
        "choices": [
          {
            "title": "Red",
            "value": "1"
          },
          {
            "title": "Green",
            "value": "2"
          },
          {
            "title": "Blue",
            "value": "3"
          }
        ]
      },
      {
        "type": "Input.ChoiceSet",
        "id": "myColor2",
        "style": "expanded",
        "label": "Expanded single select",
        "isMultiSelect": false,
        "value": "1",
        "choices": [
          {
            "title": "Red",
            "value": "1"
          },
          {
            "title": "Green",
            "value": "2"
          },
          {
            "title": "Blue",
            "value": "3"
          }
        ]
      },
      {
        "type": "Input.ChoiceSet",
        "id": "myColor3",
        "isMultiSelect": true,
        "value": "1,3",
        "style": "compact",
        "label": "Compact multiselect",
        "choices": [
          {
            "title": "Red",
            "value": "1"
          },
          {
            "title": "Green",
            "value": "2"
          },
          {
            "title": "Blue",
            "value": "3"
          }
        ]
      },
      {
        "type": "Input.ChoiceSet",
        "id": "myColor4",
        "isMultiSelect": true,
        "value": "1",
        "style": "expanded",
        "label": "Expanded multiselect",
        "choices": [
          {
            "title": "Red",
            "value": "1"
          },
          {
            "title": "Green",
            "value": "2"
          },
          {
            "title": "Blue",
            "value": "3"
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "OK"
      }
    ]
  },

  // Comprehensive Input Sample
  inputSample: {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "📝 Registration Form",
        "size": "Large",
        "weight": "Bolder"
      },
      {
        "type": "TextBlock",
        "text": "Please fill out all required fields",
        "isSubtle": true
      },
      {
        "type": "Input.Text",
        "id": "name",
        "label": "Full Name",
        "placeholder": "Enter your full name",
        "isRequired": true
      },
      {
        "type": "Input.Text",
        "id": "email",
        "label": "Email Address",
        "placeholder": "you@example.com",
        "style": "email",
        "isRequired": true
      },
      {
        "type": "Input.Number",
        "id": "age",
        "label": "Age",
        "placeholder": "25",
        "min": 18,
        "max": 120
      },
      {
        "type": "Input.Date",
        "id": "birthdate",
        "label": "Date of Birth"
      },
      {
        "type": "Input.Time",
        "id": "preferredTime",
        "label": "Preferred Contact Time"
      },
      {
        "type": "Input.Toggle",
        "id": "newsletter",
        "title": "Subscribe to newsletter",
        "value": "false"
      },
      {
        "type": "Input.ChoiceSet",
        "id": "department",
        "label": "Department",
        "placeholder": "Select department",
        "choices": [
          {
            "title": "Engineering",
            "value": "eng"
          },
          {
            "title": "Marketing",
            "value": "marketing"
          },
          {
            "title": "Sales",
            "value": "sales"
          },
          {
            "title": "Support",
            "value": "support"
          }
        ]
      },
      {
        "type": "Input.ChoiceSet",
        "id": "skills",
        "label": "Skills (Select all that apply)",
        "isMultiSelect": true,
        "style": "expanded",
        "choices": [
          {
            "title": "JavaScript",
            "value": "js"
          },
          {
            "title": "Python",
            "value": "python"
          },
          {
            "title": "React",
            "value": "react"
          },
          {
            "title": "Node.js",
            "value": "nodejs"
          }
        ]
      },
      {
        "type": "Input.Text",
        "id": "comments",
        "label": "Additional Comments",
        "placeholder": "Tell us more about yourself...",
        "isMultiline": true
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "✅ Submit Registration",
        "style": "positive"
      },
      {
        "type": "Action.Submit",
        "title": "💾 Save Draft",
        "data": {
          "action": "saveDraft"
        }
      }
    ]
  },

  // Rich Table Sample
  tableSample: {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "📊 Sales Report",
        "size": "Large",
        "weight": "Bolder"
      },
      {
        "type": "TextBlock",
        "text": "Q4 2024 Performance Summary",
        "isSubtle": true
      },
      {
        "type": "Table",
        "columns": [
          {
            "title": "Region",
            "width": "stretch"
          },
          {
            "title": "Sales",
            "width": "auto"
          },
          {
            "title": "Growth",
            "width": "auto"
          },
          {
            "title": "Target",
            "width": "auto"
          }
        ],
        "rows": [
          {
            "cells": [
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "North America",
                    "weight": "bolder"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "$2.5M",
                    "color": "good"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "+15%",
                    "color": "good"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "✅ Met"
                  }
                ]
              }
            ]
          },
          {
            "cells": [
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "Europe",
                    "weight": "bolder"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "$1.8M",
                    "color": "warning"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "+8%",
                    "color": "warning"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "⚠️ Below"
                  }
                ]
              }
            ]
          },
          {
            "cells": [
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "Asia Pacific",
                    "weight": "bolder"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "$3.2M",
                    "color": "good"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "+22%",
                    "color": "good"
                  }
                ]
              },
              {
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "🏆 Exceeded"
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "📈 View Details",
        "data": {
          "action": "viewDetails"
        }
      },
      {
        "type": "Action.Submit",
        "title": "📧 Email Report",
        "data": {
          "action": "emailReport"
        }
      }
    ]
  }
};