import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntroOutroText } from './components/scenes/IntroOutroText';
import { useSpriteAssets } from './components/useSpriteAssets';
import storyJson from './assets/data/story.json';
import './index.css';

/**
 * Dedicated e2e entry for the intro-text fidelity check (GOAL G5). Renders the
 * intro story overlay at its fully-revealed state on the exact 800x480 logical
 * canvas over a black backdrop, matching the Python intro frame captured at
 * seed=1. The stolen item is read from the URL (?stolen=N) and defaults to the
 * seed-1 choice (index 2: "THE COMPLETE WORKS OF\nSHAKESPEARE" — verified via the
 * driver's --trace-rng: `choice(stolen_items)` at seed 1 returns index 2).
 *
 * This is a separate Vite entry (intro.html) so the intro state does not ship
 * inside the main production app bundle.
 */
const params = new URLSearchParams(window.location.search);
const stolenIndex = Number(params.get('stolen') ?? '2');
const stolen = storyJson.stolen_items[stolenIndex] ?? '';
const introText = storyJson.intro_prefix + stolen + storyJson.intro_suffix;

function IntroEntry() {
  const { ready } = useSpriteAssets();
  if (!ready) return <div style={{ width: 800, height: 480, background: '#000' }} aria-busy="true" role="status" />;
  return (
    <div style={{ width: 800, height: 480, background: '#000' }}>
      <IntroOutroText width={800} height={480} text={introText} displayedText={introText} textActive timer={0} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntroEntry />
  </StrictMode>,
);
