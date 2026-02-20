import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  component: ProgressBar,
  title: 'Design System/ProgressBar',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['linear', 'circular'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    showLabel: { control: 'boolean' },
    animated: { control: 'boolean' },
    color: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

// ---------------------------------------------------------------------------
// Linear Variant
// ---------------------------------------------------------------------------

export const LinearDefault: Story = {
  args: {
    variant: 'linear',
    value: 45,
    showLabel: true,
  },
};

export const LinearSmall: Story = {
  args: { variant: 'linear', value: 60, size: 'sm' },
};

export const LinearMedium: Story = {
  args: { variant: 'linear', value: 60, size: 'md', showLabel: true },
};

export const LinearLarge: Story = {
  args: { variant: 'linear', value: 60, size: 'lg', showLabel: true },
};

// ---------------------------------------------------------------------------
// Circular Variant
// ---------------------------------------------------------------------------

export const CircularDefault: Story = {
  args: {
    variant: 'circular',
    value: 65,
    showLabel: true,
  },
};

export const CircularSmall: Story = {
  args: { variant: 'circular', value: 40, size: 'sm', showLabel: true },
};

export const CircularMedium: Story = {
  args: { variant: 'circular', value: 65, size: 'md', showLabel: true },
};

export const CircularLarge: Story = {
  args: { variant: 'circular', value: 85, size: 'lg', showLabel: true },
};

// ---------------------------------------------------------------------------
// Animated vs Static
// ---------------------------------------------------------------------------

export const Animated: Story = {
  args: { variant: 'linear', value: 70, animated: true, showLabel: true },
};

export const NotAnimated: Story = {
  args: { variant: 'linear', value: 70, animated: false, showLabel: true },
};

// ---------------------------------------------------------------------------
// Color Shift Thresholds (auto color based on value)
// ---------------------------------------------------------------------------

export const ColorShiftGreen: Story = {
  name: 'Color Shift: 0-49% (Green)',
  args: { variant: 'linear', value: 30, showLabel: true, size: 'lg' },
};

export const ColorShiftBlue: Story = {
  name: 'Color Shift: 50-74% (Blue)',
  args: { variant: 'linear', value: 60, showLabel: true, size: 'lg' },
};

export const ColorShiftGold: Story = {
  name: 'Color Shift: 75-100% (Gold)',
  args: { variant: 'linear', value: 90, showLabel: true, size: 'lg' },
};

export const ColorShiftProgression: Story = {
  name: 'Color Shift Progression',
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs text-gray-500">25%</span>
        <ProgressBar variant="linear" value={25} showLabel size="md" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs text-gray-500">50%</span>
        <ProgressBar variant="linear" value={50} showLabel size="md" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs text-gray-500">75%</span>
        <ProgressBar variant="linear" value={75} showLabel size="md" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs text-gray-500">100%</span>
        <ProgressBar variant="linear" value={100} showLabel size="md" />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Custom Color Override
// ---------------------------------------------------------------------------

export const CustomColor: Story = {
  args: {
    variant: 'linear',
    value: 55,
    color: 'bg-purple-500',
    showLabel: true,
  },
};

// ---------------------------------------------------------------------------
// Circular Gallery
// ---------------------------------------------------------------------------

export const CircularGallery: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <ProgressBar variant="circular" value={20} size="sm" showLabel />
      <ProgressBar variant="circular" value={55} size="md" showLabel />
      <ProgressBar variant="circular" value={88} size="lg" showLabel />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

export const ZeroProgress: Story = {
  args: { variant: 'linear', value: 0, showLabel: true },
};

export const FullProgress: Story = {
  args: { variant: 'linear', value: 100, showLabel: true },
};

export const OverflowClamp: Story = {
  name: 'Value > 100 (clamped)',
  args: { variant: 'linear', value: 150, showLabel: true },
};
