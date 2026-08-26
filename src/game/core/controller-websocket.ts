import { Controller, GameButton } from './controller';

/**
 * A WebSocket controller: receives JSON command messages and turns them into held /
 * pressed button state. This is how Beat Streets can be driven remotely (e.g. a phone
 * or an external input harness) over a socket.
 *
 * Wire protocol (a JSON object with `held`, `pressed`, `x`, `y`):
 *   { "held": [0], "pressed": [1], "x": 0, "y": -1 }
 *
 * `held`/`pressed` are arrays of logical button numbers (0..3); `x`/`y` are the current
 * movement axis. The caller is responsible for connecting the socket; this controller
 * consumes messages via `handleMessage`.
 */
export interface WsCommand {
  held?: number[];
  pressed?: number[];
  x?: number;
  y?: number;
}

export interface SocketLike {
  addEventListener(
    type: 'message',
    listener: (ev: { data: string }) => void,
  ): void;
  addEventListener(type: string, listener: (...args: unknown[]) => void): void;
}

export class WebSocketController extends Controller {
  private heldButtons = new Set<GameButton>();
  private pressedButtons = new Set<GameButton>();
  private x = 0;
  private y = 0;
  private connected = false;

  constructor(
    name: string,
    socket?: SocketLike,
  ) {
    super(name);
    if (socket) this.attach(socket);
  }

  attach(socket: SocketLike): void {
    socket.addEventListener('message', (ev) => this.handleMessage(ev.data));
  }

  /** Parse a JSON command and update held/pressed state. */
  handleMessage(data: string): void {
    let cmd: WsCommand;
    try {
      cmd = JSON.parse(data) as WsCommand;
    } catch {
      return; // ignore malformed frames
    }
    this.connected = true;
    this.heldButtons = new Set((cmd.held ?? []).map(Number).filter(isButton) as GameButton[]);
    this.pressedButtons = new Set((cmd.pressed ?? []).map(Number).filter(isButton) as GameButton[]);
    this.x = cmd.x ?? this.x;
    this.y = cmd.y ?? this.y;
  }

  override update(): void {
    // Pressed edges are one-shot: consume them on the next frame.
    this.pressedButtons.clear();
  }

  override getX(): number {
    return this.x;
  }

  override getY(): number {
    return this.y;
  }

  override held(button: GameButton): boolean {
    return this.heldButtons.has(button);
  }

  override pressed(button: GameButton): boolean {
    return this.pressedButtons.has(button);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

function isButton(n: number): n is GameButton {
  return Number.isInteger(n) && n >= 0 && n <= 3;
}
