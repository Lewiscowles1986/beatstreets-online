import { describe, it, expect } from 'vitest';
import { KeyboardController, ControllerRegistry } from './controller';
import { GamepadController, gamepadSnapshot } from './controller-gamepad';
import { WebSocketController } from './controller-websocket';
import { KonamiDetector, KONAMI, DIR_TO_ANGLE } from './konami';

/** A minimal fake WebSocket that records message listeners and lets us dispatch. */
class FakeSocket {
  listeners = new Map<string, (ev: { data: string }) => void>();
  addEventListener(type: string, fn: (ev: { data: string }) => void) {
    this.listeners.set(type, fn);
  }
  emit(data: string) {
    this.listeners.get('message')?.({ data });
  }
}

describe('KeyboardController', () => {
  it('reports pressed only on rising edge', () => {
    let punch = false;
    const kb = new KeyboardController(
      'kb',
      () => punch,
      () => ({ x: 0, y: 0 }),
    );
    kb.update();
    expect(kb.pressed(0)).toBe(false);
    punch = true;
    kb.update();
    expect(kb.pressed(0)).toBe(true);
    kb.update();
    expect(kb.pressed(0)).toBe(false); // held
    expect(kb.held(0)).toBe(true);
  });
});

describe('GamepadController', () => {
  it('maps buttons 0..3 and applies a dead-zone to axes', () => {
    const pad = {
      id: 'test-pad',
      buttons: [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }],
      axes: [0.9, -0.1],
      hat: undefined as [number, number] | undefined,
    };
    const gp = new GamepadController(pad);
    gp.update();
    expect(gp.getX()).toBe(1); // above dead-zone
    expect(gp.getY()).toBe(0); // within dead-zone
    pad.buttons[0] = { pressed: true };
    gp.update();
    expect(gp.pressed(0)).toBe(true);
    gp.update();
    expect(gp.pressed(0)).toBe(false);
    expect(gp.held(0)).toBe(true);
  });

  it('snapshots browser gamepads', () => {
    const gps = gamepadSnapshot(() => [
      {
        id: 'a',
        buttons: [{ pressed: true }],
        axes: [1, 0],
      },
      null,
    ]);
    expect(gps).toHaveLength(1);
    expect(gps[0].id).toBe('a');
    expect(gps[0].buttons[0].pressed).toBe(true);
  });
});

describe('WebSocketController', () => {
  it('consumes JSON commands into held/pressed state', () => {
    const socket = new FakeSocket();
    const ws = new WebSocketController('ws', socket as unknown as Parameters<WebSocketController['attach']>[0]);
    expect(ws.isConnected()).toBe(false);

    socket.emit(JSON.stringify({ held: [0], pressed: [1], x: -1, y: 0 }));
    expect(ws.isConnected()).toBe(true);
    expect(ws.held(0)).toBe(true);
    expect(ws.pressed(1)).toBe(true);
    expect(ws.getX()).toBe(-1);

    // pressed is consumed on the next update (one-shot edge)
    ws.update();
    expect(ws.pressed(1)).toBe(false);
  });

  it('ignores malformed frames', () => {
    const socket = new FakeSocket();
    const ws = new WebSocketController('ws', socket as never);
    expect(() => socket.emit('not json')).not.toThrow();
    expect(ws.held(0)).toBe(false);
  });
});

describe('ControllerRegistry', () => {
  it('merges any-pressed across controllers', () => {
    const reg = new ControllerRegistry();
    reg.add('kb1', new KeyboardController('kb1', () => true, () => ({ x: 0, y: 0 })));
    reg.add('kb2', new KeyboardController('kb2', () => false, () => ({ x: 0, y: 0 })));
    reg.updateAll();
    expect(reg.anyPressed(0)).toBe(true);
    expect(reg.anyHeld(0)).toBe(true);
    expect(reg.axis()).toEqual({ x: 0, y: 0 });
  });

  it('removes controllers (hot-plug) and clears', () => {
    const reg = new ControllerRegistry();
    const kb = new KeyboardController('kb', () => true, () => ({ x: 0, y: 0 }));
    reg.add('kb', kb);
    expect(reg.remove('kb')).toBe(kb);
    expect(reg.anyPressed(0)).toBe(false);
  });
});

describe('KonamiDetector', () => {
  it('unlocks when the exact sequence is entered', () => {
    const d = new KonamiDetector();
    let unlocked = false;
    for (const step of KONAMI) {
      if (d.feed(step)) unlocked = true;
    }
    expect(unlocked).toBe(true);
  });

  it('resets on a wrong input', () => {
    const d = new KonamiDetector();
    d.feed('up');
    d.feed('up');
    d.feed('down'); // wrong (expected down, ok), then break
    d.feed('right'); // wrong at this position
    expect(d.progress).toBe(0);
  });

  it('maps direction names to 8-way angles', () => {
    expect(DIR_TO_ANGLE['up']).toBe(0);
    expect(DIR_TO_ANGLE['down']).toBe(4);
    expect(DIR_TO_ANGLE['left']).toBe(6);
    expect(DIR_TO_ANGLE['right']).toBe(2);
  });
});
