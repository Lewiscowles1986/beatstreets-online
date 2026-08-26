import { z } from 'zod';

/** Story text (was story.json): intro prefix, selectable stolen items, outro. */
export const StorySchema = z.object({
  intro_prefix: z.string(),
  stolen_items: z.array(z.string()),
  intro_suffix: z.string(),
  outro: z.string(),
});

export type Story = z.infer<typeof StorySchema>;
