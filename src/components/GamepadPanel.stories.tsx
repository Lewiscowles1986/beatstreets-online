import type { Meta, StoryObj } from '@storybook/react';
import { GamepadPanel } from './GamepadPanel';

const meta: Meta<typeof GamepadPanel> = {
  title: 'Input/GamepadPanel',
  component: GamepadPanel,
  parameters: { layout: 'centered' },
  argTypes: {
    width: { control: { type: 'range', min: 220, max: 600, step: 10 } },
  },
};

export default meta;
type Story = StoryObj<typeof GamepadPanel>;

export const Live: Story = { args: { width: 320 } };
