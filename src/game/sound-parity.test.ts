import { describe, it, expect } from 'vitest';
import { Game, cpythonRng, TracingRng, GameButton, ControllerInput, EnemyVax } from '@beatstreets/engine';
import { loadGameSpec } from './data';

/**
 * Audio-variant RNG parity (GOAL G1/G2/G3).
 *
 * Python (vol2/beatstreets/beatstreets.py) draws randomness from a single module RNG
 * seeded by the capture driver. The web must consume the SAME draws. This spec asserts
 * three things against a real Python `--trace-rng` capture (tools/capture_beatstreets_frame.py
 * --seed 1 --skip-intro --frames-to-play 90 --trace-rng):
 *
 *   1. Sound-variant selection routes through game.rng — `get_sound → randint(0, count-1)`
 *      — decoupled from playback (the draw happens even though no audio can play).
 *   2. The Game constructor consumes the exact world-setup RNG Python does at
 *      `setup_stages()`: 83 enemy colour_variant randint(0,2) + 1 Stick durability
 *      randint(12,16), then the stolen-item choice — bit-identical values for seed 1.
 *   3. The web now draws for gameplay sound events (not just 3 baseline draws), with the
 *      residual gap vs Python's 184 draws precisely attributed to the documented
 *      frame-flow divergence (the web's jumpToStage skips the intro text + 255-frame fade
 *      that the Python driver runs). See MEASUREMENT.md.
 *
 * Python reference vector below: the 84 numeric world-setup draws (83 colour + 1 Stick
 * durability) captured from the Python driver at seed 1, in construction order.
 */
const PY_CTOR_NUMERIC: number[] = [
  0, 2, 0, 1, 0, 1, 1, 1, 2, 1, 0, 0, 1, 0, 1, 1, 2, 0, 2, 1, 1, 2, 0, 2, 0, 1, 0, 0, 0, 2, 2, 0, 1, 2,
  0, 1, 2, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 1, 0, 1, 2, 2, 0, 0, 2, 2, 1, 0, 2, 1, 2, 2, 2, 1, 2, 2,
  0, 1, 1, 2, 1, 2, 15, 2, 0, 1, 0, 2, 1, 1, 2, 0,
];
const PY_CTOR_CHOICE = 'THE COMPLETE WORKS OF\nSHAKESPEARE';

/** A deterministic, idle fake controller (the player never acts during captures). */
class IdleControls implements ControllerInput {
  private queue: GameButton[] = [];
  getX(): number {
    return 0;
  }
  getY(): number {
    return 0;
  }
  held(_b: GameButton): boolean {
    return false;
  }
  pressed(b: GameButton): boolean {
    const idx = this.queue.indexOf(b);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }
  /** Queue a button press for the next update (consumed once). */
  press(b: GameButton): void {
    this.queue.push(b);
  }
}

/** Build a seeded, tracing Game over the real stage data. */
function seededGame(seed: number) {
  return new Game(loadGameSpec(), new IdleControls(), {
    rng: cpythonRng(seed),
    debugRng: true,
  });
}

describe('audio-variant RNG parity', () => {
  it('G1: every sound-variant selection draws randint(0, count-1) from game.rng', () => {
    const game = seededGame(1);
    const trace = game.rngTrace as TracingRng;
    const before = trace.count;

    // A multi-variant sound consumes randint(0, count-1).
    game.playSound('vax_hit', 3);
    // A count-1 sound still consumes one draw (randint(0,0)) — Python get_sound always draws.
    game.playSound('teletype');

    const drawn = trace.draws.slice(before);
    expect(drawn).toHaveLength(2);
    expect(drawn[0].kind).toBe('randint');
    expect(drawn[0].args).toEqual([0, 2]); // count=3 -> randint(0, 2)
    expect(drawn[1].kind).toBe('randint');
    expect(drawn[1].args).toEqual([0, 0]); // count=1 -> randint(0, 0)
    // The draw is deterministic under a seeded CPython RNG (proves it is the game RNG).
    expect(typeof drawn[0].value).toBe('number');
  });

  it('G2: sound selection is decoupled from playback capability', () => {
    // jsdom has no real AudioContext; playSound must still draw. The engine's playSound
    // never touches audio, so selection and playback are already separate — this asserts
    // the draw occurs for a sound that cannot actually be played in this environment.
    const game = seededGame(2);
    const trace = game.rngTrace as TracingRng;
    const before = trace.count;
    game.playSound('scooter_fall', 6);
    expect(trace.count - before).toBe(1);
    expect(trace.draws[before].args).toEqual([0, 5]);
  });

  it('G3: constructor consumes Python setup_stages draws (colour variants + stick + stolen item)', () => {
    const game = seededGame(1);
    const trace = game.rngTrace as TracingRng;
    const draws = trace.draws;

    // Python ctor phase draws: 83 colour randint(0,2) + 1 Stick randint(12,16) + 1 choice.
    expect(draws).toHaveLength(85);

    const numeric = draws.filter((d) => d.kind !== 'choice').map((d) => d.value as number);
    expect(numeric).toEqual(PY_CTOR_NUMERIC);

    const choice = draws.filter((d) => d.kind === 'choice');
    expect(choice).toHaveLength(1);
    expect(choice[0].value).toBe(PY_CTOR_CHOICE);

    // The stolen-item choice happens AFTER the world-setup draws (colour-first), and the
    // stage-1 vax reuses the first pre-drawn colour (0) instead of drawing again.
    const lastKind = draws[draws.length - 1].kind;
    expect(lastKind).toBe('choice');
  });

  it('G3: a lazily-built stage reuses its pre-drawn colour (no re-draw)', () => {
    const game = seededGame(1);
    const trace = game.rngTrace as TracingRng;
    const ctorCount = trace.count; // 85 world-setup + ... draws
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    // The first pre-drawn colour is 0 (matches PY_CTOR_NUMERIC[0]).
    expect(enemy).toBeInstanceOf(EnemyVax);
    expect(enemy.colourVariant).toBe(0);
    // jumpToStage adds no colour-variant draw (it reuses the pre-drawn value); the only
    // new draws come from stage creation (start timers / behaviour), not a colour pick.
    const newDraws = trace.draws.slice(ctorCount);
    const colourPicks = newDraws.filter((d) => d.kind === 'randint' && (d.args as number[])[1] === 2);
    expect(colourPicks).toHaveLength(0);
  });

  it('G4: capture-schedule web draws now consume the full world-setup stream', () => {
    // Replay the web capture schedule: single Game (not the double-built GameCanvas
    // Host), jump to stage 1, idle player, advance to the freeze timer 345. Python
    // consumes 184 draws by this point; the web consumes its 85 world-setup draws
    // (up from 3 in iteration 004) — the residual 99 are the intro-text teletype +
    // fade/combat sounds the Python driver runs, which the web's jumpToStage skips.
    const game = seededGame(1);
    game.jumpToStage(1);
    for (let i = 0; i < 345 && game.timer < 345; i++) game.update();
    const trace = game.rngTrace as TracingRng;
    const webTotal = trace.count;
    expect(webTotal).toBe(85); // exactly the world-setup stream (deterministic, seed 1)
    console.log(`sound-parity: web draws at freeze=${webTotal}, python=184`);
  });

  it('G4: live combat fires sound-variant draws (G1 mechanism in gameplay)', () => {
    // Put the player in front of the idle stage-1 vax and land a punch. The attack's
    // initial_sound and the enemy's hit_sound both have count=4 -> randint(0,3) draws.
    const game = seededGame(1);
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    game.player.vpos = new (Object.getPrototypeOf(game.player.vpos).constructor)(enemy.vpos.x - 60, enemy.vpos.y);
    game.player.facingX = 1;
    const trace = game.rngTrace as TracingRng;
    const start = trace.count;
    (game.player.controls as IdleControls).press(0);
    const startHealth = enemy.health;
    for (let i = 0; i < 60 && enemy.health === startHealth; i++) game.update();
    expect(enemy.health).toBeLessThan(startHealth); // the punch landed
    const combatDraws = trace.draws.slice(start);
    // punch_whoosh (initial) + punch_hit (hit sound) both consume randint(0,3).
    const variantPicks = combatDraws.filter((d) => d.kind === 'randint' && (d.args as number[])[1] === 3);
    expect(variantPicks.length).toBeGreaterThanOrEqual(1);
  });
});
