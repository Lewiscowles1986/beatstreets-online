import type { Meta, StoryObj } from '@storybook/react';
import { GameCanvas } from './GameCanvas';

/**
 * The full game host (title → controls → play → game-over, Konami + pause).
 * Stories freeze the loop at a deterministic timer so the canvas is stable for
 * screenshots; the playable flow itself is covered by the e2e gates
 * (cheat-navigation, cheat-konami, fidelity).
 */
const meta: Meta<typeof GameCanvas> = {
  title: 'Game/GameCanvas',
  component: GameCanvas,
  parameters: { layout: 'centered' },
  argTypes: {
    stage: { control: { type: 'range', min: 1, max: 29, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof GameCanvas>;

export const Default: Story = {
  args: { stage: 1, width: 800, height: 480, seed: 1, freezeAtTimer: 545 },
};

export const Canvas2D: Story = {
  args: { stage: 1, width: 800, height: 480, seed: 1, freezeAtTimer: 545, forceCanvas2D: true },
};

export const Debug: Story = {
  args: { stage: 1, width: 800, height: 480, seed: 1, freezeAtTimer: 545, debug: true },
};

export const LateStage: Story = {
  // Stage 29, the final confrontation (max_scroll_x 20500).
  args: { stage: 29, width: 800, height: 480, seed: 1, freezeAtTimer: 800 },
};