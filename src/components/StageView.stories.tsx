import type { Meta, StoryObj } from '@storybook/react';
import { StageView } from './StageView';
import { loadResolvedStages } from '../game/data';

const stages = loadResolvedStages();

const meta: Meta<typeof StageView> = {
  title: 'Game/StageView',
  component: StageView,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scrollOffsetX: { control: { type: 'range', min: 0, max: 4000, step: 100 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StageView>;

export const StageOne: Story = {
  args: {
    stage: stages.stages[0],
    scrollOffsetX: 0,
    width: 800,
    height: 480,
    debug: true,
  },
};

export const StageThreeBoss: Story = {
  args: {
    stage: stages.stages[3],
    scrollOffsetX: 1200,
    width: 800,
    height: 480,
    debug: true,
  },
};

export const StageFourteenPortal: Story = {
  args: {
    stage: stages.stages[14],
    scrollOffsetX: 8000,
    width: 800,
    height: 480,
    debug: true,
  },
};
