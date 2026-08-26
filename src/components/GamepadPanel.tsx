import { useEffect, useState } from 'react';
import { gamepadSnapshot, GamepadLike } from '@beatstreets/engine';

export interface GamepadPanelProps {
  width?: number;
}

/**
 * A live readout of the Browser Gamepad API: connected pads, their buttons (0..3 map
 * to punch/kick/elbow/flying-kick), and the left-stick axis with dead-zone. This is a
 * Storybook-first component so the gamepad adapter can be inspected before wiring it
 * into the game host.
 */
export function GamepadPanel({ width = 320 }: GamepadPanelProps) {
  const [pads, setPads] = useState<GamepadLike[]>([]);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        setPads(gamepadSnapshot(() => navigator.getGamepads() as unknown as (RawGamepadLike | null)[]));
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section aria-label="Gamepad panel" style={{ fontFamily: 'monospace', border: '1px solid #444', padding: 16, maxWidth: width }}>
      <h3 style={{ margin: '0 0 8px' }}>Gamepad</h3>
      {pads.length === 0 && (
        <p style={{ margin: 0, color: '#888' }}>
          No gamepad connected — press a button on your controller.
        </p>
      )}
      {pads.map((pad) => (
        <div key={pad.id} role="group" aria-label={`gamepad ${pad.id}`} style={{ marginTop: 8 }}>
          <div style={{ color: '#9ad0ff' }}>{pad.id}</div>
          <div>
            Buttons:{' '}
            {[0, 1, 2, 3].map((b) => (
              <span key={b} style={{ display: 'inline-block', minWidth: 18, color: pad.buttons[b]?.pressed ? '#7dff7d' : '#555' }}>
                {b}
              </span>
            ))}
          </div>
          <div>
            Axis: x={pad.axes[0]?.toFixed(2) ?? 0} y={pad.axes[1]?.toFixed(2) ?? 0}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Minimal structural gamepad type for the browser snapshot. */
type RawGamepadLike = {
  id: string;
  buttons: Array<{ pressed: boolean }>;
  axes: number[];
};
