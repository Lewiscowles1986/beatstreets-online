import type { Meta, StoryObj } from '@storybook/react';
import { SpecOverview } from './SpecOverview';

const meta: Meta<typeof SpecOverview> = {
  title: 'Game/SpecOverview',
  component: SpecOverview,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SpecOverview>;

export const LoadedSpec: Story = {};
