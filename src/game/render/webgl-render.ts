import { getSpriteImage } from '../assets';
import { CanvasRender, Anchor } from './canvas-render';
import { GlyphTextOptions } from '../glyph-text';

/**
 * WebGL implementation of {@link Render} — a drop-in backend for CanvasRender.
 *
 * Sprites are drawn as textured quads (batched per frame). Text and primitive shapes
 * (rects/circles) are rendered into an offscreen 2D context and composited on top,
 * since WebGL has no built-in text/vector drawing.
 *
 * The engine only depends on the {@link Render} interface, so swapping CanvasRender for
 * WebGLRender never touches game logic.
 */

const VERT_SRC = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_res;
varying vec2 v_uv;
void main() {
  vec2 ndc = vec2(a_pos.x / u_res.x * 2.0 - 1.0, 1.0 - a_pos.y / u_res.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  gl_FragColor = vec4(c.rgb, c.a * u_alpha);
}
`;

/** A sprite quad + its texture, ready to render in the WebGL layer. */
interface SpriteQuad {
  tex: WebGLTexture;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional source region (px) within the texture; defaults to the full image. */
  srcW?: number;
  srcH?: number;
  /** Full texture dimensions (needed to map a source region to UVs). */
  fullW?: number;
  fullH?: number;
  /** Debug: sprite name. */
  name?: string;
}

export class WebGLRender {
  private gl: WebGLRenderingContext;
  private overlay: HTMLCanvasElement;
  private overlay2d: CanvasRenderingContext2D;
  private program: WebGLProgram;
  private aPos: number;
  private aUv: number;
  private uRes: WebGLUniformLocation | null;
  private uTex: WebGLUniformLocation | null;
  private uAlpha: WebGLUniformLocation | null;
  private buffer: WebGLBuffer;
  private textures = new Map<string, WebGLTexture>();
  private quads: SpriteQuad[] = [];
  private readonly width: number;
  private readonly height: number;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    // Offscreen 2D overlay for text/rects.
    this.overlay = document.createElement('canvas');
    this.overlay.width = width;
    this.overlay.height = height;
    const o2d = this.overlay.getContext('2d');
    if (!o2d) throw new Error('2D overlay unavailable');
    this.overlay2d = o2d;

    this.program = this.compile(gl, VERT_SRC, FRAG_SRC);
    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUv = gl.getAttribLocation(this.program, 'a_uv');
    this.uRes = gl.getUniformLocation(this.program, 'u_res');
    this.uTex = gl.getUniformLocation(this.program, 'u_tex');
    this.uAlpha = gl.getUniformLocation(this.program, 'u_alpha');

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('buffer allocation failed');
    this.buffer = buffer;

    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, width, height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private compile(gl: WebGLRenderingContext, vsrc: string, fsrc: string): WebGLProgram {
    const mk = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error('shader alloc failed');
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'compile failed');
      return sh;
    };
    const vs = mk(gl.VERTEX_SHADER, vsrc);
    const fs = mk(gl.FRAGMENT_SHADER, fsrc);
    const prog = gl.createProgram();
    if (!prog) throw new Error('program alloc failed');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
    return prog;
  }

  /** Get (or lazily create) a texture for a sprite name from the shared cache. */
  private texture(name: string): WebGLTexture | null {
    const cached = this.textures.get(name);
    if (cached) return cached;
    const img = getSpriteImage(name);
    if (!img || img.naturalWidth === 0) return null; // not preloaded yet

    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) return null;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // No Y flip on sprite upload: texImage2D uploads the image's top row first, so it
    // lands at v=0, and the quads map v=0 to the screen top — sprites render upright.
    // (The 2D overlay path below DOES flip on upload because its quad samples v=1 at
    // the screen top; the two paths intentionally differ. See flushQuads/flushOverlay.)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(name, tex);
    return tex;
  }

  blitSprite(name: string, x: number, y: number, anchor: Anchor = ['center', 'bottom']): void {
    const tex = this.texture(name);
    if (!tex) return; // sprite not loaded yet; skipped this frame
    const img = getSpriteImage(name);
    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;
    if (!w || !h) return;
    let dx = x;
    let dy = y;
    if (anchor[0] === 'center') dx -= w / 2;
    if (typeof anchor[1] === 'number') dy -= anchor[1];
    else if (anchor[1] === 'center') dy -= h / 2;
    else if (anchor[1] === 'bottom') dy -= h;
    this.quads.push({ tex, x: dx, y: dy, w, h, name });
  }

  /** Blit only the top-left `srcW`×`srcH` region of a sprite (clipped bar fill). */
  blitSpriteRegion(name: string, x: number, y: number, srcW: number, srcH: number): void {
    const tex = this.texture(name);
    if (!tex) return;
    const img = getSpriteImage(name);
    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;
    if (!w || !h) return;
    this.quads.push({ tex, x, y, w: srcW, h: srcH, srcW, srcH, fullW: w, fullH: h });
  }

  drawText(text: string, x: number, y: number, centered = false, color = '#fff'): void {
    this.c2d().drawText(text, x, y, centered, color);
  }

  drawGlyphText(text: string, x: number, y: number, opts?: GlyphTextOptions): void {
    this.c2d().drawGlyphText(text, x, y, opts);
  }

  glyphTextWidth(text: string, opts?: GlyphTextOptions): number {
    return this.c2d().glyphTextWidth(text, opts);
  }

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.c2d().fillRect(x, y, w, h, color);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.c2d().drawRect(x, y, w, h, color);
  }

  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.c2d().drawCircle(x, y, radius, color);
  }

  clear(color = '#000'): void {
    this.quads.length = 0;
    // The overlay is composited on top of the WebGL sprite layer, so it must be
    // transparent where nothing is drawn. Filling it with the clear colour would make
    // it an opaque full-screen quad that hides the sprites behind it. The main canvas
    // is cleared to black in present() via gl.clearColor.
    void color;
    this.overlay2d.clearRect(0, 0, this.width, this.height);
  }

  /** Present the frame: render the WebGL sprite layer, then composite the 2D overlay. */
  present(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    // 1. Draw sprite quads.
    this.flushQuads();
    // 2. Composite the 2D overlay (text/primitives) as a full-screen textured quad.
    this.flushOverlay();
    // 3. Reset the overlay for the next frame. The overlay persists across frames
    //    (an offscreen canvas), and the play path never calls clear() — the title /
    //    controls / game-over scenes do, but drawGame() does not — so debug circles
    //    and any other overlay primitives ACCUMULATED into trails along actor paths
    //    (the reported "yellow scribbles glued to the actors"). Clear after each
    //    composite so the next frame's overlay starts transparent.
    this.overlay2d.clearRect(0, 0, this.width, this.height);
  }

  /** Upload the overlay canvas as a texture and draw it as one full-screen quad. */
  private flushOverlay(): void {
    const gl = this.gl;
    if (this.overlay.width === 0 || this.overlay.height === 0) return;
    const tex = gl.createTexture();
    if (!tex) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.overlay);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Full-screen quad in pixel space (the vertex shader maps pixels to NDC). The
    // overlay is uploaded with UNPACK_FLIP_Y_WEBGL, so the image's top row sits at
    // v=1 — the screen top must therefore sample v=1, not v=0 (a v=0 top would
    // composite the overlay vertically mirrored: text drawn at y=0 appears at the
    // bottom of the screen).
    const verts = new Float32Array([
      0, 0, 0, 1, this.width, 0, 1, 1, 0, this.height, 0, 0,
      this.width, 0, 1, 1, this.width, this.height, 1, 0, 0, this.height, 0, 0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const stride = 4 * 4;
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.uTex, 0);
    gl.uniform1f(this.uAlpha, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.deleteTexture(tex);
  }

  private flushQuads(): void {
    const gl = this.gl;
    if (this.quads.length === 0) return;
    // Batch: one quad = 6 vertices (two triangles), each 4 floats (x, y, u, v).
    const floats = new Float32Array(this.quads.length * 6 * 4);
    let i = 0;
    for (const q of this.quads) {
      const { x, y, w, h } = q;
      // Texture coordinates: full-image (0..1) by default, or limited to the top-left
      // source region when a clipped blit (blitSpriteRegion) was requested.
      const u1 = q.srcW !== undefined ? q.srcW / (q.fullW ?? w) : 1;
      const v1 = q.srcH !== undefined ? q.srcH / (q.fullH ?? h) : 1;
      const verts = [
        [x, y, 0, 0],
        [x + w, y, u1, 0],
        [x, y + h, 0, v1],
        [x + w, y, u1, 0],
        [x + w, y + h, u1, v1],
        [x, y + h, 0, v1],
      ];
      for (const [px, py, u, v] of verts) {
        // pygame blits truncate the destination to int (toward zero); float quad
        // positions would let the GPU bilinear-sample half-texel edges, softening
        // every sprite in scrolled scenes vs the python render.
        floats[i++] = Math.trunc(px);
        floats[i++] = Math.trunc(py);
        floats[i++] = u;
        floats[i++] = v;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, floats, gl.DYNAMIC_DRAW);
    const stride = 4 * 4;
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.uTex, 0);
    gl.uniform1f(this.uAlpha, 1);
    // Bind each quad's texture (they may differ). For simplicity we draw per-texture.
    let cursor = 0;
    let idx = 0;
    while (idx < this.quads.length) {
      const tex = this.quads[idx].tex;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      let count = 0;
      while (idx + count < this.quads.length && this.quads[idx + count].tex === tex) {
        count++;
      }
      gl.drawArrays(gl.TRIANGLES, cursor, count * 6);
      cursor += count * 6;
      idx += count;
    }
    this.quads.length = 0;
  }

  private c2d(): CanvasRender {
    return new CanvasRender(this.overlay2d, this.width, this.height);
  }
}
