import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@adaptive-cards/ui';

// Mock icons for demonstration
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component that supports multiple variants, sizes, and states. Built with accessibility in mind and supports loading states, icons, and full-width layouts.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning', 'error'],
      description: 'The visual variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button should take full width',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Basic button
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
};

// All variants
export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different button variants for various semantic meanings and visual hierarchy.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="error">Error</Button>
    </div>
  ),
};

// All sizes
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different button sizes for various use cases and content hierarchies.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon">
        <PlusIcon />
      </Button>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Buttons with left and right icons for enhanced visual communication.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button leftIcon={<PlusIcon />}>
        Add Item
      </Button>
      <Button rightIcon={<ArrowRightIcon />}>
        Continue
      </Button>
      <Button leftIcon={<DownloadIcon />} variant="outline">
        Download
      </Button>
      <Button size="icon" variant="ghost">
        <PlusIcon />
      </Button>
    </div>
  ),
};

// Loading states
export const LoadingStates: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Buttons in loading state with spinner and optional loading text.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button loading>
        Loading...
      </Button>
      <Button loading loadingText="Submitting...">
        Submit
      </Button>
      <Button loading variant="outline">
        Processing
      </Button>
      <Button loading variant="secondary" size="sm">
        Save
      </Button>
    </div>
  ),
};

// Disabled states
export const DisabledStates: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Disabled buttons across different variants to show proper accessibility states.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button disabled>Default Disabled</Button>
      <Button disabled variant="outline">Outline Disabled</Button>
      <Button disabled variant="secondary">Secondary Disabled</Button>
      <Button disabled variant="ghost">Ghost Disabled</Button>
      <Button disabled leftIcon={<PlusIcon />}>
        With Icon Disabled
      </Button>
    </div>
  ),
};

// Full width buttons
export const FullWidth: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Full-width buttons for form submissions and prominent actions.',
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-3">
      <Button fullWidth>
        Primary Action
      </Button>
      <Button fullWidth variant="outline">
        Secondary Action
      </Button>
      <Button fullWidth variant="ghost">
        Tertiary Action
      </Button>
    </div>
  ),
};

// Interactive example
export const InteractiveExample: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive example demonstrating button behavior and states.',
      },
    },
  },
  render: () => {
    const handleClick = () => {
      alert('Button clicked!');
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Button onClick={handleClick}>
            Click Me
          </Button>
          <Button variant="outline" onClick={handleClick}>
            Click Me Too
          </Button>
        </div>
        
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-3">
            Try clicking the buttons above to see the click handler in action.
          </p>
          <div className="flex gap-2">
            <Button size="sm" leftIcon={<PlusIcon />} onClick={handleClick}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={handleClick}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClick}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  },
};

// Form example
export const FormExample: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Example of buttons in a form context with proper spacing and hierarchy.',
      },
    },
  },
  render: () => (
    <div className="w-96 p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Contact Form</h3>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Enter your name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Enter your email"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea 
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[100px] resize-y"
            placeholder="Enter your message"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          Cancel
        </Button>
        <Button>
          Send Message
        </Button>
      </div>
    </div>
  ),
};

// Button group example
export const ButtonGroups: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Examples of button groups and combinations for various UI patterns.',
      },
    },
  },
  render: () => (
    <div className="space-y-6">
      {/* Primary + Secondary */}
      <div>
        <h4 className="text-sm font-medium mb-3">Primary + Secondary</h4>
        <div className="flex gap-3">
          <Button>Save Changes</Button>
          <Button variant="outline">Cancel</Button>
        </div>
      </div>

      {/* Action toolbar */}
      <div>
        <h4 className="text-sm font-medium mb-3">Action Toolbar</h4>
        <div className="flex gap-2">
          <Button size="sm" leftIcon={<PlusIcon />}>New</Button>
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="outline">Duplicate</Button>
          <Button size="sm" variant="destructive">Delete</Button>
        </div>
      </div>

      {/* Status actions */}
      <div>
        <h4 className="text-sm font-medium mb-3">Status Actions</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="success">Approve</Button>
          <Button size="sm" variant="warning">Review</Button>
          <Button size="sm" variant="error">Reject</Button>
        </div>
      </div>

      {/* Navigation */}
      <div>
        <h4 className="text-sm font-medium mb-3">Navigation</h4>
        <div className="flex justify-between">
          <Button variant="outline" size="sm">
            ← Previous
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm">1</Button>
            <Button size="sm">2</Button>
            <Button variant="ghost" size="sm">3</Button>
            <Button variant="ghost" size="sm">...</Button>
            <Button variant="ghost" size="sm">10</Button>
          </div>
          <Button variant="outline" size="sm">
            Next →
          </Button>
        </div>
      </div>
    </div>
  ),
};