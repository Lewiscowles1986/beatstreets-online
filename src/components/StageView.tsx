import { CanvasRender } from '../game/render/canvas-render';
import { Stage } from '@beatstreets/engine';
import { config } from '../game/data';
import { useCanvas } from './useCanvas';
import { useSpriteAssets } from './useSpriteAssets';
import { spriteFor } from './spriteFor';

export interface StageViewProps {
  /** The resolved stage to render. */
  stage: Stage;
  /** World scroll offset in px (0 = left edge of the stage). */
  scrollOffsetX?: number;
  /** Canvas width in CSS px. */
  width?: number;
  /** Canvas height in CSS px. */
  height?: number;
  /** Show a debug marker under each entity. */
  debug?: boolean;
}

/**
 * Renders a single stage from its (resolved) DSL spec onto a canvas: the same road +
 * background tiles the game draws (`draw_background` port), then enemies, weapons and
 * powerups, each drawn as its sprite. Waits for the shared sprite preloader before
 * drawing so sprites actually appear. This is the "compose a stage from JSON" view.
 */
export function StageView({
  stage,
  scrollOffsetX = 0,
  width = 800,
  height = 480,
  debug = false,
}: StageViewProps) {
  const { ready } = useSpriteAssets();

  const canvasRef = useCanvas(width, height, (ctx) => {
    const render = new CanvasRender(ctx, width, height);
    const cfg = config();
    // The game's scrolling world: road wrapped by scroll offset, then background
    // tiles laid out left->right (GameCanvas.drawBackground port) — without this the
    // story showed a black void whenever the stage's entities sat beyond the viewport.
    const road1x = -(scrollOffsetX % cfg.WIDTH);
    render.blitSprite('road', road1x, 0, ['left', 'top']);
    render.blitSprite('road', road1x + cfg.WIDTH, 0, ['left', 'top']);
    let posX = -scrollOffsetX - cfg.BACKGROUND_TILE_SPACING;
    for (const tile of cfg.BACKGROUND_TILES) {
      if (posX + 417 >= 0) {
        render.blitSprite(tile, posX, 0, ['left', 'top']);
        posX += cfg.BACKGROUND_TILE_SPACING;
        if (posX >= cfg.WIDTH) break;
      } else {
        posX += cfg.BACKGROUND_TILE_SPACING;
      }
    }

    const drawEntity = (type: string, pos: [number, number], colour: string) => {
      const x = pos[0] - scrollOffsetX;
      if (x < -200 || x > width + 200) return; // off-screen cull
      render.blitSprite(spriteFor(type), x, pos[1]);
      if (debug) {
        render.drawCircle(x, pos[1], 5, colour);
        render.drawText(type, x, pos[1] + 8, true, colour);
      }
    };

    for (const e of stage.enemies) drawEntity(e.type, e.pos as [number, number], '#ff6666');
    for (const w of stage.weapons) drawEntity(w.type, w.pos as [number, number], '#ffd24d');
    for (const p of stage.powerups) drawEntity(p.type, p.pos as [number, number], '#7dff7d');

    render.drawText(`Stage · scroll ${scrollOffsetX}`, 8, height - 14, false, '#9ad0ff');
  }, [scrollOffsetX, debug, ready]);

  if (!ready) {
    return (
      <div
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'monospace' }}
        aria-busy="true"
        role="status"
      >
        loading sprites…
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Stage ${stage.max_scroll_x}: ${stage.enemies.length} enemies, ${stage.weapons.length} weapons, ${stage.powerups.length} powerups`}
    />
  );
}
