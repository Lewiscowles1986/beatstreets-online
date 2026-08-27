import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TitleScreen } from './components/scenes/TitleScreen';
import './index.css';

/**
 * Dedicated e2e entry for the fidelity check (GOAL G5). Renders the title screen at
 * frame 0 (title0 logo) on the exact 800x480 logical canvas over a black backdrop,
 * matching the Python title state (which blits the logo over a black surface so the
 * logo's semi-transparent pixels composite onto black).
 *
 * This is a separate Vite entry (title.html) so the `?view=title` test route does not
 * ship inside the main production app bundle.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: 800, height: 480, background: '#000' }}>
      <TitleScreen width={800} height={480} frame={0} />
    </div>
  </StrictMode>,
);
