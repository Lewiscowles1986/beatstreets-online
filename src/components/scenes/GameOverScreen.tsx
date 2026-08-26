import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';

export interface GameOverScreenProps {
  width?: number;
  height?: number;
  won?: boolean;
  score?: number;
  prompt?: string;
}

/**
 * The game-over screen: shows win/lose and the score. Presentational — the host
 * decides when to return to the title.
 */
export function GameOverScreen({
  width = 800,
  height = 480,
  won = false,
  score = 0,
  prompt = 'PRESS SPACE',
}: GameOverScreenProps) {
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.drawText(won ? 'YOU WIN!' : 'GAME OVER', width / 2, height / 2 - 20, true, '#fff');
      render.drawText(`SCORE ${score}`, width / 2, height / 2 + 20, true, '#ffd24d');
      render.drawText(prompt, width / 2, height - 60, true, '#fff');
    },
    [won, score, prompt],
  );

  return <canvas ref={canvasRef} role="img" aria-label="Game over screen" />;
}
