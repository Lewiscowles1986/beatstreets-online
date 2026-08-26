import type { Meta, StoryObj } from '@storybook/react';
import { GameOverScreen } from './GameOverScreen';

const meta: Meta<typeof GameOverScreen> = {
  title: 'Scenes/GameOverScreen',
  component: GameOverScreen,
  parameters: { layout: 'centered' },
  argTypes: {
    won: { control: 'boolean' },
    score: { control: { type: 'number', min: 0 } },
  },
};

export default meta;
type Story = StoryObj<typeof GameOverScreen>;

export const Lose: Story = { args: { width: 800, height: 480, won: false, score: 1200 } };
export const Win: Story = { args: { width: 800, height: 480, won: true, score: 99999 } };
