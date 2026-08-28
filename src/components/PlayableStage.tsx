import { useEffect, useRef } from 'react';
import { Game, GameSpec, ExtraLifePowerup, Weapon } from '@beatstreets/engine';
import { config, loadGameSpec, SpecLoader } from '../game/data';
import { CanvasRender } from '../game/render/canvas-render';
import { useSpriteAssets } from './useSpriteAssets';

/** One drawable world item (fighter, weapon or powerup) for the sorted render pass. */
interface WorldItem {
  vpos: { x: number; y: number };
  getDrawOrderOffset?: () => number;
  determineSprite?: () => string;
  sprite?: () => string;
  spriteName?: string;
  held?: boolean;
}

export interface PlayableStageProps {
  /** The (1-based) stage to play — the ONLY stage: progression is locked. */
  stage?: number;
  width?: number;
  height?: number;
  debug?: boolean;
  /** The spec source: invoked once when the game starts, and the loaded spec is kept
   *  for later rebuilds (the stage knob re-jumps the SAME loaded spec). Defaults to
   *  the bundled JSON loader. */
  loadSpec?: SpecLoader;
}

/**
 * Renders a live, drivable {@link Game} scene onto a canvas. This is the bridge
 * between the pure engine and the React shell: the engine advances via
 * requestAnimationFrame, the render layer draws it, and keyboard input drives the
 * player. Demonstrates the whole stack working end-to-end.
 *
 * Exactly ONE stage: the game is built with `stageLocked`, so clearing all enemies and
 * scrolling to the end does NOT advance to the next stage (no progression, no outro,
 * never "won") — the storybook knob picks which of the 29 stages is the sandbox.
 *
 * The game instance lives in a ref and is only read inside effects / the animation
 * loop (never during render), which is why no React state is needed.
 */
export function PlayableStage({ stage = 1, width = 800, height = 480, debug = false, loadSpec }: PlayableStageProps) {
  const { ready } = useSpriteAssets();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  // The loaded spec is the state going forward: the loader runs once at the first game
  // start; the stage knob then re-jumps the SAME loaded spec (no re-load per rebuild).
  const specRef = useRef<GameSpec | null>(null);

  // Create the game + attach keyboard listeners once, off-render.
  useEffect(() => {
    if (!specRef.current) specRef.current = (loadSpec ?? loadGameSpec)();
    const controls = makeKeyboardControls();
    const g = new Game(specRef.current, controls, { stageLocked: true });
    g.jumpToStage(stage);
    gameRef.current = g;
    return () => {
      controls.dispose();
      gameRef.current = null;
    };
  }, [stage, loadSpec]);

  // Run the engine loop and draw each frame.
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const game = gameRef.current;
      if (!game) return;
      game.update();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const render = new CanvasRender(ctx, width, height);
        const cfg = config();
        // The game's scrolling world (GameCanvas.drawBackground port): road wrapped by
        // the scroll offset, then the background tiles left->right.
        const road1x = -(game.scrollOffset.x % cfg.WIDTH);
        render.blitSprite('road', road1x, 0, ['left', 'top']);
        render.blitSprite('road', road1x + cfg.WIDTH, 0, ['left', 'top']);
        let posX = -game.scrollOffset.x - cfg.BACKGROUND_TILE_SPACING;
        for (const tile of cfg.BACKGROUND_TILES) {
          if (posX + 417 >= 0) {
            render.blitSprite(tile, posX, 0, ['left', 'top']);
            posX += cfg.BACKGROUND_TILE_SPACING;
            if (posX >= cfg.WIDTH) break;
          } else {
            posX += cfg.BACKGROUND_TILE_SPACING;
          }
        }
        // One sorted world list — python parity: fighters AND weapons AND the powerups,
        // by vpos.y + draw-order offset (Player +1, Barrel +2, powerup 0).
        const world = [
          game.player,
          ...game.enemies,
          ...(game.weapons as unknown as WorldItem[]),
          ...game.powerups,
        ] as WorldItem[];
        world.sort((a, b) => a.vpos.y + (a.getDrawOrderOffset?.() ?? 0) - (b.vpos.y + (b.getDrawOrderOffset?.() ?? 0)));
        for (const o of world) {
          // Python blanks the sprite of a HELD weapon (pick_up) — skip it.
          if ((o as Weapon).held) continue;
          let name: string | undefined;
          if (o.determineSprite) name = o.determineSprite();
          else if (o.sprite) name = o.sprite();
          else if (o instanceof ExtraLifePowerup) name = o.sprite();
          else name = o.spriteName;
          if (!name || name === 'blank') continue;
          const sx = o.vpos.x - game.scrollOffset.x;
          render.blitSprite(name, sx, o.vpos.y, ['center', 'bottom']);
          if (debug) render.drawCircle(sx, o.vpos.y, 5, '#ff0');
        }
        render.drawText(`Stage ${game.stageIndex + 1} (locked) · HP ${game.player.health} · score ${game.score}`, 8, height - 20, false, '#9ad0ff');
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [width, height, debug]);

  // Wait for the shared sprite preloader before mounting the canvas — blitSprite
  // silently skips not-yet-loaded images, so a mounted canvas would show nothing.
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

  return <canvas ref={canvasRef} aria-label={`playable stage ${stage}`} />;
}

interface DisposableControls {
  getX(): number;
  getY(): number;
  held(button: number): boolean;
  pressed(button: number): boolean;
  dispose(): void;
}

/** A keyboard controller mapping arrow keys + WASD to movement, buttons to actions. */
function makeKeyboardControls(): DisposableControls {
  const down = new Set<string>();
  const map: Record<number, string[]> = {
    0: [' '],
    1: ['x'],
    2: ['c'],
    3: ['a'],
  };
  const keyFor = (b: number) => [...down].some((k) => map[b]?.includes(k));
  const onDown = (e: KeyboardEvent) => down.add(e.key.toLowerCase());
  const onUp = (e: KeyboardEvent) => down.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return {
    getX: () =>
      down.has('arrowright') || down.has('d') ? 1 : down.has('arrowleft') || down.has('a') ? -1 : 0,
    getY: () =>
      down.has('arrowdown') || down.has('s') ? 1 : down.has('arrowup') || down.has('w') ? -1 : 0,
    held: keyFor,
    pressed: keyFor,
    dispose: () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
  };
}
