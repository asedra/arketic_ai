import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, Card, CardHeader, CardContent } from '@adaptive-cards/ui';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A skeleton component for loading states that provides visual placeholders while content is being fetched.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'shimmer', 'pulse', 'wave'],
      description: 'The animation variant of the skeleton',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    className: 'h-4 w-64',
  },
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different animation variants for various loading experiences.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div>
        <p className="text-sm font-medium mb-2">Default (Pulse)</p>
        <Skeleton className="h-4 w-full" variant="default" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Shimmer</p>
        <Skeleton className="h-4 w-full" variant="shimmer" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Pulse</p>
        <Skeleton className="h-4 w-full" variant="pulse" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Wave</p>
        <Skeleton className="h-4 w-full" variant="wave" />
      </div>
    </div>
  ),
};

export const Shapes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different shapes and sizes for various content types.',
      },
    },
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Text Lines</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/6" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Avatars</h3>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Images</h3>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Buttons</h3>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>
    </div>
  ),
};

export const CardSkeletons: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Skeleton layouts for different card types during loading states.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      {/* Profile Card Skeleton */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>

      {/* Article Card Skeleton */}
      <Card className="w-full">
        <CardContent className="p-0">
          <Skeleton className="h-48 w-full rounded-t-lg" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-4/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card Skeleton */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List Card Skeleton */}
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

export const DataTableSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Skeleton layout for data table loading state.',
      },
    },
  },
  render: () => (
    <div className="w-full max-w-4xl space-y-4">
      {/* Table Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      
      {/* Table Headers */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-18" />
      </div>
      
      {/* Table Rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  ),
};

export const FormSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Skeleton layout for form loading states.',
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <Skeleton className="h-8 w-48" />
      
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
      
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  ),
};

export const LoadingStates: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Different skeleton patterns for various loading durations.',
      },
    },
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Fast Loading (Shimmer)</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" variant="shimmer" />
          <Skeleton className="h-4 w-4/5" variant="shimmer" />
          <Skeleton className="h-4 w-3/5" variant="shimmer" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Medium Loading (Pulse)</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" variant="pulse" />
          <Skeleton className="h-4 w-4/5" variant="pulse" />
          <Skeleton className="h-4 w-3/5" variant="pulse" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Slow Loading (Wave)</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" variant="wave" />
          <Skeleton className="h-4 w-4/5" variant="wave" />
          <Skeleton className="h-4 w-3/5" variant="wave" />
        </div>
      </div>
    </div>
  ),
};