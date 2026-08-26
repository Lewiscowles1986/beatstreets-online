import { useState, useEffect } from 'react';
import { ControllerRegistry, KeyboardController } from '../game/core/controller';
import { KonamiDetector, KONAMI, DIR_TO_ANGLE } from '../game/core/konami';

export interface KonamiPanelProps {
  /** Keyboard button map for the 4 game buttons. */
  buttonKeys?: [string, string, string, string];
}

const DEFAULT_BUTTONS: [string, string, string, string] = [' ', 'x', 'c', 'a'];

const DIR_TO_TOKEN: Record<number, string> = {};
for (const [token, angle] of Object.entries(DIR_TO_ANGLE)) DIR_TO_TOKEN[angle] = token;

/**
 * Interactive demo of the input + Konami stack. It wires a live KeyboardController to
 * the DOM keyboard, feeds direction + button events into a KonamiDetector, and shows a
 * live readout of the controller's axis, held buttons, and Konami progress.
 */
export function KonamiPanel({ buttonKeys = DEFAULT_BUTTONS }: KonamiPanelProps) {
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [axis, setAxis] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState<number[]>([]);
  const [lastToken, setLastToken] = useState('');

  useEffect(() => {
    const keysDown = new Set<string>();
    const keyMap = [
      ['Space', buttonKeys[0]],
      ['KeyX', buttonKeys[1]],
      ['KeyC', buttonKeys[2]],
      ['KeyA', buttonKeys[3]],
    ] as const;
    const dirMap: Record<string, string> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };

    const kb = new KeyboardController(
      'keyboard',
      (button) => keysDown.has(keyMap[button][1]),
      () => {
        let x = 0;
        let y = 0;
        if (keysDown.has('ArrowLeft')) x -= 1;
        if (keysDown.has('ArrowRight')) x += 1;
        if (keysDown.has('ArrowUp')) y -= 1;
        if (keysDown.has('ArrowDown')) y += 1;
        return { x, y };
      },
    );
    const reg = new ControllerRegistry();
    reg.add('keyboard', kb);

    const detector = new KonamiDetector();
    let prevButtons: boolean[] = [false, false, false, false];

    const step = () => {
      // Apply keyboard state to the controller then snapshot axis/held.
      for (const [, key] of keyMap) {
        if (keysDown.has(key)) {
          const b = keyMap.findIndex(([, k]) => k === key);
          if (b >= 0 && !prevButtons[b]) feedButton(b as 0 | 1 | 2 | 3);
        }
      }
      prevButtons = [0, 1, 2, 3].map((b) => kb.held(b as 0 | 1 | 2 | 3));
      // Directional feed (on arrow press edges only via detector below).
      setAxis(reg.axis());
      setHeld([0, 1, 2, 3].filter((b) => kb.held(b as 0 | 1 | 2 | 3)));
      setProgress(detector.progress);
      setUnlocked((prev) => prev || detector.progress === KONAMI.length);
    };

    function feedButton(b: 0 | 1 | 2 | 3) {
      const token = b === 0 ? 'a' : b === 1 ? 'b' : '';
      if (token) {
        setLastToken(token);
        if (detector.feed(token)) setUnlocked(true);
      }
    }

    function feedDirection(token: string) {
      setLastToken(token);
      if (detector.feed(token)) setUnlocked(true);
      setProgress(detector.progress);
    }

    const onDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);
      const dir = dirMap[e.key];
      if (dir) feedDirection(dir);
    };
    const onUp = (e: KeyboardEvent) => keysDown.delete(e.code);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const id = window.setInterval(step, 100);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.clearInterval(id);
    };
  }, [buttonKeys]);

  const expected = KONAMI[progress] ?? '—';

  return (
    <div style={{ fontFamily: 'monospace', border: '1px solid #444', padding: 16, maxWidth: 560 }}>
      <h3 style={{ margin: '0 0 8px' }}>Input + Konami panel</h3>
      <p style={{ fontSize: 12, margin: '0 0 12px', color: '#aaa' }}>
        Press arrow keys and {buttonKeys.join(', ')}. Enter the Konami code to unlock.
      </p>
      <div>Axis: x={axis.x.toFixed(1)} y={axis.y.toFixed(1)}</div>
      <div>Held buttons: [{held.join(', ')}]</div>
      <div>
        Konami: next = <strong>{expected}</strong> (progress {progress}/{KONAMI.length})
      </div>
      <div>Last token: {lastToken || '—'}</div>
      <div style={{ marginTop: 8, fontWeight: 700, color: unlocked ? '#7dff7d' : '#999' }}>
        {unlocked ? 'UNLOCKED 🎉' : 'locked'}
      </div>
    </div>
  );
}
