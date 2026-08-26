import type { Meta, StoryObj } from '@storybook/react';
import { AudioPanel } from './AudioPanel';

const meta: Meta<typeof AudioPanel> = {
  title: 'Audio/AudioPanel',
  component: AudioPanel,
  parameters: { layout: 'centered' },
  argTypes: {
    width: { control: { type: 'range', min: 220, max: 600, step: 10 } },
  },
};

export default meta;
type Story = StoryObj<typeof AudioPanel>;

export const Live: Story = { args: { width: 300 } };
