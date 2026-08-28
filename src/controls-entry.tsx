import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasRender } from './game/render/canvas-render';
import { useCanvas } from './components/useCanvas';
import { useSpriteAssets } from './components/useSpriteAssets';
import './index.css';

/**
 * Dedicated e2e entry for the controls-screen fidelity check (GOAL G1). Renders the
 * Python `menu_controls` sprite full-frame at (0,0) on the exact 800x480 logical
 * canvas over a black backdrop, matching the Python CONTROLS state
 * (`screen.fill((0,0,0)); screen.blit("menu_controls", (0,0))`).
 *
 * This is a separate Vite entry (controls.html) so the controls state does not ship
 * inside the main production app bundle.
 */
function ControlsEntry() {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    800,
    480,
    (ctx) => {
      const render = new CanvasRender(ctx, 800, 480);
      render.clear('#000');
      render.blitSprite('menu_controls', 0, 0, ['left', 'top']);
    },
    [ready],
  );
  if (!ready) return <div style={{ width: 800, height: 480, background: '#000' }} aria-busy="true" role="status" />;
  return <canvas ref={canvasRef} role="img" aria-label="Controls screen" />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: 800, height: 480, background: '#000' }}>
      <ControlsEntry />
    </div>
  </StrictMode>,
);
