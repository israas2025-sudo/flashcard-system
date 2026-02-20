import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  component: Modal,
  title: 'Design System/Modal',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    isOpen: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// ---------------------------------------------------------------------------
// Helper wrapper — controlled open/close state
// ---------------------------------------------------------------------------

function ModalDemo({
  size,
  title,
  children,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
      >
        Open {size ?? 'md'} modal
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        size={size}
      >
        {children}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

export const Small: Story = {
  render: () => (
    <ModalDemo size="sm" title="Confirm Delete">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Are you sure you want to delete this flashcard? This action cannot be
        undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
          Cancel
        </button>
        <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition-colors">
          Delete
        </button>
      </div>
    </ModalDemo>
  ),
};

export const Medium: Story = {
  render: () => (
    <ModalDemo size="md" title="Edit Card">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This is a medium-sized modal, suitable for forms and general content
        panels.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Front
          </label>
          <input
            type="text"
            defaultValue="Hello"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Back
          </label>
          <input
            type="text"
            defaultValue="Merhaba"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
      </div>
    </ModalDemo>
  ),
};

export const Large: Story = {
  render: () => (
    <ModalDemo size="lg" title="Deck Statistics">
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
        <p>
          Large modals are ideal for detailed content like statistics dashboards,
          lists, or multi-step forms.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Cards', value: '248' },
            { label: 'Due Today', value: '17' },
            { label: 'Retention', value: '92%' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center"
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {value}
              </div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </ModalDemo>
  ),
};

export const ExtraLarge: Story = {
  render: () => (
    <ModalDemo size="xl" title="Import Cards">
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
        <p>
          Extra-large modals work well for complex workflows such as import/export
          wizards or side-by-side previews.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
            <p className="text-gray-400">Drop CSV file here</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </p>
            <p className="text-gray-400">No file selected</p>
          </div>
        </div>
      </div>
    </ModalDemo>
  ),
};

// ---------------------------------------------------------------------------
// No Title
// ---------------------------------------------------------------------------

export const NoTitle: Story = {
  render: () => (
    <ModalDemo size="sm">
      <div className="text-center py-4">
        <div className="text-4xl mb-3">&#127881;</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Congratulations!
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You finished all your reviews for today.
        </p>
      </div>
    </ModalDemo>
  ),
};

// ---------------------------------------------------------------------------
// With Form Content
// ---------------------------------------------------------------------------

export const WithFormContent: Story = {
  render: () => (
    <ModalDemo size="md" title="Create New Deck">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deck Name
          </label>
          <input
            type="text"
            placeholder="e.g., Arabic Vocabulary"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Optional deck description..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Language
          </label>
          <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <option>Arabic (MSA)</option>
            <option>Arabic (Egyptian)</option>
            <option>Spanish</option>
            <option>English</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Create Deck
          </button>
        </div>
      </form>
    </ModalDemo>
  ),
};

// ---------------------------------------------------------------------------
// All Sizes Gallery
// ---------------------------------------------------------------------------

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <ModalDemo key={size} size={size} title={`${size.toUpperCase()} Modal`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This modal uses the <code className="font-mono">{size}</code> size preset.
          </p>
        </ModalDemo>
      ))}
    </div>
  ),
};
