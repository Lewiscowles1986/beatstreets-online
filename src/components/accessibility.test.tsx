import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Hud } from './Hud';
import { StageView } from './StageView';
import { KonamiPanel } from './KonamiPanel';
import { loadGameSpec } from '../game/data';
import './test-utils'; // stubs Image + preloads sprites + no-ops canvas draw (beforeAll)

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
