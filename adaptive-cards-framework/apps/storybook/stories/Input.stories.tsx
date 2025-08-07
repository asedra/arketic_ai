import type { Meta, StoryObj } from '@storybook/react';
import { Input, Button } from '@adaptive-cards/ui';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible input component with validation states, sizes, and accessibility features built-in.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error'],
      description: 'The visual variant of the input',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the input',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your text...',
  },
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different visual variants for validation states.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm font-medium mb-1">Default</label>
        <Input placeholder="Default input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Success</label>
        <Input variant="success" placeholder="Success input" value="Valid input!" readOnly />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Warning</label>
        <Input variant="warning" placeholder="Warning input" value="Check this input" readOnly />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Error</label>
        <Input variant="error" placeholder="Error input" value="Invalid input" readOnly />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different sizes for various use cases.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm font-medium mb-1">Small</label>
        <Input size="sm" placeholder="Small input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Medium (Default)</label>
        <Input size="md" placeholder="Medium input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Large</label>
        <Input size="lg" placeholder="Large input" />
      </div>
    </div>
  ),
};

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different interactive states of the input.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm font-medium mb-1">Normal</label>
        <Input placeholder="Type something..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Disabled</label>
        <Input disabled placeholder="Disabled input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Read Only</label>
        <Input readOnly value="Read only value" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">With Value</label>
        <Input defaultValue="Prefilled value" />
      </div>
    </div>
  ),
};

export const WithLabelsAndHelp: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Inputs with labels, help text, and error messages.',
      },
    },
  },
  render: () => (
    <div className="space-y-6 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="mb-1"
        />
        <p className="text-xs text-muted-foreground">
          We'll never share your email with anyone else.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          variant="error"
          className="mb-1"
        />
        <p className="text-xs text-error">
          Password must be at least 8 characters long.
        </p>
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-1">
          Username
        </label>
        <Input
          id="username"
          placeholder="Choose a username"
          variant="success"
          defaultValue="john_doe"
          className="mb-1"
        />
        <p className="text-xs text-success">
          Username is available!
        </p>
      </div>
    </div>
  ),
};

export const InteractiveForm: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A complete interactive form example with validation.',
      },
    },
  },
  render: () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      message: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
      const newErrors: Record<string, string> = {};
      
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.message.trim()) {
        newErrors.message = 'Message is required';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validateForm()) {
        alert('Form submitted successfully!');
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        <div>
          <label htmlFor="form-name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <Input
            id="form-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your full name"
            variant={errors.name ? 'error' : 'default'}
          />
          {errors.name && (
            <p className="text-xs text-error mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="form-email" className="block text-sm font-medium mb-1">
            Email *
          </label>
          <Input
            id="form-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            variant={errors.email ? 'error' : 'default'}
          />
          {errors.email && (
            <p className="text-xs text-error mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="form-message" className="block text-sm font-medium mb-1">
            Message *
          </label>
          <Input
            id="form-message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Your message"
            variant={errors.message ? 'error' : 'default'}
          />
          {errors.message && (
            <p className="text-xs text-error mt-1">{errors.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full">
          Submit Form
        </Button>
      </form>
    );
  },
};