import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';
import { useSpriteAssets } from '../useSpriteAssets';

export interface TitleScreenProps {
  width?: number;
  height?: number;
  /** Frame counter used to alternate the two title logos. */
  frame?: number;
  /** Prompt shown under the logo. */
  prompt?: string;
}

/**
 * The title screen: an animated two-frame logo plus a "press to start" prompt.
 * Presentational — the host decides when to advance.
 */
export function TitleScreen({
  width = 800,
  height = 480,
  frame = 0,
  prompt = 'PRESS SPACE OR Z',
}: TitleScreenProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      const logo = frame % 40 < 20 ? 'title0' : 'title1';
      render.blitSprite(logo, width / 2, height / 2, ['center', 'center']);
      render.drawText(prompt, width / 2, height - 50, true, '#fff');
    },
    [frame, prompt, ready],
  );

  if (!ready) {
    return <div style={{ width, height }} aria-busy="true" role="status" />;
  }
  return <canvas ref={canvasRef} role="img" aria-label="Beat Streets title screen" />;
}
