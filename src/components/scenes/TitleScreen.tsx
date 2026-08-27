import { CanvasRender } from '../../game/render/canvas-render';
import { config } from '../../game/data';
import { invertSpecialSymbols, titleLogoName } from '../../game/title';
import { useCanvas } from '../useCanvas';
import { useSpriteAssets } from '../useSpriteAssets';

export interface TitleScreenProps {
  width?: number;
  height?: number;
  /** Frame counter used to alternate the two title logos. */
  frame?: number;
  /** Prompt shown under the logo (defaults to the config `TITLE_PROMPT`). */
  prompt?: string;
}

/**
 * The title screen: an animated two-frame logo plus a "press to start" prompt.
 * Presentational — the host decides when to advance.
 *
 * The logo alternates every `TITLE_LOGO_SWAP_FRAMES` frames (Python:
 * `total_frames // 20 % 2`), and the prompt is drawn with the game's per-glyph font
 * sprites (Python `draw_text`), with the `%` special symbol replaced by the green
 * `xb_a` A-button image inline.
 */
export function TitleScreen({
  width = 800,
  height = 480,
  frame = 0,
  prompt,
}: TitleScreenProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const cfg = config();
      const render = new CanvasRender(ctx, width, height);
      // The Python title state blits the logo onto a black surface, so the logo's
      // semi-transparent glow composites onto black. Clear the canvas to black first so
      // the compositing happens inside the canvas (matching pygame's blit) rather than
      // relying on the page backdrop behind a transparent canvas.
      render.clear('#000');
      const logo = titleLogoName(frame, cfg.TITLE_LOGO_SWAP_FRAMES);
      render.blitSprite(logo, width / 2, height / 2, ['center', 'center']);
      render.drawGlyphText(prompt ?? cfg.TITLE_PROMPT, width / 2, height - cfg.TITLE_PROMPT_Y_OFFSET, {
        centered: true,
        specialSymbols: invertSpecialSymbols(cfg.SPECIAL_FONT_SYMBOLS),
      });
    },
    [frame, prompt, ready],
  );

  if (!ready) {
    return <div style={{ width, height }} aria-busy="true" role="status" />;
  }
  return <canvas ref={canvasRef} role="img" aria-label="Beat Streets title screen" />;
}
