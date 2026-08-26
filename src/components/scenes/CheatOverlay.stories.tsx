import type { Meta, StoryObj } from '@storybook/react';
import { CheatOverlay } from './CheatOverlay';

const meta: Meta<typeof CheatOverlay> = {
  title: 'Scenes/CheatOverlay',
  component: CheatOverlay,
  parameters: { layout: 'centered' },
  argTypes: {
    cursor: { control: { type: 'range', min: 0, max: 2, step: 1 } },
    godMode: { control: 'boolean' },
    onePunch: { control: 'boolean' },
    stageSelect: { control: 'boolean' },
    stage: { control: { type: 'number', min: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof CheatOverlay>;

export const Menu: Story = {
  args: { width: 800, height: 480, cursor: 1, godMode: true, onePunch: false, stageSelect: false, stage: 1 },
};

export const StageSelectScreen: Story = {
  args: { width: 800, height: 480, cursor: 0, stageSelect: true, stage: 14 },
};
