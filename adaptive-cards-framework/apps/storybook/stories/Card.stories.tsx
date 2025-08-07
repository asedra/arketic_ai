import type { Meta, StoryObj } from '@storybook/react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  Button,
  Badge
} from '@adaptive-cards/ui';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component that serves as the foundation for displaying content in the Adaptive Cards Framework. Supports multiple variants, sizes, and interactive states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'emphasis', 'accent', 'success', 'warning', 'error', 'ghost'],
      description: 'The visual variant of the card',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'The padding size of the card',
    },
    elevation: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: 'The shadow elevation level',
    },
    interactive: {
      control: 'boolean',
      description: 'Whether the card is interactive (clickable)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// Basic card examples
export const Default: Story = {
  args: {
    variant: 'default',
    size: 'md',
    elevation: 'sm',
    interactive: false,
  },
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Default Card</CardTitle>
        <CardDescription>
          This is a default card with standard styling and elevation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card. You can put any content here.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different visual variants for semantic meaning and visual hierarchy.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
      <Card variant="default" className="w-full">
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Standard card appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Default variant for general content.</p>
        </CardContent>
      </Card>

      <Card variant="emphasis" className="w-full">
        <CardHeader>
          <CardTitle>Emphasis</CardTitle>
          <CardDescription>Highlighted card for important content</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Emphasis variant draws attention.</p>
        </CardContent>
      </Card>

      <Card variant="accent" className="w-full">
        <CardHeader>
          <CardTitle>Accent</CardTitle>
          <CardDescription>Accent color for branding</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Accent variant uses brand colors.</p>
        </CardContent>
      </Card>

      <Card variant="success" className="w-full">
        <CardHeader>
          <CardTitle>Success</CardTitle>
          <CardDescription>Success state indication</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Success variant for positive feedback.</p>
        </CardContent>
      </Card>

      <Card variant="warning" className="w-full">
        <CardHeader>
          <CardTitle>Warning</CardTitle>
          <CardDescription>Warning state indication</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Warning variant for cautionary content.</p>
        </CardContent>
      </Card>

      <Card variant="error" className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Error state indication</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Error variant for error states.</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different padding sizes for various content densities.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 w-full max-w-2xl">
      <Card size="sm" className="w-full">
        <CardHeader>
          <CardTitle>Small Card</CardTitle>
          <CardDescription>Compact padding for dense layouts</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Small size with minimal padding.</p>
        </CardContent>
      </Card>

      <Card size="md" className="w-full">
        <CardHeader>
          <CardTitle>Medium Card</CardTitle>
          <CardDescription>Standard padding for most use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Medium size with standard padding.</p>
        </CardContent>
      </Card>

      <Card size="lg" className="w-full">
        <CardHeader>
          <CardTitle>Large Card</CardTitle>
          <CardDescription>Generous padding for important content</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Large size with generous padding.</p>
        </CardContent>
      </Card>

      <Card size="xl" className="w-full">
        <CardHeader>
          <CardTitle>Extra Large Card</CardTitle>
          <CardDescription>Maximum padding for hero content</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Extra large size with maximum padding.</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Elevations: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different shadow elevations to create visual hierarchy and depth.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-3 gap-8 w-full max-w-4xl">
      <Card elevation="none" className="w-full">
        <CardHeader>
          <CardTitle>No Shadow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Flat appearance without shadow.</p>
        </CardContent>
      </Card>

      <Card elevation="sm" className="w-full">
        <CardHeader>
          <CardTitle>Small Shadow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Subtle shadow for minimal elevation.</p>
        </CardContent>
      </Card>

      <Card elevation="md" className="w-full">
        <CardHeader>
          <CardTitle>Medium Shadow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Standard shadow for general content.</p>
        </CardContent>
      </Card>

      <Card elevation="lg" className="w-full">
        <CardHeader>
          <CardTitle>Large Shadow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Prominent shadow for important content.</p>
        </CardContent>
      </Card>

      <Card elevation="xl" className="w-full">
        <CardHeader>
          <CardTitle>Extra Large Shadow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Maximum shadow for hero content.</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive cards with hover and focus states for clickable content.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
      <Card interactive className="w-full cursor-pointer">
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>Click me to see the interaction</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has hover and focus states.</p>
          <Badge variant="success" className="mt-2">Clickable</Badge>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Non-interactive Card</CardTitle>
          <CardDescription>Standard card without interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has no interactive states.</p>
          <Badge variant="secondary" className="mt-2">Static</Badge>
        </CardContent>
      </Card>
    </div>
  ),
};

export const ComplexExample: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A complex card example with multiple elements and actions.',
      },
    },
  },
  render: () => (
    <Card className="w-96" elevation="md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Project Update</CardTitle>
            <CardDescription>Latest updates on the adaptive cards project</CardDescription>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Progress</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
          <p className="text-xs text-muted-foreground">75% Complete</p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
              JD
            </div>
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs text-secondary-foreground font-medium">
              AS
            </div>
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-xs text-accent-foreground font-medium">
              MR
            </div>
          </div>
        </div>
        
        <div className="pt-2">
          <p className="text-sm">
            The design system implementation is progressing well with all core components completed.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">View Details</Button>
        <Button size="sm">Update Status</Button>
      </CardFooter>
    </Card>
  ),
};

export const ResponsiveGrid: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Cards in a responsive grid layout demonstrating various use cases.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>View your performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24,597</div>
          <p className="text-xs text-muted-foreground">+12% from last month</p>
        </CardContent>
      </Card>

      <Card variant="emphasis">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Total revenue this quarter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$45,230</div>
          <p className="text-xs text-muted-foreground">+8% from last quarter</p>
        </CardContent>
      </Card>

      <Card variant="success">
        <CardHeader>
          <CardTitle>Goal Achieved</CardTitle>
          <CardDescription>Monthly target completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">100%</div>
          <p className="text-xs text-muted-foreground">3 days ahead of schedule</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Pending items to review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">5 high priority</p>
        </CardContent>
        <CardFooter>
          <Button size="sm" className="w-full">View All</Button>
        </CardFooter>
      </Card>

      <Card variant="warning">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-sm">Maintenance Mode</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Scheduled maintenance in progress</p>
        </CardContent>
      </Card>

      <Card interactive>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Create New Project
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Import Data
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};