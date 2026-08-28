import { createRoot } from 'react-dom/client';
import { GameCanvas } from './components/GameCanvas';
import './index.css';

/**
 * Dedicated e2e entry for the stage-1 live-gameplay fidelity check (GOAL G2/G3).
 * Renders the real game host with a FIXED seed so the RNG sequence is deterministic
 * across runs. The e2e test drives it (title -> controls -> play -> intro text plays
 * out -> skip -> fade window -> 90 live-gameplay frames) and compares the captured
 * frame against the Python reference. The seed is read from the URL (?seed=1) so the
 * test can vary it without rebuilding.
 *
 * This is a separate Vite entry (stage.html) so the seeded path does not ship inside
 * the main production app bundle. NOTE: StrictMode is deliberately NOT used here —
 * its dev double-mount would re-run effects and double the seeded Host construction,
 * breaking the "one Game build" contract that the bit-exact RNG replay depends on.
 * The production App entry keeps its own render setup; this e2e entry needs exactly
 * one Host and one play Game.
 */
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '1');
// Frame-exact capture point: the post-intro game timer value to freeze on (255-frame
// fade window + 90 live-gameplay frames, mirroring tools/capture_beatstreets_frame.py).
// Pass ?freeze=0 to disable freezing and run the loop continuously.
const freeze = Number(params.get('freeze') ?? '345') || undefined;

// Deterministic action schedule mirroring the python driver's --press/--hold. Frames
// are in live-gameplay space (0 = first frame after the intro fade, game timer 255).
//   ?press=FRAME:BUTTON,FRAME:BUTTON   press button BUTTON (0-3) on live frame FRAME
//   ?hold=DIR:FROM:TO,DIR:FROM:TO      hold direction DIR (left/right/up/down) FROM..TO
const pressSchedule = (params.get('press') ?? '')
  .split(',')
  .filter(Boolean)
  .map((p) => {
    const [frame, button] = p.split(':');
    return { frame: Number(frame), button: Number(button) };
  });
const holdSchedule = (params.get('hold') ?? '')
  .split(',')
  .filter(Boolean)
  .map((h) => {
    const [dir, from, to] = h.split(':');
    return { dir: dir as 'left' | 'right' | 'up' | 'down', from: Number(from), to: Number(to) };
  });

// Test-harness stage jump + placement, mirroring the python capture driver's
// --stage N / --place X:Y: jump to stage N right after the intro skip (without
// resetting the game timer) and set the player's vpos. ?stage=5&place=700:420
// starts the stage-5 hoodie fight at punch range for the weapon-mechanics gates.
const jumpStage = params.get('stage') ? Number(params.get('stage')) : undefined;
const placeParam = params.get('place');
const place = placeParam
  ? (([x, y]) => ({ x: Number(x), y: Number(y) }))(placeParam.split(':'))
  : undefined;

// Deterministic intro auto-skip (?skip=1): press button 0 at game timer 1 — exactly
// what the python capture driver does (its skip lands on the first play update, long
// before the teletype finishes). The stage scroll runs from the hero placement
// through the 255-frame fade, so a late (teletype-waiting) skip leaves the scroll
// ~380px short of the python reference.
const autoSkipAt = params.get('skip') ? 1 : undefined;

// Debug overlay passthrough (scroll position readout) for manual alignment probes.
const debug = params.get('debug') === '1';

// Per-frame state trace (?trace=1): window.__BS_TRACE gets one row per post-skip
// update — {i, t, h: [x, y, sprite], e: [[sprite, x, y], ...]} — the exact rows the
// headless action-parity replay mirrors, for the browser-vs-headless diff (023).
const trace = params.get('trace') === '1';

createRoot(document.getElementById('root')!).render(
  <GameCanvas
    width={800}
    height={480}
    seed={seed}
    freezeAtTimer={freeze}
    pressSchedule={pressSchedule}
    holdSchedule={holdSchedule}
    jumpStage={jumpStage}
    place={place}
    autoSkipAt={autoSkipAt}
    debug={debug}
    trace={trace}
  />,
);
