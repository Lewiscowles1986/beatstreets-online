import { it } from 'vitest';
import { Game, cpythonRng, ControllerInput } from '@beatstreets/engine';
import { loadGameSpec } from './data';

class ScheduledControls implements ControllerInput {
  private liveFrame = -1;
  constructor(private presses: { frame: number; button: number }[], private holds: { dir: string; from: number; to: number }[]) {}
  private activePresses(): Set<number> { const s = new Set<number>(); for (const p of this.presses) if (p.frame === this.liveFrame) s.add(p.button); return s; }
  private holdXY(): [number, number] { let x = 0, y = 0; for (const h of this.holds) { if (this.liveFrame >= h.from && this.liveFrame <= h.to) { if (h.dir === 'left') x = -1; if (h.dir === 'right') x = 1; if (h.dir === 'up') y = -1; if (h.dir === 'down') y = 1; } } return [x, y]; }
  getX(): number { return this.holdXY()[0]; }
  getY(): number { return this.holdXY()[1]; }
  held(_b: number): boolean { return false; }
  private manual = new Set<number>();
  press(b: number): void { this.manual.add(b); }
  pressed(b: number): boolean { return this.manual.has(b) || this.activePresses().has(b); }
  update(): void { this.manual.clear(); }
  setLiveFrame(f: number): void { this.liveFrame = f; }
  dispose(): void {}
}

it('probe pickup state at play frame 627 (python --frames-to-play indexing)', () => {
  const presses = Array.from({ length: 35 }, (_, i) => ({ frame: 15 + i * 18, button: 0 }));
  const rng = cpythonRng(1) as unknown as { randint: (...a: unknown[]) => number; choice: (...a: unknown[]) => unknown };
  const origR = rng.randint.bind(rng);
  const origC = rng.choice.bind(rng);
  let drawIdx = 0;
  rng.randint = (...a: unknown[]) => { const v = origR(...a); console.log(`RNG i=${drawIdx++} pf=${playFramesRef.v} randint ${JSON.stringify(a)} -> ${v}`); return v; };
  rng.choice = (...a: unknown[]) => { const v = origC(...a); console.log(`RNG i=${drawIdx++} pf=${playFramesRef.v} choice ${JSON.stringify(a)} -> ${JSON.stringify(v)}`); return v; };
  const playFramesRef = { v: 0 };
  const game = new Game(loadGameSpec(), new ScheduledControls(presses, [{ dir: 'left', from: 0, to: 4 }]), { rng: rng as never });
  const controls = game.player.controls as ScheduledControls;
  let jumped = false;
  let skipped = false;
  let playFrames = 0;
  playFramesRef.v = 0;
  for (let i = 0; game.timer < 882 && i < 4000; i++) {
    const inPlay = !game.textActive;
    controls.setLiveFrame(inPlay ? playFrames : -1);
    // Mirror the python driver: once the intro text has fully displayed, press
    // button 0 on the next frame to skip it (text_active=false, timer=0) and
    // start the 255-frame fade. The schedule presses then align with live frames.
    if (!skipped && game.textActive && game.displayedText.length >= game.currentText.length && game.displayedText.length > 0) {
      controls.press(0);
      skipped = true;
    }
    if (inPlay && !jumped) {
      game.jumpToStage(5, { resetTimer: false });
      game.player.vpos.x = 700;
      game.player.vpos.y = 420;
      jumped = true;
      const hero = game.player as unknown as { attack: (a: unknown) => void; facingX: number; vpos: { x: number }; lastAttack?: { name: string } };
      const origAttack = hero.attack.bind(hero);
      hero.attack = (a: unknown) => {
        const opps = game.enemies;
        const near = opps.length ? opps[opps.length - 1] : null;
        const hh = near ? (near as unknown as { halfHitArea: { x: number; y: number }; vpos: { x: number; y: number } }) : null;
        console.log(`ATK pf=${playFrames} face=${hero.facingX} heroX=${hero.vpos.x.toFixed(1)} hy=${game.player.vpos.y} last=${hero.lastAttack?.name} opps=[${opps.map(o => `${o.vpos.x.toFixed(0)}hp${o.health}`).join(',')}]${hh ? ` vecx=${(hh.vpos.x - game.player.vpos.x).toFixed(1)} vecy=${(hh.vpos.y - game.player.vpos.y).toFixed(1)} hha=${hh.halfHitArea.x},${hh.halfHitArea.y} reach=${(a as { reach: number }).reach}` : ''}`);
        origAttack(a);
      };
      for (const e of game.enemies) {
        const oe = e as unknown as { hit: (h: unknown, a: unknown) => void; vpos: { x: number }; health: number; stamina: number };
        const origHit = oe.hit.bind(oe);
        oe.hit = (h: unknown, a: unknown) => { console.log(`HITON pf=${playFrames} eX=${oe.vpos.x.toFixed(1)} hp=${oe.health} stam=${oe.stamina}`); origHit(h, a); };
      }
    }
    game.update();
    controls.update();
    if (inPlay) {
      const pf = playFrames;
      if ((pf % 2 === 0 && pf >= 120 && pf <= 340) || pf >= 618) {
        const sticks = game.weapons.map(w => `${w.name}@(${w.vpos.x.toFixed(1)},${w.vpos.y.toFixed(1)})held=${(w as unknown as { held?: boolean }).held}dur=${(w as { durability?: number }).durability}`);
        const enemies = game.enemies.map(e => `${e.constructor.name}@${e.vpos.x.toFixed(0)}hp=${e.health}fs=${e.fallingState}ht=${e.hitTimer}fr=${e.frame}st=${(e as { state?: number }).state}`);
        const b = (game as unknown as { boundary: { left: number } }).boundary;
        console.log(`pf=${pf} scroll=${game.scrollOffset.x.toFixed(1)} bl=${b.left.toFixed(1)} hero=${game.player.vpos.x.toFixed(1)} atk=${game.player.attackTimer} pick=${game.player.pickupAnimation} weapons=[${sticks.join(' ')}] enemies=[${enemies.join(' ')}]`);
      }
      playFrames += 1;
      playFramesRef.v = playFrames;
    }
  }
}, 60000);