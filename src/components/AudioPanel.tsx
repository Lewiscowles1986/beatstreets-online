import { useEffect, useRef, useState } from 'react';
import { AudioController } from '../game/audio';

export interface AudioPanelProps {
  width?: number;
}

/**
 * A live control panel for the game's audio: start/pause the theme and adjust volume.
 * Storybook-first so audio behaviour can be inspected before wiring it into the host.
 */
export function AudioPanel({ width = 300 }: AudioPanelProps) {
  const audioRef = useRef<AudioController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  useEffect(() => {
    audioRef.current = new AudioController();
    return () => {
      audioRef.current?.pauseTheme();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.isPlaying()) {
      audio.pauseTheme();
      setPlaying(false);
    } else {
      audio.playTheme();
      setPlaying(true);
    }
  };

  const onVolume = (v: number) => {
    setVolume(v);
    audioRef.current?.setVolume(v);
  };

  return (
    <section aria-label="Audio panel" style={{ fontFamily: 'monospace', border: '1px solid #444', padding: 16, maxWidth: width }}>
      <h3 style={{ margin: '0 0 8px' }}>Audio</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={toggle} style={{ padding: '4px 12px' }}>
          {playing ? 'Pause theme' : 'Play theme'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Volume
          <input
            aria-label="volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span>{Math.round(volume * 100)}%</span>
        </label>
      </div>
      <div role="status" aria-live="polite" style={{ marginTop: 10, color: playing ? '#7dff7d' : '#888' }}>
        {playing ? 'Theme playing' : 'Theme paused'}
      </div>
      <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
        SFX are synthesised in the Python original (no asset files) and are a no-op in this port.
      </p>
    </section>
  );
}
