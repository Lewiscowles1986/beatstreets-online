import { CanvasRender } from '../../game/render/canvas-render';
import { useCanvas } from '../useCanvas';

export interface MenuItem {
  label: string;
  /** Optional status suffix, e.g. "ON"/"OFF" for toggles. */
  status?: string;
}

export interface MenuOverlayProps {
  width?: number;
  height?: number;
  /** The menu title, e.g. "PAUSED" or "CHEAT MENU". */
  title: string;
  items: MenuItem[];
  /** Currently highlighted item index. */
  cursor?: number;
  /** Footer hint line. */
  hint?: string;
  /** If true, this is a sub-screen (e.g. stage select) — no highlight box. */
  subScreen?: boolean;
  ariaLabel?: string;
}

/**
 * A generic centred menu overlay (used for the pause menu and the cheat menu).
 * Presentational — the host owns the cursor and selection logic.
 */
export function MenuOverlay({
  width = 800,
  height = 480,
  title,
  items,
  cursor = 0,
  hint = '',
  subScreen = false,
  ariaLabel = 'Menu',
}: MenuOverlayProps) {
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.fillRect(0, 0, width, height, 'rgba(0,0,0,0.7)');
      render.drawText(title, width / 2, 120, true, '#fff');
      const rowH = 60;
      const startY = 200;
      for (let i = 0; i < items.length; i++) {
        const y = startY + i * rowH;
        if (!subScreen && i === cursor) {
          render.fillRect(width / 2 - 120, y - 5, 240, rowH, '#aa1e1e');
        }
        const label = items[i].status ? `${items[i].label}   - ${items[i].status}` : items[i].label;
        render.drawText(label, width / 2, y, true, '#fff');
      }
      if (hint) render.drawText(hint, width / 2, height - 40, true, '#9ad0ff');
    },
    [title, cursor, subScreen, items.map((i) => `${i.label}:${i.status}`).join('|'), hint],
  );

  return <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />;
}
