import type { Meta, StoryObj } from '@storybook/react';
import { IntroOutroText } from './IntroOutroText';

const SAMPLE = 'THE NOTORIOUS CRIME BOSS\nEBEN UPTON HAS STOLEN\nTHE BLOCKCHAIN\n\n\nFIGHT TO RECLAIM WHAT\nHAS BEEN TAKEN!';

const meta: Meta<typeof IntroOutroText> = {
  title: 'Scenes/IntroOutroText',
  component: IntroOutroText,
  parameters: { layout: 'centered' },
  argTypes: {
    textActive: { control: 'boolean' },
    timer: { control: { type: 'range', min: 0, max: 300, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof IntroOutroText>;

export const Active: Story = {
  args: { width: 800, height: 480, text: SAMPLE, displayedText: SAMPLE, textActive: true, timer: 0 },
};

export const FadingOut: Story = {
  args: { width: 800, height: 480, text: SAMPLE, textActive: false, timer: 200 },
};
