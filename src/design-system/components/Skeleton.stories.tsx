import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  component: Skeleton,
  title: 'Design System/Skeleton',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
    },
    width: { control: 'text' },
    height: { control: 'text' },
    lines: { control: { type: 'range', min: 1, max: 10, step: 1 } },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

// ---------------------------------------------------------------------------
// Text Variant
// ---------------------------------------------------------------------------

export const TextSingleLine: Story = {
  args: { variant: 'text' },
};

export const TextMultipleLines: Story = {
  args: { variant: 'text', lines: 3 },
};

export const TextFiveLines: Story = {
  args: { variant: 'text', lines: 5 },
};

export const TextCustomWidth: Story = {
  args: { variant: 'text', width: '200px', lines: 2 },
};

// ---------------------------------------------------------------------------
// Circular Variant
// ---------------------------------------------------------------------------

export const CircularDefault: Story = {
  args: { variant: 'circular' },
};

export const CircularSmall: Story = {
  args: { variant: 'circular', width: 24 },
};

export const CircularLarge: Story = {
  args: { variant: 'circular', width: 64 },
};

export const CircularExtraLarge: Story = {
  args: { variant: 'circular', width: 96 },
};

// ---------------------------------------------------------------------------
// Rectangular Variant
// ---------------------------------------------------------------------------

export const RectangularDefault: Story = {
  args: { variant: 'rectangular' },
};

export const RectangularCard: Story = {
  args: { variant: 'rectangular', width: '100%', height: 200 },
};

export const RectangularThumbnail: Story = {
  args: { variant: 'rectangular', width: 120, height: 80 },
};

// ---------------------------------------------------------------------------
// Composition: Card Loading State
// ---------------------------------------------------------------------------

export const CardLoadingSkeleton: Story = {
  render: () => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      {/* Image placeholder */}
      <Skeleton variant="rectangular" height={160} />
      {/* Text block */}
      <Skeleton variant="text" lines={3} />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Composition: List Loading State
// ---------------------------------------------------------------------------

export const ListLoadingSkeleton: Story = {
  render: () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
        >
          <Skeleton variant="circular" width={32} />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" />
          </div>
          <Skeleton variant="rectangular" width={60} height={24} />
        </div>
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Composition: Flashcard Loading State
// ---------------------------------------------------------------------------

export const FlashcardLoadingSkeleton: Story = {
  render: () => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-sm mx-auto space-y-4">
      {/* Language badge */}
      <div className="flex justify-between items-center">
        <Skeleton variant="rectangular" width={60} height={20} />
        <Skeleton variant="rectangular" width={40} height={20} />
      </div>
      {/* Main content area */}
      <div className="py-8 space-y-3 text-center">
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="60%" />
      </div>
      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="rectangular" width={80} height={36} />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// All Variants Gallery
// ---------------------------------------------------------------------------

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Text
        </h3>
        <Skeleton variant="text" lines={3} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Circular
        </h3>
        <div className="flex gap-4">
          <Skeleton variant="circular" width={24} />
          <Skeleton variant="circular" width={40} />
          <Skeleton variant="circular" width={64} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Rectangular
        </h3>
        <Skeleton variant="rectangular" height={100} />
      </div>
    </div>
  ),
};
