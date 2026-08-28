import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Game, cpythonRng, TracingRng, GameButton, ControllerInput, Enemy } from '@beatstreets/engine';
import { loadGameSpec } from './data';

/**
 * Action-schedule RNG parity (gauntlet 009): replays the python capture driver's
 * --hold/--press schedules headlessly and compares the web randint stream against the
 * committed python traces (e2e/reference/beatstreets-action-*-rng.txt, regenerated
 * with:
 *   tools/capture_beatstreets_frame.py --state play --skip-intro --frames-to-play 290
 *     --seed 1 --hold right:0:290 --trace-rng          (enemy-attack)
 *   tools/capture_beatstreets_frame.py --state play --skip-intro --frames-to-play 185
 *     --seed 1 --hold right:0:180 --press 180:0 --trace-rng   (hero-punch)
 * ).
 *
 * Full-stream parity (010): the ENTIRE python randint stream matches the web replay
 * for both schedules. 009 pinned a 190-draw prefix because a JS `in`-on-array bug
 * (`attackFrame in hitFrames` checks indices, python checks values) landed every hit
 * on the attack's first animation frame; fixed in fighter.ts and asserted full-stream
 * here. The web may draw up to 2 extra freeze-boundary sound variants after the
 * python stream ends (capture-window timing) — the comparison covers exactly the
 * python stream length.
 */

const REFERENCE = resolve(__dirname, '../../e2e/reference');

class ScheduledControls implements ControllerInput {
  private queue: GameButton[] = [];
  private liveFrame = -1;
  constructor(
    private holdTo: number,
    _pressAt: number | null,
    private holdDir: 1 | -1 = 1,
  ) {
    void _pressAt; // pressing is applied by the replay loop, not the controls object
  }
  setLiveFrame(f: number): void {
    this.liveFrame = f;
  }
  getX(): number {
    // The driver's --hold left:0:4 faces the hero LEFT (x = -1); the action
    // schedules hold RIGHT (+1). The hoodie standoff depends on the facing
    // (gauntlet 014: the missing left hold shifted the whole fight timeline).
    return this.liveFrame >= 0 && this.liveFrame <= this.holdTo ? this.holdDir : 0;
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
  press(b: GameButton): void {
    this.queue.push(b);
  }
}

/** Replay a driver schedule headlessly; return the web randint stream `[args, value]`. */
function replaySchedule(holdTo: number, pressAt: number | null, freezeTimer: number): { draws: [string, string][]; enemies: Enemy[] } {
  const game = new Game(loadGameSpec(), new ScheduledControls(holdTo, pressAt), {
    rng: cpythonRng(1),
    debugRng: true,
  });
  const controls = game.player.controls as ScheduledControls;
  // Play the intro text to completion, then skip it (mirrors the driver's wait + press).
  let guard = 0;
  while (game.displayedText.length < game.currentText.length && guard < 4000) {
    game.update();
    guard++;
  }
  controls.press(0);
  game.update();
  expect(game.textActive).toBe(false);
  // Fade window + live frames up to the freeze timer (live frame N = timer 254+N applied
  // pre-update — the driver consults the schedule during the update that reaches 255+N).
  for (let i = 0; i < freezeTimer && game.timer < freezeTimer; i++) {
    controls.setLiveFrame(game.textActive ? -1 : game.timer - 254);
    if (pressAt !== null && game.timer - 254 === pressAt) controls.press(0);
    game.update();
  }
  const trace = game.rngTrace as TracingRng;
  const draws = trace.draws
    .filter((d) => d.kind === 'randint')
    .map((d) => [String(d.args), String(d.value)] as [string, string]);
  return { draws, enemies: game.enemies as Enemy[] };
}

/** Parse a python --trace-rng file into the comparable randint stream. */
function pythonRandints(traceFile: string): [string, string][] {
  const out: [string, string][] = [];
  for (const line of readFileSync(traceFile, 'utf8').split('\n')) {
    const m = line.match(/^rng frame=\d+ i=\d+ randint \w*\[(.*?)\] -> (.*)$/);
    if (m) out.push([m[1].replace(/ /g, ''), m[2]]);
  }
  return out;
}

/**
 * Weapon schedule (012): the stage-5 hoodie fight via the driver's --stage 5
 * --place 700:420 hooks — hold left:0:4 (face the approaching hoodie), then a punch
 * every 18 live frames from 15 to 627. The hoodie dies at live 626 (randint(0,2)==0
 * stick drop), the press at 627 picks the stick up, the pickup animation runs to
 * ~658, the press at 669 swings. The web replay mirrors the jump exactly: jumpToStage
 * applied at the end of the first update after the intro text ends, timer untouched.
 * Trace: e2e/reference/beatstreets-weapon-rng.txt, regenerated with:
 *   tools/capture_beatstreets_frame.py --state play --skip-intro --frames-to-play 672
 *     --seed 1 --stage 5 --place 700:420 --hold left:0:4 + --press 15..627 step 18
 *     --trace-rng
 */
const WEAPON_PRESSES = new Set(Array.from({ length: 35 }, (_, i) => 15 + i * 18));
const WEAPON_FREEZE = 926;

function replayWeaponSchedule(): [string, string][] {
  const game = new Game(loadGameSpec(), new ScheduledControls(4, null, -1), { rng: cpythonRng(1), debugRng: true });
  const controls = game.player.controls as ScheduledControls;
  let guard = 0;
  while (game.displayedText.length < game.currentText.length && guard < 4000) {
    game.update();
    guard++;
  }
  controls.press(0);
  game.update();
  expect(game.textActive).toBe(false);
  // The stage jump: one full update after the text ends, timer untouched — the exact
  // counterpart of GameCanvas.applyPendingStageJump and the driver's post-update hook.
  let jumped = false;
  for (let i = 0; i < WEAPON_FREEZE && game.timer < WEAPON_FREEZE; i++) {
    const live = game.textActive ? -1 : game.timer - 254;
    controls.setLiveFrame(live);
    if (live >= 0 && WEAPON_PRESSES.has(live)) controls.press(0);
    game.update();
    if (!jumped && !game.textActive) {
      game.jumpToStage(5, { resetTimer: false });
      game.player.vpos.x = 700;
      game.player.vpos.y = 420;
      jumped = true;
    }
  }
  const trace = game.rngTrace as TracingRng;
  return trace.draws
    .filter((d) => d.kind === 'randint')
    .map((d) => [String(d.args), String(d.value)] as [string, string]);
}

describe.each([
  { label: 'enemy-attack', holdTo: 290, pressAt: null, freeze: 544, trace: 'beatstreets-action-enemyattack-rng.txt' },
  { label: 'hero-punch', holdTo: 180, pressAt: 180, freeze: 439, trace: 'beatstreets-action-heropunch-rng.txt' },
])('action schedule RNG parity ($label)', ({ holdTo, pressAt, freeze, trace }) => {
  it('ctor prefix (85 draws) matches python exactly', () => {
    const py = pythonRandints(resolve(REFERENCE, trace)).slice(0, 85);
    const web = replaySchedule(holdTo, pressAt, freeze).draws.slice(0, 85);
    expect(web).toEqual(py);
  });

  it('full randint stream matches python (web may add freeze-boundary draws after)', () => {
    const py = pythonRandints(resolve(REFERENCE, trace));
    const web = replaySchedule(holdTo, pressAt, freeze).draws;
    expect(web.length).toBeGreaterThanOrEqual(py.length);
    expect(web.slice(0, py.length)).toEqual(py);
  });
});

describe('weapon schedule RNG parity (stage jump + stick)', () => {
  it('full randint stream matches python — incl. the stick drop (randint[0,2]) and durability (randint[12,16])', () => {
    const py = pythonRandints(resolve(REFERENCE, 'beatstreets-weapon-rng.txt'));
    const web = replayWeaponSchedule();
    // 015: EnemyHoodie.died() now drops the stick (randint(0,2)==0 + the
    // randint(12,16) durability in the Stick ctor). The full python stream must
    // appear inside the web's, allowing <=2 trailing freeze-boundary draws.
    expect(py.length - web.length).toBeLessThanOrEqual(2);
    expect(web.slice(0, py.length)).toEqual(py);
  });
});