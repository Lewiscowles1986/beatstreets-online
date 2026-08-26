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
  name: 'Default (A=space, B=x)',
  args: { buttonKeys: [' ', 'x', 'c', 'a'] },
};

export const AltBindings: Story = {
  name: 'Alt (A=j, B=k)',
  args: { buttonKeys: ['j', 'k', 'l', ';'] },
};
