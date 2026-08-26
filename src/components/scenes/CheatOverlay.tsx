import { useCanvas } from '../useCanvas';
import { CanvasRender } from '../../game/render/canvas-render';

export interface CheatOverlayProps {
  width?: number;
  height?: number;
  /** Currently highlighted cheat-menu cursor. */
  cursor?: number;
  /** God mode / one punch toggles. */
  godMode?: boolean;
  onePunch?: boolean;
  /** Stage-select sub-screen state. */
  stageSelect?: boolean;
  stage?: number;
}

/**
 * The cheat menu overlay (Konami). Presentational — the host owns cursor/selection.
 */
export function CheatOverlay({
  width = 800,
  height = 480,
  cursor = 0,
  godMode = false,
  onePunch = false,
  stageSelect = false,
  stage = 1,
}: CheatOverlayProps) {
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.fillRect(0, 0, width, height, 'rgba(0,0,0,0.7)');
      if (stageSelect) {
        render.drawText('STAGE SELECT', width / 2, 120, true, '#fff');
        render.drawText(`STAGE ${String(stage).padStart(2, '0')}`, width / 2, 210, true, '#ffd24d');
        render.drawText('UP/DOWN PICK   SPACE JUMP   X BACK', width / 2, 320, true, '#9ad0ff');
        return;
      }
      render.drawText('CHEAT MENU', width / 2, 80, true, '#fff');
      const lines = ['STAGE SELECT', `GOD MODE   - ${godMode ? 'ON' : 'OFF'}`, `ONE PUNCH  - ${onePunch ? 'ON' : 'OFF'}`];
      for (let i = 0; i < lines.length; i++) {
        const y = 170 + i * 60;
        if (i === cursor) {
          render.fillRect(width / 2 - 150, y - 5, 300, 60, '#aa1e1e');
        }
        render.drawText(lines[i], width / 2, y, true, '#fff');
      }
      render.drawText('UP/DOWN SELECT   SPACE CONFIRM   X CLOSE', width / 2, height - 40, true, '#9ad0ff');
    },
    [cursor, godMode, onePunch, stageSelect, stage],
  );

  return <canvas ref={canvasRef} role="img" aria-label="Cheat menu" />;
}
