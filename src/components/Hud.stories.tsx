import type { Meta, StoryObj } from '@storybook/react';
import { Hud } from './Hud';

const meta: Meta<typeof Hud> = {
  title: 'Game/Hud',
  component: Hud,
  parameters: { layout: 'centered' },
  argTypes: {
    health: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    stamina: { control: { type: 'range', min: 0, max: 500, step: 1 } },
    lives: { control: { type: 'range', min: 0, max: 6, step: 1 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Hud>;

export const FullHealth: Story = {
  args: {
    health: 100,
    maxHealth: 100,
    stamina: 500,
    maxStamina: 500,
    lives: 3,
    score: 1200,
    debug: true,
  },
};

export const LowHealth: Story = {
  args: {
    health: 18,
    maxHealth: 100,
    stamina: 90,
    maxStamina: 500,
    lives: 1,
    score: 42,
    debug: true,
  },
};
