import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagChip } from './TagChip';

const meta: Meta<typeof TagChip> = {
  component: TagChip,
  title: 'Design System/TagChip',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    removable: { control: 'boolean' },
    color: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof TagChip>;

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: { label: 'vocabulary' },
};

export const SmallSize: Story = {
  args: { label: 'grammar', size: 'sm' },
};

export const MediumSize: Story = {
  args: { label: 'vocabulary', size: 'md' },
};

// ---------------------------------------------------------------------------
// Colors (hash-derived from label)
// ---------------------------------------------------------------------------

export const ColorVariations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TagChip label="vocabulary" />
      <TagChip label="grammar" />
      <TagChip label="conjugation" />
      <TagChip label="pronunciation" />
      <TagChip label="idioms" />
      <TagChip label="slang" />
      <TagChip label="formal" />
      <TagChip label="beginner" />
    </div>
  ),
};

export const CustomColor: Story = {
  args: {
    label: 'custom',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  },
};

// ---------------------------------------------------------------------------
// Sizes gallery
// ---------------------------------------------------------------------------

export const SizeComparison: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <TagChip label="small" size="sm" />
      <TagChip label="medium" size="md" />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Removable
// ---------------------------------------------------------------------------

export const Removable: Story = {
  args: {
    label: 'removable tag',
    removable: true,
    onRemove: fn(),
  },
};

export const RemovableSmall: Story = {
  args: {
    label: 'delete me',
    removable: true,
    size: 'sm',
    onRemove: fn(),
  },
};

export const RemovableGroup: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TagChip label="Arabic" removable onRemove={() => {}} />
      <TagChip label="Spanish" removable onRemove={() => {}} />
      <TagChip label="English" removable onRemove={() => {}} />
      <TagChip label="Egyptian Dialect" removable onRemove={() => {}} />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Clickable
// ---------------------------------------------------------------------------

export const Clickable: Story = {
  args: {
    label: 'click me',
    onClick: fn(),
  },
};

// ---------------------------------------------------------------------------
// RTL Arabic Tags
// ---------------------------------------------------------------------------

export const ArabicTag: Story = {
  args: {
    label: '\u0645\u0641\u0631\u062F\u0627\u062A',
  },
};

export const ArabicRemovable: Story = {
  args: {
    label: '\u0642\u0648\u0627\u0639\u062F',
    removable: true,
    onRemove: fn(),
  },
};

export const ArabicTagGroup: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2" dir="rtl">
      <TagChip label="\u0645\u0641\u0631\u062F\u0627\u062A" />
      <TagChip label="\u0642\u0648\u0627\u0639\u062F" />
      <TagChip label="\u0635\u0631\u0641" />
      <TagChip label="\u0646\u0637\u0642" />
      <TagChip label="\u0639\u0627\u0645\u064A\u0629 \u0645\u0635\u0631\u064A\u0629" removable onRemove={() => {}} />
    </div>
  ),
};

export const MixedLanguageTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TagChip label="vocabulary" />
      <TagChip label="\u0645\u0641\u0631\u062F\u0627\u062A" />
      <TagChip label="gramática" />
      <TagChip label="\u0642\u0648\u0627\u0639\u062F" />
      <TagChip label="beginner" />
    </div>
  ),
};
