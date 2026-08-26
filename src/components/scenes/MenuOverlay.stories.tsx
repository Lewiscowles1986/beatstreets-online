import type { Meta, StoryObj } from '@storybook/react';
import { MenuOverlay } from './MenuOverlay';

const meta: Meta<typeof MenuOverlay> = {
  title: 'Scenes/MenuOverlay',
  component: MenuOverlay,
  parameters: { layout: 'centered' },
  argTypes: {
    cursor: { control: { type: 'range', min: 0, max: 3, step: 1 } },
    subScreen: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof MenuOverlay>;

export const PauseMenu: Story = {
  args: {
    width: 800,
    height: 480,
    title: 'PAUSED',
    items: [{ label: 'RESUME' }, { label: 'QUIT' }],
    cursor: 0,
    hint: 'UP/DOWN SELECT   SPACE CONFIRM   ESC RESUME',
    ariaLabel: 'Pause menu',
  },
};

export const CheatMenu: Story = {
  args: {
    width: 800,
    height: 480,
    title: 'CHEAT MENU',
    items: [
      { label: 'STAGE SELECT' },
      { label: 'GOD MODE', status: 'OFF' },
      { label: 'ONE PUNCH', status: 'ON' },
    ],
    cursor: 1,
    hint: 'UP/DOWN SELECT   SPACE CONFIRM   X CLOSE',
    ariaLabel: 'Cheat menu',
  },
};

export const StageSelect: Story = {
  args: {
    width: 800,
    height: 480,
    title: 'STAGE SELECT',
    items: [{ label: 'STAGE 01' }],
    cursor: 0,
    subScreen: true,
    hint: 'UP/DOWN PICK   SPACE JUMP   X BACK',
    ariaLabel: 'Stage select',
  },
};
