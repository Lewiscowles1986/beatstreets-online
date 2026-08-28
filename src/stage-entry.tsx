import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './components/GameCanvas';
import './index.css';

/**
 * Dedicated e2e entry for the stage-1 live-gameplay fidelity check (GOAL G2/G3).
 * Renders the real game host with a FIXED seed so the RNG sequence is deterministic
 * across runs. The e2e test drives it (title -> controls -> play -> skip intro ->
 * fade -> N live-gameplay frames) and compares the captured frame against the Python
 * reference. The seed is read from the URL (?seed=1) so the test can vary it without
 * rebuilding.
 *
 * This is a separate Vite entry (stage.html) so the seeded path does not ship inside
 * the main production app bundle.
 */
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? '1');
// Frame-exact capture point: the game timer value to freeze on (255-frame fade + 90
// live-gameplay frames, mirroring tools/capture_beatstreets_frame.py). Pass ?freeze=0
// to disable freezing and run the loop continuously.
const freeze = Number(params.get('freeze') ?? '345') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameCanvas width={800} height={480} seed={seed} freezeAtTimer={freeze} />
  </StrictMode>,
);
