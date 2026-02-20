import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  component: Card,
  title: 'Design System/Card',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['flat', 'elevated', 'interactive'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Flat: Story = {
  args: {
    variant: 'flat',
    children: (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Flat Card
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A flat card with a subtle border and no shadow. Ideal for content that
          sits flush with the page layout.
        </p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Elevated Card
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          An elevated card with a subtle shadow. This is the default variant,
          suitable for most content panels.
        </p>
      </div>
    ),
  },
};

export const Interactive: Story = {
  args: {
    variant: 'interactive',
    children: (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Interactive Card
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Hover over this card to see the lift effect. Use for clickable items
          like deck previews or flashcard summaries.
        </p>
      </div>
    ),
  },
};

// ---------------------------------------------------------------------------
// With Header & Footer
// ---------------------------------------------------------------------------

export const WithHeaderAndFooter: Story = {
  args: {
    variant: 'elevated',
    header: (
      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
        Arabic Vocabulary
      </h3>
    ),
    footer: (
      <div className="flex justify-between text-sm text-gray-500">
        <span>42 cards</span>
        <span>Last reviewed: 2h ago</span>
      </div>
    ),
    children: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Core vocabulary flashcards for Modern Standard Arabic, covering the most
        frequently used words in everyday conversation.
      </p>
    ),
  },
};

// ---------------------------------------------------------------------------
// Padding variants
// ---------------------------------------------------------------------------

export const PaddingNone: Story = {
  args: {
    variant: 'elevated',
    padding: 'none',
    children: (
      <img
        src="https://placehold.co/400x200/6366f1/ffffff?text=No+Padding"
        alt="Placeholder"
        className="w-full rounded-xl"
      />
    ),
  },
};

export const PaddingSmall: Story = {
  args: {
    variant: 'flat',
    padding: 'sm',
    children: <p className="text-sm text-gray-600">Small padding (12px)</p>,
  },
};

export const PaddingLarge: Story = {
  args: {
    variant: 'elevated',
    padding: 'lg',
    children: (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Large padding (24px) for spacious layouts.
      </p>
    ),
  },
};

// ---------------------------------------------------------------------------
// All Variants Gallery
// ---------------------------------------------------------------------------

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['flat', 'elevated', 'interactive'] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {variant}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This card uses the <code className="font-mono">{variant}</code> variant.
          </p>
        </Card>
      ))}
    </div>
  ),
};
