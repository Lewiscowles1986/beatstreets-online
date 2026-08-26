import { CanvasRender } from '../game/render/canvas-render';
import { Stage } from '../game/dsl/stages';
import { useCanvas } from './useCanvas';

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
 * Renders a single stage from its (resolved) DSL spec onto a canvas: enemies, weapons
 * and powerups, each drawn as its sprite. This is the "compose a stage from JSON" view —
 * the first step toward placing multiple stages end-to-end.
 */
export function StageView({
  stage,
  scrollOffsetX = 0,
  width = 800,
  height = 480,
  debug = false,
}: StageViewProps) {
  const canvasRef = useCanvas(width, height, (ctx) => {
    const render = new CanvasRender(ctx, width, height);
    render.clear('#1a1a1a');
    // Ground line
    render.fillRect(0, 360, width, 2, '#444');

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
  });

  return <canvas ref={canvasRef} aria-label={`stage ${stage.max_scroll_x}`} />;
}

/** Pick a representative sprite per entity type for preview. */
function spriteFor(type: string): string {
  switch (type) {
    case 'EnemyVax':
      return 'vax_stand_0_0_0';
    case 'EnemyHoodie':
      return 'hoodie_stand_0_0_2';
    case 'EnemyScooterboy':
      return 'scooterboy_bike_0_0_2';
    case 'EnemyBoss':
      return 'boss_stand_1_0_2';
    case 'EnemyPortal':
      return 'portal_grow_2';
    case 'Barrel':
      return 'barrel_roll_1_2_shadow';
    case 'Stick':
      return 'hero_pickup_stick_1_0';
    case 'HealthPowerup':
      return 'health_pickup';
    case 'ExtraLifePowerup':
      return 'status_life9';
    default:
      return 'hero_stand_1_0_shadow';
  }
}
