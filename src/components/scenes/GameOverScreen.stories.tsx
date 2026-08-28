import type { Meta, StoryObj } from '@storybook/react';
import { GameOverScreen } from './GameOverScreen';

const meta: Meta<typeof GameOverScreen> = {
  title: 'Scenes/GameOverScreen',
  component: GameOverScreen,
  parameters: { layout: 'centered' },
  argTypes: {
    won: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof GameOverScreen>;

export const Lose: Story = { args: { width: 800, height: 480, won: false } };
export const Win: Story = { args: { width: 800, height: 480, won: true } };
