import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent } from '@adaptive-cards/ui';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile badge component for displaying status, labels, and notifications with various styles and sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'success', 'warning', 'error', 'outline', 'ghost'],
      description: 'The visual variant of the badge',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the badge',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Default Badge',
  },
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different visual variants for various use cases and semantic meanings.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different sizes for various contexts and hierarchies.',
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Small</p>
        <Badge size="sm" variant="default">Small</Badge>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Medium</p>
        <Badge size="md" variant="default">Medium</Badge>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Large</p>
        <Badge size="lg" variant="default">Large</Badge>
      </div>
    </div>
  ),
};

export const StatusBadges: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Common status indicators with appropriate colors and meanings.',
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">System Status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Online</Badge>
          <Badge variant="warning">Maintenance</Badge>
          <Badge variant="error">Offline</Badge>
          <Badge variant="secondary">Pending</Badge>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Task Status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Completed</Badge>
          <Badge variant="warning">In Progress</Badge>
          <Badge variant="error">Failed</Badge>
          <Badge variant="outline">Not Started</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Priority Levels</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="error">High</Badge>
          <Badge variant="warning">Medium</Badge>
          <Badge variant="secondary">Low</Badge>
          <Badge variant="ghost">None</Badge>
        </div>
      </div>
    </div>
  ),
};

export const WithNumbers: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Badges displaying numerical values for counters and metrics.',
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Notification Badges</h3>
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Button variant="outline">Messages</Button>
            <Badge
              variant="error"
              size="sm"
              className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center px-1"
            >
              3
            </Badge>
          </div>
          
          <div className="relative">
            <Button variant="outline">Updates</Button>
            <Badge
              variant="success"
              size="sm"
              className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center px-1"
            >
              12
            </Badge>
          </div>
          
          <div className="relative">
            <Button variant="outline">Alerts</Button>
            <Badge
              variant="warning"
              size="sm"
              className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center px-1"
            >
              99+
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Metric Badges</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Score: 95</Badge>
          <Badge variant="warning">Items: 42</Badge>
          <Badge variant="outline">Views: 1,234</Badge>
          <Badge variant="secondary">Downloads: 567</Badge>
        </div>
      </div>
    </div>
  ),
};

export const InCards: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Badges integrated within card components for real-world usage examples.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Project Alpha</CardTitle>
              <p className="text-sm text-muted-foreground">Web Application</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Status:</span>
              <Badge variant="warning" size="sm">In Development</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Priority:</span>
              <Badge variant="error" size="sm">High</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Team Size:</span>
              <Badge variant="outline" size="sm">5 members</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Server Status</CardTitle>
              <p className="text-sm text-muted-foreground">Production Environment</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">CPU Usage:</span>
              <Badge variant="success" size="sm">Normal</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Memory:</span>
              <Badge variant="warning" size="sm">75%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Disk Space:</span>
              <Badge variant="error" size="sm">90%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Uptime:</span>
              <Badge variant="outline" size="sm">99.9%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive badges that respond to user actions.',
      },
    },
  },
  render: () => {
    const tags = ['React', 'TypeScript', 'Tailwind', 'Storybook', 'Design System'];
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Clickable Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => alert(`Clicked: ${tag}`)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Removable Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-muted transition-colors pr-1"
              >
                {tag}
                <button
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center text-xs"
                  onClick={() => alert(`Remove: ${tag}`)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  },
};