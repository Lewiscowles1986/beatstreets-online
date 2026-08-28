import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasRender } from './game/render/canvas-render';
import { useCanvas } from './components/useCanvas';
import { useSpriteAssets } from './components/useSpriteAssets';
import './index.css';

/**
 * Dedicated e2e entry for the game-over fidelity check (GOAL G2). Renders the Python
 * `status_win`/`status_lose` sprite centred on the exact 800x480 logical canvas over
 * a black backdrop, matching the Python GAME_OVER state
 * (`screen.blit(img, (WIDTH//2 - img.get_width()//2, HEIGHT//2 - img.get_height()//2))`).
 * Both status sprites are 800x480, so the centred blit lands at (0,0).
 *
 * The result is read from the URL (?result=win|lose). This is a separate Vite entry
 * (gameover.html) so the game-over state does not ship inside the main production app
 * bundle.
 */
const params = new URLSearchParams(window.location.search);
const result = params.get('result') === 'win' ? 'win' : 'lose';
const sprite = result === 'win' ? 'status_win' : 'status_lose';

function GameOverEntry() {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    800,
    480,
    (ctx) => {
      const render = new CanvasRender(ctx, 800, 480);
      render.clear('#000');
      render.blitSprite(sprite, 0, 0, ['left', 'top']);
    },
    [ready, sprite],
  );
  if (!ready) return <div style={{ width: 800, height: 480, background: '#000' }} aria-busy="true" role="status" />;
  return <canvas ref={canvasRef} role="img" aria-label="Game over screen" />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: 800, height: 480, background: '#000' }}>
      <GameOverEntry />
    </div>
  </StrictMode>,
);
