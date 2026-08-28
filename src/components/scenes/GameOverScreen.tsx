import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';
import { useSpriteAssets } from '../useSpriteAssets';

export interface GameOverScreenProps {
  width?: number;
  height?: number;
  /** True when the player beat all the stages (python `check_won`). */
  won?: boolean;
  /** Kept for API compatibility; the Python game-over screen does not draw the score. */
  score?: number;
}

/**
 * The game-over screen, matching the Python GAME_OVER state exactly:
 * `screen.blit(status_win | status_lose, centred)` — both bitmaps are 800x480 and
 * fully opaque, so the centred blit lands at (0,0) over the black-cleared base
 * canvas. Python draws nothing else on this screen (no score, no prompt): the
 * result art carries the message, and any button returns to the title.
 */
export function GameOverScreen({ width = 800, height = 480, won = false }: GameOverScreenProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.blitSprite(won ? 'status_win' : 'status_lose', 0, 0, ['left', 'top']);
    },
    [won, ready],
  );

  if (!ready) {
    return <div style={{ width, height, background: '#000' }} aria-busy="true" role="status" />;
  }
  return <canvas ref={canvasRef} role="img" aria-label="Game over screen" />;
}