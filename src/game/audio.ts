import { theme } from './assets';

/**
 * Audio for Beat Streets. The web port bundles a theme track (`theme.ogg`); sound
 * effects in the Python game are synthesised at runtime and have no asset files here,
 * so they're a no-op hook for now. This keeps the engine's `playSound` calls working
 * without crashing.
 *
 * The theme uses a single shared HTMLAudioElement (looping); callers can start/stop it.
 */
export class AudioController {
  private themeEl: HTMLAudioElement;
  private themeStarted = false;
  private volume = 0.3;

  constructor() {
    this.themeEl = new Audio(theme);
    this.themeEl.loop = true;
    this.themeEl.volume = this.volume;
  }

  /** Begin playing the theme (idempotent). */
  playTheme(): void {
    if (this.themeStarted) return;
    this.themeStarted = true;
    this.themeEl.play().catch(() => {
      // Autoplay may be blocked until the user interacts; ignore.
    });
  }

  /** Pause the theme. */
  pauseTheme(): void {
    this.themeStarted = false;
    this.themeEl.pause();
  }

  /** Set volume in [0,1]. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.themeEl.volume = this.volume;
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.themeStarted && !this.themeEl.paused;
  }
}
