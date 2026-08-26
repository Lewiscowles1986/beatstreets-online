import { CanvasRender } from '../game/render/canvas-render';
import { loadResolvedStages } from '../game/data';
import { Stage } from '../game/dsl/stages';
import { useCanvas } from './useCanvas';

export interface StageListProps {
  /** The stages to compose, in order. Defaults to the full game's stages. */
  stages?: Stage[];
  /** Number of stages to show. */
  count?: number;
  /** Horizontal scroll offset into the combined stage world (px). */
  scrollOffsetX?: number;
  /** Canvas width in CSS px. */
  width?: number;
  /** Canvas height in CSS px. */
  height?: number;
  debug?: boolean;
}

/** Map each entity type to its representative sprite for preview. */
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

/**
 * Composes multiple stages end-to-end from their DSL specs: each stage is a horizontal
 * slice of the world (its entities offset by the cumulative scroll of prior stages),
 * so the full game reads as one continuous, scrolling level. This is the "place
 * multiple stages next to one another, loading from JSON" view.
 */
export function StageList({
  stages,
  count,
  scrollOffsetX = 0,
  width = 800,
  height = 480,
  debug = false,
}: StageListProps) {
  const all = stages ?? loadResolvedStages().stages;
  const shown = count ? all.slice(0, count) : all;

  // Cumulative world offsets: each stage begins where the previous one ended (minus a
  // small gap so stage boundaries are visually distinguishable).
  const offsets = buildOffsets(shown);

  const canvasRef = useCanvas(width, height, (ctx) => {
    const render = new CanvasRender(ctx, width, height);
    render.clear('#141414');
    render.fillRect(0, 360, width, 2, '#444');

    shown.forEach((stage, si) => {
      const baseX = offsets[si];
      drawStage(render, stage, baseX, scrollOffsetX, width, debug);
      if (debug) {
        render.drawText(`Stage ${si + 1}`, baseX - scrollOffsetX, 20, true, '#9ad0ff');
      }
    });

    // A scroll indicator so the continuous world is legible.
    render.drawText(`scroll ${scrollOffsetX}`, 6, height - 20, false, '#666');
  });

  return <canvas ref={canvasRef} aria-label={`${shown.length} stages composed end-to-end`} />;
}

function buildOffsets(stages: Stage[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const stage of stages) {
    offsets.push(cursor);
    // Advance past this stage's world extent (plus a gap between stages).
    cursor += stage.max_scroll_x + 300;
  }
  return offsets;
}

function drawStage(
  render: CanvasRender,
  stage: Stage,
  baseX: number,
  scrollOffsetX: number,
  width: number,
  debug: boolean,
): void {
  const drawEntity = (type: string, pos: [number, number], colour: string) => {
    const x = baseX + pos[0] - scrollOffsetX;
    if (x < -200 || x > width + 200) return;
    render.blitSprite(spriteFor(type), x, pos[1]);
    if (debug) {
      render.drawCircle(x, pos[1], 5, colour);
    }
  };

  for (const e of stage.enemies) drawEntity(e.type, e.pos as [number, number], '#ff6666');
  for (const w of stage.weapons) drawEntity(w.type, w.pos as [number, number], '#ffd24d');
  for (const p of stage.powerups) drawEntity(p.type, p.pos as [number, number], '#7dff7d');
}
