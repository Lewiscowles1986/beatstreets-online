import type { Meta, StoryObj } from '@storybook/react';
import { WebSocketPanel } from './WebSocketPanel';

const meta: Meta<typeof WebSocketPanel> = {
  title: 'Input/WebSocketPanel',
  component: WebSocketPanel,
  parameters: { layout: 'centered' },
  argTypes: {
    defaultUrl: { control: 'text' },
    width: { control: { type: 'range', min: 220, max: 600, step: 10 } },
  },
};

export default meta;
type Story = StoryObj<typeof WebSocketPanel>;

export const Live: Story = { args: { defaultUrl: 'ws://localhost:8080', width: 320 } };
