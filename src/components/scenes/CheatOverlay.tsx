import { useCanvas } from '../useCanvas';
import { CanvasRender } from '../../game/render/canvas-render';
import { config } from '../../game/data';
import { invertSpecialSymbols } from '../../game/title';
import { useSpriteAssets } from '../useSpriteAssets';

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
 *
 * Styled like the game's own fullscreen screens (Python `draw_text`): every string
 * is drawn with the per-glyph font sprites, centred, white on an opaque black
 * screen — the same presentation as the CONTROLS screen (`screen.fill(black)`) and
 * the fully-opaque GAME_OVER status bitmaps, rather than a foreign translucent dim.
 * The selected row is marked with the green `xb_a` A-button sprite (the same
 * inline symbol the title screen's "PRESS [A] OR Z" prompt uses) instead of a
 * foreign highlight box. Hint lines avoid characters the glyph font does not
 * have (no lowercase, no `/`).
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
  const { ready } = useSpriteAssets();
  const canvasRef = useCanvas(
    width,
    height,
    (ctx) => {
      const cfg = config();
      const render = new CanvasRender(ctx, width, height);
      // Opaque fullscreen overlay — same language as the CONTROLS screen
      // (`screen.fill(black)`) and the fully-opaque GAME_OVER status bitmaps.
      render.clear('#000');
      const glyphs = invertSpecialSymbols(cfg.SPECIAL_FONT_SYMBOLS);
      const draw = (text: string, x: number, y: number) =>
        render.drawGlyphText(text, x, y, { centered: true, specialSymbols: glyphs });
      // Hint lines centred per line (python's draw_text note: centring does not
      // work across line breaks) — the wide glyph font only fits ~24 chars per
      // 800px line, so hints are stacked short lines, bottom-aligned.
      const drawHint = (...lines: string[]) => {
        lines.forEach((line, i) => draw(line, width / 2, height - 50 - (lines.length - 1 - i) * 35));
      };

      if (stageSelect) {
        draw('STAGE SELECT', width / 2, 120);
        draw(`STAGE ${String(stage).padStart(2, '0')}`, width / 2, 210);
        drawHint('UP DOWN PICK', 'SPACE JUMP', 'X OR ESC BACK');
        return;
      }

      draw('CHEAT MENU', width / 2, 80);
      const lines = ['STAGE SELECT', `GOD MODE: ${godMode ? 'ON' : 'OFF'}`, `ONE PUNCH: ${onePunch ? 'ON' : 'OFF'}`];
      const rowH = 60;
      const startY = 170;
      // Cursor marker: the green A-button sprite, drawn to the left of the
      // selected label with the (marker+label) group kept screen-centred.
      // SPECIAL_FONT_SYMBOLS maps sprite -> char (e.g. { xb_a: '%' }).
      const markerChar = cfg.SPECIAL_FONT_SYMBOLS['xb_a'] ?? '%';
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * rowH;
        if (i === cursor) {
          const labelW = render.glyphTextWidth(lines[i], { specialSymbols: glyphs });
          const markerW = render.glyphTextWidth(markerChar, { specialSymbols: glyphs });
          const gap = render.glyphTextWidth(' ', { specialSymbols: glyphs });
          const origin = Math.floor((width - (labelW + markerW + gap)) / 2);
          render.drawGlyphText(markerChar, origin, y, { specialSymbols: glyphs });
          render.drawGlyphText(lines[i], origin + markerW + gap, y, { specialSymbols: glyphs });
        } else {
          draw(lines[i], width / 2, y);
        }
      }
      drawHint('UP DOWN SELECT', 'SPACE CONFIRM', 'X OR ESC CLOSE');
    },
    [cursor, godMode, onePunch, stageSelect, stage, ready],
  );

  if (!ready) {
    return <div style={{ width, height }} aria-busy="true" role="status" />;
  }
  return <canvas ref={canvasRef} role="img" aria-label="Cheat menu" />;
}