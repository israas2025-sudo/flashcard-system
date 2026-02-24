import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Search, Mail, Lock } from 'lucide-react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Design System/Input',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error', 'success'],
    },
    rtl: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="max-w-sm p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

// ---------------------------------------------------------------------------
// Default States
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    label: 'Card Front',
    placeholder: 'Enter the term or question...',
    helperText: 'The front side of your flashcard.',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Card Front',
    value: 'Assalamu Alaikum',
    helperText: 'The front side of your flashcard.',
  },
};

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const ErrorState: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'name@example.com',
    errorMessage: 'Please enter a valid email address.',
    value: 'invalid-email',
  },
};

export const SuccessState: Story = {
  args: {
    label: 'Username',
    placeholder: 'Choose a username',
    variant: 'success',
    value: 'israa_flashcards',
    helperText: 'Username is available!',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Deck Name',
    placeholder: 'Cannot edit...',
    disabled: true,
    value: 'Arabic Basics',
  },
};

// ---------------------------------------------------------------------------
// With Icons
// ---------------------------------------------------------------------------

export const WithSearchIcon: Story = {
  args: {
    label: 'Search Cards',
    placeholder: 'Type to search...',
    icon: <Search size={16} />,
  },
};

export const WithMailIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'name@example.com',
    icon: <Mail size={16} />,
    type: 'email',
  },
};

export const WithPasswordIcon: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    icon: <Lock size={16} />,
    type: 'password',
  },
};

// ---------------------------------------------------------------------------
// RTL (Arabic)
// ---------------------------------------------------------------------------

export const RTLArabic: Story = {
  args: {
    label: 'Arabic Term',
    placeholder: '\u0627\u0643\u062A\u0628 \u0627\u0644\u0643\u0644\u0645\u0629 \u0647\u0646\u0627...',
    rtl: true,
    helperText: 'Enter the Arabic word or phrase.',
  },
};

export const RTLArabicWithIcon: Story = {
  args: {
    label: 'Search Arabic',
    placeholder: '\u0628\u062D\u062B...',
    rtl: true,
    icon: <Search size={16} />,
  },
};

export const RTLArabicError: Story = {
  args: {
    label: 'Arabic Input',
    placeholder: '\u0627\u0643\u062A\u0628...',
    rtl: true,
    value: '',
    errorMessage: 'This field is required.',
  },
};

// ---------------------------------------------------------------------------
// Full Width
// ---------------------------------------------------------------------------

export const FullWidth: Story = {
  args: {
    label: 'Full Width Input',
    placeholder: 'This input spans the full container width',
    fullWidth: true,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="max-w-lg p-6">
        <Story />
      </div>
    ),
  ],
};

// ---------------------------------------------------------------------------
// All States Gallery
// ---------------------------------------------------------------------------

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-sm">
      <Input label="Default" placeholder="Type something..." />
      <Input
        label="Error"
        placeholder="Invalid input"
        errorMessage="This field has an error."
        value="bad value"
      />
      <Input
        label="Success"
        variant="success"
        placeholder="Valid input"
        value="good value"
        helperText="Looks good!"
      />
      <Input
        label="Disabled"
        placeholder="Cannot edit"
        disabled
        value="Locked value"
      />
      <Input
        label="With Icon"
        placeholder="Search..."
        icon={<Search size={16} />}
      />
      <Input
        label="RTL Arabic"
        placeholder="\u0627\u0643\u062A\u0628..."
        rtl
      />
    </div>
  ),
};
