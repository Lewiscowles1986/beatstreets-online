import type { Meta, StoryObj } from '@storybook/react';
import { StageList } from './StageList';

const meta: Meta<typeof StageList> = {
  title: 'Game/StageList',
  component: StageList,
  parameters: { layout: 'centered' },
  argTypes: {
    scrollOffsetX: { control: { type: 'range', min: 0, max: 10000, step: 100 } },
    count: { control: { type: 'range', min: 1, max: 29, step: 1 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StageList>;

export const FirstFiveStages: Story = {
  args: { count: 5, scrollOffsetX: 0, width: 800, height: 480, debug: true },
};

export const FirstThreeScrolled: Story = {
  args: { count: 3, scrollOffsetX: 1800, width: 800, height: 480, debug: true },
};

export const LateGameStages: Story = {
  args: { count: 29, scrollOffsetX: 20500, width: 800, height: 480, debug: true },
};
