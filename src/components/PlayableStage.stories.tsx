import type { Meta, StoryObj } from '@storybook/react';
import { PlayableStage } from './PlayableStage';

const meta: Meta<typeof PlayableStage> = {
  title: 'Game/PlayableStage',
  component: PlayableStage,
  parameters: { layout: 'centered' },
  argTypes: {
    stage: { control: { type: 'range', min: 1, max: 29, step: 1 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PlayableStage>;

export const StageOne: Story = {
  args: { stage: 1, width: 800, height: 480, debug: true },
};

export const StageFourteenPortal: Story = {
  args: { stage: 14, width: 800, height: 480, debug: true },
};
