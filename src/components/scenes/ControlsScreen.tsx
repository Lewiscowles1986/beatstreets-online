import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';

export interface ControlsScreenProps {
  width?: number;
  height?: number;
  /** The button binding legend. [punch, kick, elbow, flying-kick]. */
  bindings?: string[];
}

const DEFAULT_BINDINGS = ['SPACE / Z', 'X', 'C', 'A'];

/**
 * The controls/instructions screen shown before play. Presentational — the host
 * decides when to advance.
 */
export function ControlsScreen({
  width = 800,
  height = 480,
  bindings = DEFAULT_BINDINGS,
}: ControlsScreenProps) {
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.drawText('CONTROLS', width / 2, 100, true, '#fff');
      render.drawText('MOVE  ARROWS / WASD', width / 2, 170, true, '#9ad0ff');
      render.drawText(`PUNCH  ${bindings[0]}`, width / 2, 200, true, '#9ad0ff');
      render.drawText(`KICK  ${bindings[1]}`, width / 2, 230, true, '#9ad0ff');
      render.drawText(`ELBOW  ${bindings[2]}`, width / 2, 260, true, '#9ad0ff');
      render.drawText(`FLYING KICK  ${bindings[3]}`, width / 2, 290, true, '#9ad0ff');
      render.drawText('PRESS SPACE TO START', width / 2, height - 60, true, '#fff');
    },
    [bindings.join(',')],
  );

  return <canvas ref={canvasRef} role="img" aria-label="Controls screen" />;
}
