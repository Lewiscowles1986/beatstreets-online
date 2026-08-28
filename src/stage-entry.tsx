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

createRoot(document.getElementById('root')!).render(
  <GameCanvas width={800} height={480} seed={seed} freezeAtTimer={freeze} />,
);
