import type { Meta, StoryObj } from '@storybook/react';
import { ControlsScreen } from './ControlsScreen';

const meta: Meta<typeof ControlsScreen> = {
  title: 'Scenes/ControlsScreen',
  component: ControlsScreen,
  parameters: { layout: 'centered' },
  argTypes: {
    bindings: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof ControlsScreen>;

export const Default: Story = {
  args: { width: 800, height: 480, bindings: ['SPACE / Z', 'X', 'C', 'A'] },
};

export const GamepadBindings: Story = {
  args: { width: 800, height: 480, bindings: ['A (pad)', 'B (pad)', 'X (pad)', 'Y (pad)'] },
};
