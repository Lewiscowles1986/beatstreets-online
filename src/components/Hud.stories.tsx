import type { Meta, StoryObj } from '@storybook/react';
import { Hud } from './Hud';

const meta: Meta<typeof Hud> = {
  title: 'Game/Hud',
  component: Hud,
  parameters: { layout: 'centered' },
  argTypes: {
    health: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    maxHealth: { control: { type: 'number', min: 1, step: 1 } },
    stamina: { control: { type: 'range', min: 0, max: 500, step: 1 } },
    maxStamina: { control: { type: 'number', min: 1, step: 1 } },
    lives: { control: { type: 'range', min: 0, max: 6, step: 1 } },
    score: { control: { type: 'number', min: 0, step: 1 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Hud>;

/** All values configurable from the Controls panel. */
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

/** A nearly-exhausted player — every value editable in Controls. */
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

/** Edge: zero health/stamina, no lives. */
export const Empty: Story = {
  args: {
    health: 0,
    maxHealth: 100,
    stamina: 0,
    maxStamina: 500,
    lives: 0,
    score: 0,
    debug: true,
  },
};
