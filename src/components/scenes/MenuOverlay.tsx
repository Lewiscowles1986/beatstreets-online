import { CanvasRender } from '../../game/render/canvas-render';
import { config } from '../../game/data';
import { invertSpecialSymbols } from '../../game/title';
import { useCanvas } from '../useCanvas';
import { useSpriteAssets } from '../useSpriteAssets';

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
  /** If true, this is a sub-screen (e.g. stage select) — no cursor marker. */
  subScreen?: boolean;
  ariaLabel?: string;
}

/**
 * A generic centred menu overlay (used for the pause menu and the cheat menu).
 * Presentational — the host owns the cursor and selection logic.
 *
 * Styled like the game's own text UI (Python `draw_text`): per-glyph font sprites,
 * white, centred, over a dim of the frozen world; the selected row is marked with
 * the green `xb_a` A-button sprite (the title prompt's inline symbol) rather than
 * a foreign highlight box. Hint strings must stick to the glyph charset
 * (uppercase, digits, `!'+,-.0123456789:=?`) — no lowercase, no `/`.
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
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const cfg = config();
      const render = new CanvasRender(ctx, width, height);
      render.clear('#000');
      render.fillRect(0, 0, width, height, 'rgba(0,0,0,0.7)');
      const glyphs = invertSpecialSymbols(cfg.SPECIAL_FONT_SYMBOLS);
      const draw = (text: string, x: number, y: number) =>
        render.drawGlyphText(text, x, y, { centered: true, specialSymbols: glyphs });

      draw(title, width / 2, 120);
      const rowH = 60;
      const startY = 200;
      // SPECIAL_FONT_SYMBOLS maps sprite -> char (e.g. { xb_a: '%' }).
      const markerChar = cfg.SPECIAL_FONT_SYMBOLS['xb_a'] ?? '%';
      for (let i = 0; i < items.length; i++) {
        const y = startY + i * rowH;
        const label = items[i].status ? `${items[i].label}:${items[i].status}` : items[i].label;
        if (!subScreen && i === cursor) {
          const labelW = render.glyphTextWidth(label, { specialSymbols: glyphs });
          const markerW = render.glyphTextWidth(markerChar, { specialSymbols: glyphs });
          const gap = render.glyphTextWidth(' ', { specialSymbols: glyphs });
          const origin = Math.floor((width - (labelW + markerW + gap)) / 2);
          render.drawGlyphText(markerChar, origin, y, { specialSymbols: glyphs });
          render.drawGlyphText(label, origin + markerW + gap, y, { specialSymbols: glyphs });
        } else {
          draw(label, width / 2, y);
        }
      }
      // Hint lines centred per line (python's draw_text note: centring does not
      // work across line breaks) — the wide glyph font only fits ~24 chars per
      // 800px line, so hints are stacked short lines, bottom-aligned.
      if (hint) {
        const lines = hint.split('\n');
        lines.forEach((line, i) => draw(line, width / 2, height - 50 - (lines.length - 1 - i) * 35));
      }
    },
    [title, cursor, subScreen, items.map((i) => `${i.label}:${i.status}`).join('|'), hint, ready],
  );

  if (!ready) {
    return <div style={{ width, height }} aria-busy="true" role="status" />;
  }
  return <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />;
}