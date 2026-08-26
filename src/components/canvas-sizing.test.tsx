import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Hud } from './Hud';
import { StageView } from './StageView';
import { StageList } from './StageList';
import { loadGameSpec } from '../game/data';
import './test-utils'; // stubs Image + preloads sprites (beforeAll)

afterEach(() => cleanup());

/**
 * Regression guards for the "white-screen" bug: the canvas host used to stay at its
 * default 300x150 and never draw because the `useCanvas` effect ran once while the
 * component was still showing the loading fallback (no canvas element mounted yet).
 * If assets are ready, each component must mount a canvas at the requested size.
 */

describe('canvas host sizing (guards white-screen)', () => {
  it('HUD mounts an 800x480 canvas once sprites are ready', async () => {
    render(<Hud health={50} maxHealth={100} stamina={200} maxStamina={500} lives={2} score={10} />);
    // The loading fallback is announced as a status region first.
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
    // After preload resolves, the real canvas mounts (group appears).
    await screen.findByRole('group', { name: 'Player status bar' });
    const canvas = screen.getByRole('img');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '480');
  });

  it('StageView mounts a canvas at the requested size', async () => {
    const stage = loadGameSpec().stages.stages[0];
    render(<StageView stage={stage} width={640} height={360} />);
    const canvas = await screen.findByRole('img');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('width', '640');
    expect(canvas).toHaveAttribute('height', '360');
  });

  it('StageList mounts a canvas at the requested size', async () => {
    render(<StageList count={3} width={640} height={360} />);
    const canvas = await screen.findByRole('img');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('width', '640');
    expect(canvas).toHaveAttribute('height', '360');
  });
});
