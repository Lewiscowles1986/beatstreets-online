import { SPRITES, spriteUrl } from '../assets';

/**
 * Minimal render abstraction over a 2D canvas.
 *
 * This intentionally mirrors the *actions* the pygame/pygame-zero game performs
 * (blit a sprite, draw text/rects, scroll the world by an offset) without cloning the
 * pygame API. The engine draws through this interface; a WebGL backend can replace
 * CanvasRender later without touching game logic.
 */
export interface Render {
  /** Draw a sprite at world (or screen) coords with an optional anchor. */
  blitSprite(name: string, x: number, y: number, anchor?: [string, string]): void;
  /** Draw text. */
  drawText(text: string, x: number, y: number, centered?: boolean, color?: string): void;
  /** Fill a rectangle. */
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
  /** Stroke a rectangle. */
  drawRect(x: number, y: number, w: number, h: number, color: string): void;
  /** Draw a circle. */
  drawCircle(x: number, y: number, radius: number, color: string): void;
  /** Clear the whole canvas to a colour. */
  clear(color?: string): void;
}

/** Canvas-2D implementation of {@link Render}. */
export class CanvasRender implements Render {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly width: number,
    private readonly height: number,
  ) {}

  private load(name: string): HTMLImageElement | undefined {
    const url = spriteUrl(name);
    if (!url) return undefined;
    const img = new Image();
    img.src = url;
    return img;
  }

  blitSprite(name: string, x: number, y: number, anchor: [string, string] = ['center', 'bottom']): void {
    const img = this.load(name);
    if (!img) return;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    let dx = x;
    let dy = y;
    if (anchor[0] === 'center') dx -= w / 2;
    if (anchor[1] === 'bottom') dy -= h;
    this.ctx.drawImage(img, dx, dy);
  }

  drawText(text: string, x: number, y: number, centered = false, color = '#fff'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = '16px monospace';
    this.ctx.textBaseline = 'top';
    if (centered) {
      const w = this.ctx.measureText(text).width;
      this.ctx.fillText(text, x - w / 2, y);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.strokeRect(x, y, w, h);
  }

  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  clear(color = '#000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

/** Sprite map is exported for tests/consumers that need to introspect assets. */
export { SPRITES };
