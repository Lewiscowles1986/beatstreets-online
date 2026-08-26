import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Hud } from './Hud';
import { StageView } from './StageView';
import { KonamiPanel } from './KonamiPanel';
import { loadGameSpec } from '../game/data';
import { preloadSprites } from '../game/assets';

// The shared asset loader decodes Image()s; stub a synchronous decode for jsdom.
class FakeImage {
  src = '';
  naturalWidth = 1;
  naturalHeight = 1;
  complete = true;
  decoding = 'async' as const;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    queueMicrotask(() => this.onload?.());
  }
}

beforeAll(async () => {
  vi.stubGlobal('Image', FakeImage);
  await preloadSprites();
});

afterEach(() => cleanup());

describe('accessibility (ARIA)', () => {
  it('HUD exposes a group, a live status region and progressbar semantics', async () => {
    render(<Hud health={50} maxHealth={100} stamina={200} maxStamina={500} lives={2} score={10} />);
    await screen.findByRole('group', { name: 'Player status bar' });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/Health 50 percent/);
    expect(status).toHaveTextContent(/stamina 40 percent/);
    expect(status).toHaveTextContent(/2 lives/);
    expect(status).toHaveTextContent(/score 10/);
  });

  it('StageView describes its contents to assistive tech', async () => {
    const stage = loadGameSpec().stages.stages[0];
    render(<StageView stage={stage} />);
    const canvas = await screen.findByRole('img');
    expect(canvas.getAttribute('aria-label')).toContain('enemies');
  });

  it('KonamiPanel is a labelled region with a polite live status', () => {
    render(<KonamiPanel />);
    expect(screen.getByRole('region', { name: 'Input and Konami code panel' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
