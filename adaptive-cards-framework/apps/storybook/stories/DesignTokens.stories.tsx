import type { Meta, StoryObj } from '@storybook/react';
import { tokens } from '@adaptive-cards/ui';

const meta: Meta = {
  title: 'Design System/Design Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Design tokens are the foundation of the Adaptive Cards Framework design system. They define colors, typography, spacing, shadows, and other visual properties used throughout the components.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Colors showcase
export const Colors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Color palette including brand colors, semantic colors, and neutral grays. All colors are designed to meet WCAG AA accessibility standards.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Brand Colors</h2>
        <p className="text-muted-foreground mb-6">Primary brand colors based on Microsoft Blue (#0078D4)</p>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
          {Object.entries(tokens.colors.brand).map(([key, value]) => (
            <div key={key} className="text-center">
              <div
                className="w-16 h-16 rounded-lg shadow-sm border mb-2"
                style={{ backgroundColor: value }}
              />
              <div className="text-xs font-mono">{key}</div>
              <div className="text-xs text-muted-foreground font-mono">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Success Colors</h2>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
          {Object.entries(tokens.colors.success).map(([key, value]) => (
            <div key={key} className="text-center">
              <div
                className="w-16 h-16 rounded-lg shadow-sm border mb-2"
                style={{ backgroundColor: value }}
              />
              <div className="text-xs font-mono">{key}</div>
              <div className="text-xs text-muted-foreground font-mono">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Warning Colors</h2>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
          {Object.entries(tokens.colors.warning).map(([key, value]) => (
            <div key={key} className="text-center">
              <div
                className="w-16 h-16 rounded-lg shadow-sm border mb-2"
                style={{ backgroundColor: value }}
              />
              <div className="text-xs font-mono">{key}</div>
              <div className="text-xs text-muted-foreground font-mono">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Error Colors</h2>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
          {Object.entries(tokens.colors.error).map(([key, value]) => (
            <div key={key} className="text-center">
              <div
                className="w-16 h-16 rounded-lg shadow-sm border mb-2"
                style={{ backgroundColor: value }}
              />
              <div className="text-xs font-mono">{key}</div>
              <div className="text-xs text-muted-foreground font-mono">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Neutral Colors</h2>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
          {Object.entries(tokens.colors.neutral).map(([key, value]) => (
            <div key={key} className="text-center">
              <div
                className="w-16 h-16 rounded-lg shadow-sm border mb-2"
                style={{ backgroundColor: value }}
              />
              <div className="text-xs font-mono">{key}</div>
              <div className="text-xs text-muted-foreground font-mono">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Typography showcase
export const Typography: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Typography scale with system fonts optimized for cross-platform consistency and readability.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Font Sizes</h2>
        <div className="space-y-4">
          {Object.entries(tokens.typography.fontSize).map(([key, [size, properties]]) => (
            <div key={key} className="flex items-baseline gap-4 py-2 border-b border-border/50">
              <div className="w-16 text-sm font-mono text-muted-foreground">{key}</div>
              <div className="w-20 text-xs font-mono text-muted-foreground">{size}</div>
              <div 
                className="flex-1 font-sans" 
                style={{ 
                  fontSize: size,
                  lineHeight: typeof properties === 'object' ? properties.lineHeight : undefined
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Font Weights</h2>
        <div className="space-y-3">
          {Object.entries(tokens.typography.fontWeight).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-24 text-sm font-mono text-muted-foreground">{key} ({value})</div>
              <div className="text-lg" style={{ fontWeight: value }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Font Families</h2>
        <div className="space-y-4">
          {Object.entries(tokens.typography.fontFamily).map(([key, fonts]) => (
            <div key={key} className="space-y-2">
              <div className="text-sm font-medium">{key}</div>
              <div className="text-xs font-mono text-muted-foreground pl-4">
                {Array.isArray(fonts) ? fonts.join(', ') : fonts}
              </div>
              <div 
                className="text-lg pl-4" 
                style={{ fontFamily: Array.isArray(fonts) ? fonts.join(', ') : fonts }}
              >
                The quick brown fox jumps over the lazy dog 0123456789
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Spacing showcase
export const Spacing: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Spacing scale based on 4px grid system for consistent layouts and visual rhythm.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Spacing Scale</h2>
        <p className="text-muted-foreground mb-6">Based on 4px grid system</p>
        <div className="space-y-3">
          {Object.entries(tokens.spacing).slice(0, 20).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-12 text-sm font-mono text-muted-foreground">{key}</div>
              <div className="w-20 text-xs font-mono text-muted-foreground">{value}</div>
              <div className="flex items-center">
                <div 
                  className="bg-primary h-4"
                  style={{ width: value }}
                />
                <div className="ml-2 text-xs text-muted-foreground">
                  {parseFloat(value) * 16}px
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Shadows showcase
export const Shadows: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shadow system for creating depth and elevation hierarchy following Microsoft Fluent design principles.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Elevation Shadows</h2>
        <p className="text-muted-foreground mb-6">Microsoft Fluent-inspired elevation system</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(tokens.shadows)
            .filter(([key]) => key.startsWith('elevation'))
            .map(([key, value]) => (
            <div key={key} className="text-center">
              <div 
                className="w-24 h-24 bg-card rounded-lg mx-auto mb-3 flex items-center justify-center"
                style={{ boxShadow: value }}
              >
                <span className="text-sm font-medium">{key}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">{key}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Standard Shadows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tokens.shadows)
            .filter(([key]) => !key.startsWith('elevation'))
            .map(([key, value]) => (
            <div key={key} className="text-center">
              <div 
                className="w-20 h-20 bg-card rounded-lg mx-auto mb-3 flex items-center justify-center"
                style={{ boxShadow: value === 'none' ? 'none' : value }}
              >
                <span className="text-xs font-medium">{key}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">{key}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Border radius showcase
export const BorderRadius: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Border radius scale for consistent corner rounding across components.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Border Radius</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Object.entries(tokens.borderRadius).map(([key, value]) => (
            <div key={key} className="text-center">
              <div 
                className="w-20 h-20 bg-muted border mx-auto mb-3 flex items-center justify-center"
                style={{ borderRadius: value }}
              >
                <span className="text-xs font-medium">{key}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">{key}</div>
              <div className="text-xs text-muted-foreground">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Breakpoints showcase
export const Breakpoints: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Responsive breakpoints for mobile-first design approach.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Responsive Breakpoints</h2>
        <p className="text-muted-foreground mb-6">Mobile-first breakpoint system</p>
        <div className="space-y-4">
          {Object.entries(tokens.breakpoints).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-12 text-lg font-semibold">{key}</div>
              <div className="flex-1">
                <div className="font-mono text-sm">{value}</div>
                <div className="text-xs text-muted-foreground">
                  {key === 'xs' && 'Extra small devices (phones)'}
                  {key === 'sm' && 'Small devices (tablets)'}
                  {key === 'md' && 'Medium devices (small laptops)'}
                  {key === 'lg' && 'Large devices (desktops)'}
                  {key === 'xl' && 'Extra large devices (large desktops)'}
                  {key === '2xl' && 'Extra extra large devices (larger desktops)'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {parseInt(value)}px and up
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Usage Example</h2>
        <div className="p-4 bg-muted/50 rounded-lg">
          <code className="text-sm">
            {`<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <!-- Responsive grid content -->
</div>`}
          </code>
        </div>
      </div>
    </div>
  ),
};

// Component tokens showcase
export const ComponentTokens: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Component-specific design tokens for consistent sizing and spacing across UI elements.',
      },
    },
  },
  render: () => (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Button Tokens</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Padding</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(tokens.components.button.padding).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="bg-primary text-primary-foreground rounded-md mx-auto mb-2 flex items-center justify-center text-sm font-medium"
                    style={{ padding: value }}
                  >
                    {key}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Font Sizes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(tokens.components.button.fontSize).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="bg-secondary text-secondary-foreground rounded-md p-3 mx-auto mb-2 flex items-center justify-center font-medium"
                    style={{ fontSize: value }}
                  >
                    {key}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Card Tokens</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Padding</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(tokens.components.card.padding).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="bg-card border rounded-lg mx-auto mb-2 flex items-center justify-center text-sm"
                    style={{ padding: value }}
                  >
                    {key}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Shadows</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(tokens.components.card.shadow).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="w-24 h-24 bg-card border rounded-lg mx-auto mb-2 flex items-center justify-center text-sm"
                    style={{ boxShadow: value }}
                  >
                    {key}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{key}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Input Tokens</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Sizes</h3>
            <div className="space-y-3">
              {Object.entries(tokens.components.input.padding).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium">{key}</div>
                  <input 
                    type="text" 
                    placeholder={`${key} input`}
                    className="border rounded-md bg-background"
                    style={{ padding: value }}
                    readOnly
                  />
                  <div className="text-xs font-mono text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};