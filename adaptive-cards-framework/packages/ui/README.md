# Adaptive Cards UI Design System

A comprehensive, accessible, and modern design system for the Adaptive Cards Framework. Built with React, TypeScript, and Tailwind CSS.

## Features

🎨 **Modern Design Language** - Microsoft Fluent-inspired design with primary brand color #0078D4  
♿ **Accessibility First** - WCAG AA compliant with proper ARIA support and keyboard navigation  
📱 **Mobile-First Responsive** - Optimized for all screen sizes with touch-friendly interactions  
🌙 **Dark Mode Support** - Automatic theme switching with system preference detection  
🎯 **TypeScript Ready** - Full type safety and excellent developer experience  
⚡ **Performance Optimized** - Lightweight components with minimal bundle impact  

## Installation

```bash
npm install @adaptive-cards/ui
```

## Quick Start

```tsx
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@adaptive-cards/ui';
import '@adaptive-cards/ui/styles.css';

function App() {
  return (
    <Card variant="default" size="md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Project Status</CardTitle>
          <Badge variant="success">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p>Your project is running smoothly with all systems operational.</p>
        <Button className="mt-4" leftIcon={<PlusIcon />}>
          Add New Task
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Components

### Card Components
- **Card** - Flexible container with variants (default, emphasis, accent, success, warning, error)
- **CardHeader** - Header section with title and description
- **CardTitle** - Semantic heading component
- **CardDescription** - Secondary text for descriptions
- **CardContent** - Main content area
- **CardFooter** - Action area with proper spacing

### Button Components
- **Button** - Comprehensive button system with loading states and icons
- Variants: default, destructive, outline, secondary, ghost, link, success, warning, error
- Sizes: sm, md, lg, xl, icon
- States: loading, disabled, interactive

### Form Components
- **Input** - Text input with validation states and helper text
- **Textarea** - Multi-line text input with resize options
- Accessibility: proper labeling, error states, keyboard navigation

### Feedback Components
- **Badge** - Status indicators and labels
- **StatusBadge** - Semantic status with dots
- **NotificationBadge** - Count and notification indicators
- **Skeleton** - Loading state placeholders

## Design Tokens

### Colors
```tsx
// Brand colors (Microsoft Blue)
brand: {
  500: '#0078D4', // Primary
  // ... full palette
}

// Semantic colors
success: '#10B981'
warning: '#F59E0B'  
error: '#EF4444'
```

### Typography
```tsx
// System font stack
fontFamily: {
  sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', ...]
}

// Responsive sizing
fontSize: {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  // ... full scale
}
```

### Spacing
Based on 4px grid system for consistent layouts:
```tsx
spacing: {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  // ... full scale
}
```

## Accessibility

All components are built with accessibility in mind:

- **WCAG AA Compliance** - Proper color contrast ratios
- **Keyboard Navigation** - Tab order and focus management
- **Screen Reader Support** - ARIA labels and semantic HTML
- **Focus Indicators** - Visible focus rings on all interactive elements
- **High Contrast Mode** - Support for Windows high contrast

## Dark Mode

Automatic dark mode support through CSS custom properties:

```tsx
// Wrap your app with theme detection
<div className={isDark ? 'dark' : ''}>
  <Card>Content adapts automatically</Card>
</div>
```

## Customization

### CSS Custom Properties
```css
:root {
  --primary: 207 100% 42%;      /* Microsoft Blue */
  --secondary: 210 40% 96%;
  --success: 142.1 76.2% 36.3%;
  --warning: 32.1 94.6% 43.7%;
  --error: 0 84.2% 60.2%;
  --radius: 0.5rem;
}

.dark {
  --primary: 217.2 91.2% 59.8%;
  /* ... dark theme values */
}
```

### Tailwind Configuration
Add to your `tailwind.config.js`:

```js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@adaptive-cards/ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#0078D4'
        }
      }
    }
  }
}
```

### Component Variants
Extend components with class-variance-authority:

```tsx
import { cva } from 'class-variance-authority';
import { Button } from '@adaptive-cards/ui';

const customButtonVariants = cva('', {
  variants: {
    intent: {
      primary: 'bg-brand-500 text-white',
      secondary: 'bg-gray-200 text-gray-900',
    }
  }
});

function CustomButton({ intent, ...props }) {
  return (
    <Button 
      className={customButtonVariants({ intent })}
      {...props}
    />
  );
}
```

## Examples

### Form Example
```tsx
<Card>
  <CardHeader>
    <CardTitle>Contact Form</CardTitle>
    <CardDescription>Get in touch with our team</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Input 
      label="Name" 
      required 
      placeholder="Enter your name"
    />
    <Input 
      label="Email" 
      type="email" 
      required 
      placeholder="Enter your email"
    />
    <Textarea 
      label="Message" 
      required 
      placeholder="Enter your message"
    />
  </CardContent>
  <CardFooter className="flex justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button>Send Message</Button>
  </CardFooter>
</Card>
```

### Status Dashboard
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Card variant="success">
    <CardHeader>
      <CardTitle>System Status</CardTitle>
      <StatusBadge status="active">Online</StatusBadge>
    </CardHeader>
    <CardContent>
      <p>All systems operational</p>
    </CardContent>
  </Card>

  <Card variant="warning">
    <CardHeader>
      <CardTitle>Maintenance</CardTitle>
      <StatusBadge status="pending">Scheduled</StatusBadge>
    </CardHeader>
    <CardContent>
      <p>Maintenance scheduled for tonight</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Performance</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">99.9%</div>
      <p className="text-sm text-muted-foreground">Uptime</p>
    </CardContent>
  </Card>
</div>
```

### Loading States
```tsx
function LoadingExample() {
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Processing</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <p>Process your data with our advanced algorithms.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          loading={loading}
          loadingText="Processing..."
          onClick={() => setLoading(!loading)}
        >
          {loading ? 'Processing' : 'Start Process'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build components
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## Storybook

Interactive component documentation:

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the established patterns
2. Ensure accessibility compliance
3. Add proper TypeScript types
4. Include Storybook stories
5. Write tests for new components

## License

MIT License