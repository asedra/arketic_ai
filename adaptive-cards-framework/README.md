# Adaptive Cards Framework MVP

A modern TypeScript framework for creating and rendering Adaptive Cards with React support, Bot Framework integration, and comprehensive validation. Built within 6 days for rapid prototyping and deployment.

## 🚀 Features

- **TypeScript Core Library**: Full type safety and IntelliSense support
- **React Components**: Modern React components for rendering Adaptive Cards
- **Design System**: Comprehensive UI library with accessibility and dark mode
- **Parser & Validator**: Comprehensive JSON schema validation with AJV
- **HTML Renderer**: Server-side rendering capabilities
- **Bot Framework Integration**: Ready-to-use middleware and helpers
- **Storybook Documentation**: Interactive component playground and documentation
- **Live Demo**: Interactive playground with 6 sample card types

## 📦 Packages

This monorepo contains the following packages:

- **@adaptive-cards/core** - Core TypeScript library with element and action classes
- **@adaptive-cards/parser** - Parser and validator using JSON Schema
- **@adaptive-cards/react** - React components and hooks
- **@adaptive-cards/renderer** - HTML rendering engine
- **@adaptive-cards/bot-framework** - Bot Framework integration
- **@adaptive-cards/ui** - Modern design system with Tailwind CSS
- **@adaptive-cards/storybook** - Component documentation and playground
- **adaptive-cards-demo** - Interactive demo application

## 🎯 Supported Elements

The framework supports 5+ core Adaptive Card elements:

✅ **TextBlock** - Rich text with styling options  
✅ **Image** - Images with sizing and alignment  
✅ **Container** - Layout containers with styling  
✅ **Input.Text** - Text input fields with validation  
✅ **ActionSet** - Collection of actions  

## 🎯 Supported Actions

✅ **Action.Submit** - Submit form data  
✅ **Action.OpenUrl** - Open external links  
✅ **Action.ShowCard** - Show/hide nested cards  

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd adaptive-cards-framework

# Install dependencies
npm install

# Build all packages
npm run build

# Start the demo
cd apps/demo
npm run dev

# Or start Storybook for design system
npm run storybook
```

### Basic Usage

```typescript
import { AdaptiveCard, createElement, createAction } from '@adaptive-cards/core';
import { AdaptiveCardRenderer } from '@adaptive-cards/react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@adaptive-cards/ui';
import '@adaptive-cards/ui/styles.css';

// Create a card programmatically
const card = new AdaptiveCard('1.5')
  .addElement(
    createElement.textBlock('Welcome to Adaptive Cards!')
      .setSize('large')
      .setWeight('bolder')
  )
  .addAction(
    createAction.submit()
      .setTitle('Get Started')
  );

// Render in React with design system
function MyComponent() {
  return (
    <Card variant="default" size="md">
      <CardHeader>
        <CardTitle>Welcome to Adaptive Cards</CardTitle>
      </CardHeader>
      <CardContent>
        <AdaptiveCardRenderer
          card={card}
          onAction={(action, data) => console.log('Action:', action, data)}
          onInputChange={(id, value) => console.log('Input:', id, value)}
        />
        <Button className="mt-4">Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

### Bot Framework Integration

```typescript
import { BotFrameworkAdapter } from '@adaptive-cards/bot-framework';

const adapter = new BotFrameworkAdapter();

// Send a card
await adapter.sendCard(context, {
  type: 'AdaptiveCard',
  version: '1.5',
  body: [
    {
      type: 'TextBlock',
      text: 'Hello from Bot Framework!',
      size: 'large'
    }
  ]
});
```

## 🌐 Live Demo

The demo application showcases all features:

- **Interactive Card Preview** - Real-time rendering
- **Sample Card Library** - 6 pre-built card examples  
- **Action Logging** - See all interactions in real-time
- **Responsive Design** - Works on desktop and mobile

Sample cards include:
- Welcome Card with branding
- Contact Form with validation
- Product Card for e-commerce
- System Notifications
- Weather Widget
- Simple Text Card

## 🏗️ Architecture

The framework follows a modular architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Bot Client    │    │  Server Side    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Package  │    │ Bot Framework   │    │ HTML Renderer   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Core & Parser │
                    └─────────────────┘
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Start demo in development
cd apps/demo && npm run dev

# Start Storybook for design system
npm run storybook

# Start UI package development
npm run design-system
```

## 📚 API Reference

### Core Classes

- `AdaptiveCard` - Main card class
- `TextBlockElement` - Text element with styling
- `ImageElement` - Image with sizing options  
- `ContainerElement` - Layout container
- `InputTextElement` - Text input field
- `ActionSetElement` - Action collection

### React Components

- `AdaptiveCardRenderer` - Main rendering component
- `AdaptiveCardProvider` - Context provider
- `TextBlock`, `Image`, `Container` - Individual element components

### Utilities

- `CardParser` - Parse JSON to AdaptiveCard
- `CardValidator` - Validate card structure
- `HtmlRenderer` - Server-side rendering

## 🚀 Deployment

The demo is ready for deployment on Vercel, Netlify, or any static hosting:

```bash
# Build for production
cd apps/demo
npm run build

# Preview the build
npm run preview
```

## ⚡ Performance

- **Bundle Size**: Optimized for minimal footprint
- **Tree Shaking**: Import only what you need
- **SSR Ready**: Server-side rendering support
- **Mobile First**: Responsive and touch-friendly

## 🤝 Contributing

This is an MVP built for rapid prototyping. Future improvements:

- Additional element types (ColumnSet, FactSet, etc.)
- Advanced styling and theming
- Animation and transition support
- Accessibility enhancements
- Performance optimizations

## 📄 License

MIT License - Built for rapid prototyping and learning

## 🎯 MVP Goals Achieved

✅ **6-Day Timeline** - Completed within constraint  
✅ **TypeScript Core** - Full type safety  
✅ **React Support** - Modern component library  
✅ **Bot Integration** - Ready for chatbots  
✅ **5+ Card Types** - All major elements supported  
✅ **Live Demo** - Interactive playground deployed  
✅ **Validation** - Comprehensive error handling  

---

**Built with React, TypeScript, and Vite** • [Learn more about Adaptive Cards](https://adaptivecards.io)