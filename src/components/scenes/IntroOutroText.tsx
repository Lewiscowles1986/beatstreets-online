import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';
import { clamp } from '@beatstreets/engine';

export interface IntroOutroTextProps {
  width?: number;
  height?: number;
  /** The full story text being typed out. */
  text: string;
  /** How much of `text` is currently revealed. */
  displayedText?: string;
  /** True while the text overlay is active (opaque). */
  textActive?: boolean;
  /** Game timer used to fade the overlay out after the text is dismissed. */
  timer?: number;
}

/**
 * The intro/outro story overlay: a typewriter-revealed block of text on a black
 * backdrop, which fades away over ~255 frames after being dismissed (matching the
 * Python game). Presentational — the host owns the typing/fade timers.
 *
 * The story text is drawn with the game's per-glyph font sprites (Python `draw_text`)
 * at (50, 50), with `\n` advancing down 35px and resetting to the line start — the
 * glyphs are the game's red font, matching the Python intro frame.
 */
export function IntroOutroText({
  width = 800,
  height = 480,
  text,
  displayedText,
  textActive = true,
  timer = 0,
}: IntroOutroTextProps) {
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      const show = textActive || timer < 255;
      if (show) {
        const alpha = textActive ? 255 : clamp(255 - timer, 0, 255);
        render.fillRect(0, 0, width, height, `rgba(0,0,0,${alpha / 255})`);
        if (textActive) {
          render.drawGlyphText(displayedText ?? text, 50, 50);
        }
      }
    },
    [text, displayedText, textActive, timer],
  );

  return <canvas ref={canvasRef} role="img" aria-label="Story text" />;
}
