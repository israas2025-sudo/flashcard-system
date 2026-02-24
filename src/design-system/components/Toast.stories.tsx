import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';

const meta: Meta<typeof ToastProvider> = {
  component: ToastProvider,
  title: 'Design System/Toast',
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ToastProvider>;

// ---------------------------------------------------------------------------
// Trigger helpers — each story uses a button to fire a toast
// ---------------------------------------------------------------------------

function ToastTrigger({
  type,
  title,
  description,
}: {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}) {
  const { toast } = useToast();

  return (
    <button
      type="button"
      onClick={() => toast({ type, title, description })}
      className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
    >
      Show {type} toast
    </button>
  );
}

// ---------------------------------------------------------------------------
// Individual Types
// ---------------------------------------------------------------------------

export const Success: Story = {
  render: () => (
    <ToastTrigger
      type="success"
      title="Card saved"
      description="Your flashcard has been saved successfully."
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ToastTrigger
      type="error"
      title="Save failed"
      description="Could not save the card. Please try again."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ToastTrigger
      type="warning"
      title="Review overdue"
      description="You have 12 cards past their review date."
    />
  ),
};

export const Info: Story = {
  render: () => (
    <ToastTrigger
      type="info"
      title="Sync complete"
      description="All decks are now up to date."
    />
  ),
};

// ---------------------------------------------------------------------------
// Title Only (no description)
// ---------------------------------------------------------------------------

export const TitleOnly: Story = {
  render: () => <ToastTrigger type="success" title="Deck exported!" />,
};

// ---------------------------------------------------------------------------
// All Types Gallery
// ---------------------------------------------------------------------------

function AllTypesDemo() {
  const { toast } = useToast();

  const types = ['success', 'error', 'warning', 'info'] as const;

  return (
    <div className="flex flex-wrap gap-3">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() =>
            toast({
              type,
              title: `${type.charAt(0).toUpperCase() + type.slice(1)} notification`,
              description: `This is a ${type} toast message with a description.`,
            })
          }
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors capitalize"
        >
          {type}
        </button>
      ))}
    </div>
  );
}

export const AllTypes: Story = {
  render: () => <AllTypesDemo />,
};

// ---------------------------------------------------------------------------
// Stacking
// ---------------------------------------------------------------------------

function StackingDemo() {
  const { toast } = useToast();
  let count = 0;

  return (
    <button
      type="button"
      onClick={() => {
        count += 1;
        toast({
          type: (['success', 'error', 'warning', 'info'] as const)[count % 4],
          title: `Toast #${count}`,
          description: 'Toasts stack up to a maximum of 3 visible at once.',
        });
      }}
      className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
    >
      Add stacking toast
    </button>
  );
}

export const Stacking: Story = {
  render: () => <StackingDemo />,
};

// ---------------------------------------------------------------------------
// Dismissable
// ---------------------------------------------------------------------------

function DismissDemo() {
  const { toast, dismissAll } = useToast();

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() =>
          toast({
            type: 'info',
            title: 'Persistent toast',
            description: 'Click "Dismiss All" to clear.',
            duration: 60000,
          })
        }
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
      >
        Add toast (60s)
      </button>
      <button
        type="button"
        onClick={dismissAll}
        className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
      >
        Dismiss All
      </button>
    </div>
  );
}

export const DismissAll: Story = {
  render: () => <DismissDemo />,
};
