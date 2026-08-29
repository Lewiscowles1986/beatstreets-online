import type { Meta, StoryObj } from '@storybook/react';
import { StageView } from './StageView';
import { loadResolvedStages } from '../game/data';

const stages = loadResolvedStages();

/** Story args are plain numbers; the render fn resolves the stage object from them. */
interface StageViewStoryArgs {
  /** 1-based stage number — experiment with any of the game's 29 stages. */
  stage: number;
  scrollOffsetX: number;
  width: number;
  height: number;
  debug: boolean;
}

const render = (args: StageViewStoryArgs) => {
  const resolved = stages.stages[Math.min(Math.max(args.stage, 1), stages.stages.length) - 1];
  return <StageView stage={resolved} scrollOffsetX={args.scrollOffsetX} width={args.width} height={args.height} debug={args.debug} />;
};

const meta: Meta<StageViewStoryArgs> = {
  title: 'Game/StageView',
  component: StageView,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    // The knob is the point of Storybook: pick any stage (1-29) and scroll into it,
    // instead of only the pre-named stories. Max scroll mirrors the game's widest
    // stage (stage 29, max_scroll_x 20500).
    stage: { control: { type: 'range', min: 1, max: 29, step: 1 } },
    scrollOffsetX: { control: { type: 'range', min: 0, max: 20500, step: 100 } },
    debug: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<StageViewStoryArgs>;

export const StageOne: Story = {
  args: { stage: 1, scrollOffsetX: 0, width: 800, height: 480, debug: true },
  render,
};

export const StageThreeBoss: Story = {
  args: { stage: 4, scrollOffsetX: 1200, width: 800, height: 480, debug: true },
  render,
};

export const StageFourteenPortal: Story = {
  args: { stage: 14, scrollOffsetX: 7700, width: 800, height: 480, debug: true },
  render,
};

export const StageFifteenPortal: Story = {
  // The first portal stage (python stage 15, max_scroll_x 8400): scroll sits the
  // portal (x 8900) mid-canvas instead of just off the right edge.
  args: { stage: 15, scrollOffsetX: 8300, width: 800, height: 480, debug: true },
  render,
};