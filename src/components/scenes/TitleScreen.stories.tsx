import type { Meta, StoryObj } from '@storybook/react';
import { TitleScreen } from './TitleScreen';

const meta: Meta<typeof TitleScreen> = {
  title: 'Scenes/TitleScreen',
  component: TitleScreen,
  parameters: { layout: 'centered' },
  argTypes: {
    frame: { control: { type: 'range', min: 0, max: 80, step: 1 } },
    prompt: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof TitleScreen>;

export const LogoOne: Story = { args: { width: 800, height: 480, frame: 0 } };
export const LogoTwo: Story = { args: { width: 800, height: 480, frame: 20 } };
