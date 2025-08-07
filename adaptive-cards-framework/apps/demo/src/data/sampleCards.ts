export const sampleCards = {
  simple: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: 'Hello, Adaptive Cards!',
        size: 'large',
        weight: 'bolder',
        horizontalAlignment: 'center',
      },
    ],
  },

  welcome: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: 'Welcome to Adaptive Cards Framework',
            size: 'large',
            weight: 'bolder',
            horizontalAlignment: 'center',
            color: 'accent',
          },
          {
            type: 'Image',
            url: 'https://via.placeholder.com/400x200/0078D4/FFFFFF?text=Adaptive+Cards',
            altText: 'Adaptive Cards Framework',
            size: 'stretch',
            horizontalAlignment: 'center',
          },
          {
            type: 'TextBlock',
            text: 'A modern TypeScript framework for creating and rendering adaptive cards with React support and Bot Framework integration.',
            wrap: true,
            horizontalAlignment: 'center',
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Learn More',
        url: 'https://adaptivecards.io',
      },
      {
        type: 'Action.Submit',
        title: 'Get Started',
        data: { action: 'get-started' },
      },
    ],
  },

  form: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: 'Contact Form',
        size: 'large',
        weight: 'bolder',
      },
      {
        type: 'TextBlock',
        text: 'Please fill out this form to get in touch with us.',
        wrap: true,
        isSubtle: true,
      },
      {
        type: 'Input.Text',
        id: 'name',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        isRequired: true,
      },
      {
        type: 'Input.Text',
        id: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        style: 'email',
        isRequired: true,
      },
      {
        type: 'Input.Text',
        id: 'message',
        label: 'Message',
        placeholder: 'Enter your message',
        isMultiline: true,
        isRequired: true,
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Send Message',
        style: 'positive',
        data: { action: 'send-message' },
      },
    ],
  },

  product: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: 'Adaptive Cards Framework',
            size: 'large',
            weight: 'bolder',
          },
          {
            type: 'TextBlock',
            text: 'Professional Edition',
            size: 'medium',
            color: 'accent',
            weight: 'bolder',
          },
          {
            type: 'Image',
            url: 'https://via.placeholder.com/300x150/28A745/FFFFFF?text=Framework',
            altText: 'Product image',
            size: 'stretch',
          },
          {
            type: 'TextBlock',
            text: 'A comprehensive TypeScript framework for building adaptive cards with advanced features:',
            wrap: true,
          },
          {
            type: 'Container',
            items: [
              {
                type: 'TextBlock',
                text: '✅ TypeScript support with full type safety',
              },
              {
                type: 'TextBlock',
                text: '✅ React components for modern UI',
              },
              {
                type: 'TextBlock',
                text: '✅ Bot Framework integration',
              },
              {
                type: 'TextBlock',
                text: '✅ HTML rendering engine',
              },
              {
                type: 'TextBlock',
                text: '✅ Comprehensive validation',
              },
            ],
          },
          {
            type: 'TextBlock',
            text: '$99/month',
            size: 'large',
            weight: 'bolder',
            color: 'good',
            horizontalAlignment: 'center',
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Buy Now',
        style: 'positive',
        data: { action: 'purchase', product: 'professional' },
      },
      {
        type: 'Action.OpenUrl',
        title: 'Learn More',
        url: '#',
      },
    ],
  },

  notification: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        style: 'attention',
        items: [
          {
            type: 'TextBlock',
            text: '⚠️ System Notification',
            size: 'medium',
            weight: 'bolder',
            color: 'attention',
          },
          {
            type: 'TextBlock',
            text: 'Your framework deployment was successful! All services are running normally.',
            wrap: true,
          },
          {
            type: 'Container',
            items: [
              {
                type: 'TextBlock',
                text: 'Status: Online ✅',
                color: 'good',
              },
              {
                type: 'TextBlock',
                text: 'Deployment: v1.0.0',
              },
              {
                type: 'TextBlock',
                text: 'Time: ' + new Date().toLocaleString(),
                isSubtle: true,
              },
            ],
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Acknowledge',
        data: { action: 'acknowledge' },
      },
      {
        type: 'Action.OpenUrl',
        title: 'View Dashboard',
        url: '#dashboard',
      },
    ],
  },

  weather: {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: 'Weather Forecast',
            size: 'large',
            weight: 'bolder',
            horizontalAlignment: 'center',
          },
          {
            type: 'Container',
            items: [
              {
                type: 'Image',
                url: 'https://via.placeholder.com/100x100/FFD700/000000?text=☀️',
                altText: 'Sunny weather',
                size: 'small',
                horizontalAlignment: 'center',
              },
              {
                type: 'TextBlock',
                text: '75°F',
                size: 'extraLarge',
                weight: 'bolder',
                horizontalAlignment: 'center',
              },
              {
                type: 'TextBlock',
                text: 'Sunny',
                horizontalAlignment: 'center',
                color: 'accent',
              },
              {
                type: 'TextBlock',
                text: 'San Francisco, CA',
                horizontalAlignment: 'center',
                isSubtle: true,
              },
            ],
          },
          {
            type: 'Container',
            items: [
              {
                type: 'TextBlock',
                text: 'High: 78°F | Low: 65°F',
                horizontalAlignment: 'center',
              },
              {
                type: 'TextBlock',
                text: 'Humidity: 45% | Wind: 8 mph',
                horizontalAlignment: 'center',
                isSubtle: true,
              },
            ],
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: '5-Day Forecast',
        data: { action: 'forecast' },
      },
      {
        type: 'Action.OpenUrl',
        title: 'Full Weather',
        url: 'https://weather.com',
      },
    ],
  },
};

export const cardCategories = [
  { id: 'simple', name: 'Simple Card', description: 'Basic text card' },
  { id: 'welcome', name: 'Welcome Card', description: 'Card with image and actions' },
  { id: 'form', name: 'Contact Form', description: 'Interactive form with inputs' },
  { id: 'product', name: 'Product Card', description: 'E-commerce product display' },
  { id: 'notification', name: 'Notification', description: 'System notification card' },
  { id: 'weather', name: 'Weather Widget', description: 'Weather information display' },
];