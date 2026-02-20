import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Design System/Badge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'error', 'info', 'language'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: { variant: 'default', label: 'Default' },
};

export const Success: Story = {
  args: { variant: 'success', label: 'Mastered' },
};

export const Warning: Story = {
  args: { variant: 'warning', label: 'Due Soon' },
};

export const Error: Story = {
  args: { variant: 'error', label: 'Overdue' },
};

export const Info: Story = {
  args: { variant: 'info', label: 'New' },
};

// ---------------------------------------------------------------------------
// Language Variants
// ---------------------------------------------------------------------------

export const LanguageArabic: Story = {
  args: { variant: 'language', label: 'Arabic' },
};

export const LanguageSpanish: Story = {
  args: { variant: 'language', label: 'Spanish' },
};

export const LanguageEnglish: Story = {
  args: { variant: 'language', label: 'English' },
};

export const LanguageMasri: Story = {
  args: { variant: 'language', label: 'Masri' },
};

export const LanguageEgyptian: Story = {
  args: { variant: 'language', label: 'Egyptian' },
};

export const LanguageUnknown: Story = {
  name: 'Language: Unknown (fallback)',
  args: { variant: 'language', label: 'French' },
};

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const SmallSize: Story = {
  args: { variant: 'success', label: 'SM', size: 'sm' },
};

export const MediumSize: Story = {
  args: { variant: 'success', label: 'MD', size: 'md' },
};

// ---------------------------------------------------------------------------
// Galleries
// ---------------------------------------------------------------------------

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" label="Default" />
      <Badge variant="success" label="Mastered" />
      <Badge variant="warning" label="Due Soon" />
      <Badge variant="error" label="Overdue" />
      <Badge variant="info" label="New" />
    </div>
  ),
};

export const AllLanguages: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="language" label="Arabic" />
      <Badge variant="language" label="Spanish" />
      <Badge variant="language" label="English" />
      <Badge variant="language" label="Masri" />
      <Badge variant="language" label="Egyptian" />
      <Badge variant="language" label="French" />
    </div>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge variant="info" label="Small" size="sm" />
      <Badge variant="info" label="Medium" size="md" />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// In Context
// ---------------------------------------------------------------------------

export const InCardContext: Story = {
  render: () => (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 max-w-sm">
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Arabic Vocab
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">248 cards</p>
      </div>
      <div className="flex gap-1.5">
        <Badge variant="language" label="Arabic" size="sm" />
        <Badge variant="success" label="92%" size="sm" />
      </div>
    </div>
  ),
};
