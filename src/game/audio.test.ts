import { describe, it, expect, vi, afterEach } from 'vitest';
import { AudioController } from './audio';

/** A fake HTMLAudioElement for jsdom. */
class FakeAudio {
  loop = false;
  volume = 1;
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AudioController', () => {
  it('plays the theme idempotently', () => {
    vi.stubGlobal('Audio', FakeAudio);
    const audio = new AudioController();
    audio.playTheme();
    audio.playTheme(); // second call should not start again
    expect(audio.isPlaying()).toBe(true);
  });

  it('pauses the theme', () => {
    vi.stubGlobal('Audio', FakeAudio);
    const audio = new AudioController();
    audio.playTheme();
    audio.pauseTheme();
    expect(audio.isPlaying()).toBe(false);
  });

  it('clamps volume to [0,1]', () => {
    vi.stubGlobal('Audio', FakeAudio);
    const audio = new AudioController();
    audio.setVolume(2);
    expect(audio.getVolume()).toBe(1);
    audio.setVolume(-1);
    expect(audio.getVolume()).toBe(0);
  });
});
