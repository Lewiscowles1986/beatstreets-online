import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
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
 *   3. The full intro replay (intro text plays out -> skip -> fade window -> live
 *      frames, i.e. NO jumpToStage) consumes the complete 184-draw stream Python does
 *      by the freeze point: 85 ctor draws + 99 intro-text teletype `get_sound[0,0]`
 *      draws. There are NO fade/combat draws in the first 90 live frames (the idle
 *      player spawns no enemies until it scrolls), so python's 184 == 85 + 99.
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

/**
 * SHA-256 over the sequence of NUMERIC draws (kind + args + value), excluding the
 * stolen-item `choice`. Captured from the Python driver (--seed 1 --skip-intro
 * --frames-to-play 90 --trace-rng): 184 randint draws (85 ctor `__init__` + 99
 * teletype sound variants), all
 * values bit-identical. The single `choice` value is asserted separately.
 */
const PY_NUMERIC_SEQ_SHA256 = '05f25a391e92a3f447e87f49747c9122941d04237529d289f8aa09c97be567a1';
// The trace this pins is committed at e2e/reference/beatstreets-stage-trace.txt; regenerate with:
//   tools/capture_beatstreets_frame.py --state play --skip-intro --frames-to-play 90 --seed 1 --trace-rng
// Total draws the Python driver consumes by the freeze point (85 ctor + 99 intro
// teletype). See 006 MEASUREMENT.md for the full per-frame draw table.
const PY_DRAWS_AT_FREEZE = 184;
const PY_INTRO_TELE_DRAWS = 99;

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

  it('G4: full intro replay consumes the complete 184-draw stream Python does by freeze', () => {
    // Replay the capture schedule the SAME way python does (NO jumpToStage): build the
    // Game once (85 ctor draws, intro text active), play the intro story text out until
    // it is fully revealed (99 teletype `randint(0,0)` draws), skip it with a button-0
    // press (resets the timer to 0), then run the 255-frame fade window + 90 live
    // frames (the idle player spawns no enemies, so python draws nothing further here).
    const game = seededGame(1);
    const controls = game.player.controls as IdleControls;
    const trace = game.rngTrace as TracingRng;

    // Play the intro teletype to completion. The full story text is 122 chars and the
    // web types 1 char every 6 frames (timer % 6 === 0), matching python's teletype.
    let guard = 0;
    while (game.displayedText.length < game.currentText.length && guard < 4000) {
      game.update();
      guard++;
    }
    expect(game.displayedText.length).toBe(game.currentText.length);
    expect(guard).toBeLessThan(4000); // did terminate (732 frames for seed 1)

    // Skip the intro: the button-0 press is consumed by the text-skip loop (not a
    // player attack) and resets the timer to 0.
    controls.press(0);
    game.update();
    expect(game.textActive).toBe(false);
    expect(game.timer).toBe(0);

    // Fade window + 90 live frames -> post-intro timer 345 (python's freeze point).
    for (let i = 0; i < 345 && game.timer < 345; i++) game.update();
    expect(game.timer).toBe(345);

    const total = trace.count;
    console.log(`sound-parity: web draws at freeze=${total}, python=${PY_DRAWS_AT_FREEZE}`);
    expect(total).toBe(PY_DRAWS_AT_FREEZE); // 184

    // The 99 post-ctor draws are all the intro teletype get_sound randint(0,0).
    const postCtor = trace.draws.slice(85);
    expect(postCtor).toHaveLength(PY_INTRO_TELE_DRAWS);
    for (const d of postCtor) {
      expect(d.kind).toBe('randint');
      expect(d.args).toEqual([0, 0]); // teletype has a single variant -> randint(0,0)
      expect(d.value).toBe(0);
    }

    // Bit-exactness of the full numeric sequence (84 ctor + 99 teletype randint draws)
    // against the Python --trace-rng capture.
    const numericSeq = trace.draws
      .filter((d) => d.kind !== 'choice')
      .map((d) => `${d.kind}(${(d.args as number[]).join(', ')})=${d.value}`)
      .join('\n');
    const seqHash = createHash('sha256').update(numericSeq + '\n').digest('hex');
    console.log(`sound-parity: numeric draw sequence sha256=${seqHash}`);
    expect(seqHash).toBe(PY_NUMERIC_SEQ_SHA256);
  });

  it('G4: live combat fires sound-variant draws (G1 mechanism in gameplay)', () => {
    // Put the player in front of the idle stage-1 vax and land a punch. The attack's
    // initial_sound and the enemy's hit_sound both have count=4 -> randint(0,3) draws.
    const game = seededGame(1);
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    // Keep both fighters in the no-scroll zone (screen x < WIDTH-300): past it, Game.
    // update re-runs createStageObjects each frame and the enemy under test is replaced
    // mid-fight (the real flow spawns stage objects once, when scrolling starts).
    enemy.vpos.x = 520;
    game.player.vpos = new (Object.getPrototypeOf(game.player.vpos).constructor)(460, enemy.vpos.y);
    game.player.facingX = 1;
    const trace = game.rngTrace as TracingRng;
    const start = trace.count;
    (game.player.controls as IdleControls).press(0);
    const startHealth = enemy.health;
    // The punch now lands on python's real timing (attack frame 2 of 3, ~12-17 updates
    // after the press — before the 010 hit-frame fix the JS `in`-on-array bug landed
    // every hit on the animation's first frame). The enemy may legitimately back off
    // during the wind-up (python's randint(0,500) approach back-off), so keep the
    // player in range like a chasing player would.
    for (let i = 0; i < 120 && enemy.health === startHealth; i++) {
      game.player.vpos.x = enemy.vpos.x - 60;
      game.player.facingX = 1;
      game.update();
    }
    expect(enemy.health).toBeLessThan(startHealth); // the punch landed
    const combatDraws = trace.draws.slice(start);
    // punch_whoosh (initial) + punch_hit (hit sound) both consume randint(0,3).
    const variantPicks = combatDraws.filter((d) => d.kind === 'randint' && (d.args as number[])[1] === 3);
    expect(variantPicks.length).toBeGreaterThanOrEqual(1);
  });
});
