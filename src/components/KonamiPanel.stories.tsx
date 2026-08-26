import type { Meta, StoryObj } from '@storybook/react';
import { KonamiPanel } from './KonamiPanel';

const meta: Meta<typeof KonamiPanel> = {
  title: 'Game/KonamiPanel',
  component: KonamiPanel,
  parameters: { layout: 'centered' },
  argTypes: {
    buttonKeys: {
      control: { type: 'object' },
      description: 'Keyboard codes for the 4 game buttons (punch/kick/elbow/flying-kick).',
    },
  },
};

export default meta;
type Story = StoryObj<typeof KonamiPanel>;

export const DefaultKeyboard: Story = {
  args: { buttonKeys: [' ', 'x', 'c', 'a'] },
};

export const AltBindings: Story = {
  args: { buttonKeys: ['j', 'k', 'l', ';'] },
};
