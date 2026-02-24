import '../src/app/globals.css';
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FFFFFF' },
        { name: 'dark', value: '#0F0F1A' },
      ],
    },
  },
};

export default preview;
