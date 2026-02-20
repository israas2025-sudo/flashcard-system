import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BookOpen, Brain, BarChart3, Settings, Globe, Star } from 'lucide-react';
import { Tabs, TabsPanel } from './Tabs';

const meta: Meta<typeof Tabs> = {
  component: Tabs,
  title: 'Design System/Tabs',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-lg p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    items: [
      { value: 'overview', label: 'Overview' },
      { value: 'cards', label: 'Cards' },
      { value: 'stats', label: 'Statistics' },
    ],
    defaultValue: 'overview',
  },
};

// ---------------------------------------------------------------------------
// With Icons
// ---------------------------------------------------------------------------

export const WithIcons: Story = {
  args: {
    items: [
      { value: 'study', label: 'Study', icon: <BookOpen size={16} /> },
      { value: 'review', label: 'Review', icon: <Brain size={16} /> },
      { value: 'stats', label: 'Stats', icon: <BarChart3 size={16} /> },
      { value: 'settings', label: 'Settings', icon: <Settings size={16} /> },
    ],
    defaultValue: 'study',
  },
};

// ---------------------------------------------------------------------------
// With Disabled Tab
// ---------------------------------------------------------------------------

export const WithDisabledTab: Story = {
  args: {
    items: [
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' },
      { value: 'deleted', label: 'Deleted', disabled: true },
    ],
    defaultValue: 'active',
  },
};

// ---------------------------------------------------------------------------
// Animated Underline Demo (switch between tabs to see animation)
// ---------------------------------------------------------------------------

function AnimatedUnderlineDemo() {
  const [activeTab, setActiveTab] = useState('study');

  const items = [
    { value: 'study', label: 'Study', icon: <BookOpen size={16} /> },
    { value: 'review', label: 'Review', icon: <Brain size={16} /> },
    { value: 'stats', label: 'Stats', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div>
      <Tabs items={items} value={activeTab} onChange={setActiveTab} />
      <TabsPanel value="study" activeValue={activeTab}>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Start a new study session. You have <strong>17 cards</strong> due today.
        </p>
      </TabsPanel>
      <TabsPanel value="review" activeValue={activeTab}>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review your recently studied cards. Spaced repetition will help you
          retain information long-term.
        </p>
      </TabsPanel>
      <TabsPanel value="stats" activeValue={activeTab}>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View your learning statistics. You have a <strong>92%</strong> retention
          rate this week.
        </p>
      </TabsPanel>
    </div>
  );
}

export const AnimatedUnderline: Story = {
  render: () => <AnimatedUnderlineDemo />,
};

// ---------------------------------------------------------------------------
// Language Tabs (with icons)
// ---------------------------------------------------------------------------

export const LanguageTabs: Story = {
  args: {
    items: [
      { value: 'arabic', label: 'Arabic', icon: <Globe size={16} /> },
      { value: 'spanish', label: 'Spanish', icon: <Globe size={16} /> },
      { value: 'english', label: 'English', icon: <Globe size={16} /> },
    ],
    defaultValue: 'arabic',
  },
};

// ---------------------------------------------------------------------------
// Many Tabs
// ---------------------------------------------------------------------------

export const ManyTabs: Story = {
  args: {
    items: [
      { value: 'all', label: 'All' },
      { value: 'vocab', label: 'Vocabulary' },
      { value: 'grammar', label: 'Grammar' },
      { value: 'phrases', label: 'Phrases' },
      { value: 'conjugation', label: 'Conjugation' },
      { value: 'favorites', label: 'Favorites', icon: <Star size={16} /> },
    ],
    defaultValue: 'all',
  },
};

// ---------------------------------------------------------------------------
// Controlled Tabs with Panels
// ---------------------------------------------------------------------------

function ControlledTabsDemo() {
  const [value, setValue] = useState('overview');

  return (
    <div>
      <Tabs
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'cards', label: 'Cards' },
          { value: 'settings', label: 'Settings' },
        ]}
        value={value}
        onChange={setValue}
      />
      <TabsPanel value="overview" activeValue={value}>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            Deck Overview
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            248 total cards | 17 due | 92% retention
          </p>
        </div>
      </TabsPanel>
      <TabsPanel value="cards" activeValue={value}>
        <div className="space-y-2">
          {['Hello', 'Goodbye', 'Thank you'].map((word) => (
            <div
              key={word}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300"
            >
              {word}
            </div>
          ))}
        </div>
      </TabsPanel>
      <TabsPanel value="settings" activeValue={value}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure deck settings, review intervals, and notification preferences.
        </p>
      </TabsPanel>
    </div>
  );
}

export const ControlledWithPanels: Story = {
  render: () => <ControlledTabsDemo />,
};
