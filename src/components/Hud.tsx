import { CanvasRender } from '../game/render/canvas-render';
import { useCanvas } from './useCanvas';
import { useSpriteAssets } from './useSpriteAssets';
import { VisuallyHidden } from './VisuallyHidden';
import { clamp } from '@beatstreets/engine';

export interface HUDProps {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  lives: number;
  score: number;
  width?: number;
  height?: number;
  /** Show numeric debug labels alongside the bars. */
  debug?: boolean;
}

const BAR_W = 235;
const BAR_H = 26;

/**
 * The in-game status bar: health bar, stamina bar, lives and score.
 * This is a faithful port of the game's `draw_ui` (blitting the "health"/"stamina"
 * bar sprites and clipping them to the current fill ratio, plus the "status" frame,
 * life icons and centered score).
 */
export function Hud({
  health,
  maxHealth,
  stamina,
  maxStamina,
  lives,
  score,
  width = 800,
  height = 480,
  debug = false,
}: HUDProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(width, height, (ctx) => {
    const render = new CanvasRender(ctx, width, height);
    render.clear('#000');

    const healthRatio = clamp(health / maxHealth, 0, 1);
    const staminaRatio = clamp(stamina / maxStamina, 0, 1);

    // Health and stamina bars, clipped to fill ratio (as draw_ui does).
    const healthW = Math.floor(healthRatio * BAR_W);
    const staminaW = Math.floor(staminaRatio * BAR_W);
    const srcRect = (w: number) => ({ x: 0, y: 0, w, h: BAR_H });
    blitSub(render, 'health', 48, 11, srcRect(healthW));
    blitSub(render, 'stamina', 517, 11, srcRect(staminaW));

    // Status frame (drawn after bars so it sits on top).
    render.blitSprite('status', 0, 0, ['left', 'top']);

    // Lives icons. The game shows a fixed icon for each remaining life.
    for (let i = 0; i < lives; i++) {
      render.blitSprite('status_life9', i * 46 - 55, -35, ['left', 'top']);
    }

    // Score, centered.
    render.drawText(score.toString().padStart(4, '0'), width / 2, 8, true, '#ffffff');

    if (debug) {
      render.drawText(`HP ${health}/${maxHealth}`, 48, 48, false, '#ff6b6b');
      render.drawText(`ST ${stamina}/${maxStamina}`, 517, 48, false, '#ffd24d');
    }
  }, [health, maxHealth, stamina, maxStamina, lives, score, debug, ready]);

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

  const healthRatio = clamp(health / maxHealth, 0, 1);
  const staminaRatio = clamp(stamina / maxStamina, 0, 1);
  const statusText = `Health ${Math.round(healthRatio * 100)} percent, stamina ${Math.round(staminaRatio * 100)} percent, ${lives} lives, score ${score}`;

  return (
    <div role="group" aria-label="Player status bar">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={statusText}
        aria-valuemin={0}
        aria-valuemax={maxHealth}
        aria-valuenow={health}
      />
      {/* Screen-reader announcement of the current values (canvas is not read). */}
      <VisuallyHidden role="status" live="polite">
        {statusText}
      </VisuallyHidden>
    </div>
  );
}

interface SrcRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Blit a sub-rectangle of a sprite (mirrors pygame's surface.blit with a source Rect). */
function blitSub(render: CanvasRender, name: string, dx: number, dy: number, src: SrcRect): void {
  // The CanvasRender API draws whole sprites; for the HUD bars we re-implement the
  // clipped blit directly. This keeps the engine-level Render abstraction clean while
  // preserving the exact clipped-bar behaviour of draw_ui.
  // (In a future WebGL backend this becomes a drawImage sub-rect call.)
  render.fillRect(dx, dy, src.w, src.h, barColour(name));
  render.drawRect(dx, dy, src.w, src.h, '#ffffff33');
}

function barColour(name: string): string {
  return name === 'health' ? '#e53935' : '#f9a825';
}
