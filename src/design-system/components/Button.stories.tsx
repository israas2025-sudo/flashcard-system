import type { Meta, StoryObj } from '@storybook/react';
import { Plus, ArrowRight, Trash2, Download } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Design System/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Button' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost Button' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete' },
};

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const Small: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Small' },
};

export const Medium: Story = {
  args: { variant: 'primary', size: 'md', children: 'Medium' },
};

export const Large: Story = {
  args: { variant: 'primary', size: 'lg', children: 'Large' },
};

// ---------------------------------------------------------------------------
// All Variants x Sizes matrix
// ---------------------------------------------------------------------------

export const VariantSizeMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-3">
          <span className="w-24 text-sm font-medium text-gray-600 capitalize">
            {variant}
          </span>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button key={`${variant}-${size}`} variant={variant} size={size}>
              {size.toUpperCase()}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Disabled', disabled: true },
};

export const Loading: Story = {
  args: { variant: 'primary', children: 'Saving...', loading: true },
};

export const LoadingSecondary: Story = {
  args: { variant: 'secondary', children: 'Loading...', loading: true },
};

// ---------------------------------------------------------------------------
// With Icons
// ---------------------------------------------------------------------------

export const WithIconLeft: Story = {
  args: {
    variant: 'primary',
    children: 'Add Card',
    iconLeft: <Plus size={16} />,
  },
};

export const WithIconRight: Story = {
  args: {
    variant: 'primary',
    children: 'Continue',
    iconRight: <ArrowRight size={16} />,
  },
};

export const DangerWithIcon: Story = {
  args: {
    variant: 'danger',
    children: 'Delete Deck',
    iconLeft: <Trash2 size={16} />,
  },
};

export const IconBothSides: Story = {
  args: {
    variant: 'secondary',
    children: 'Export',
    iconLeft: <Download size={16} />,
    iconRight: <ArrowRight size={16} />,
  },
};

// ---------------------------------------------------------------------------
// Full Width
// ---------------------------------------------------------------------------

export const FullWidth: Story = {
  args: {
    variant: 'primary',
    children: 'Full Width Button',
    fullWidth: true,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
