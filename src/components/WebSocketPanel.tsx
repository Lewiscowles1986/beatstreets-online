import { useEffect, useRef, useState } from 'react';
import { WebSocketController } from '@beatstreets/engine';

export interface WebSocketPanelProps {
  /** Default WebSocket URL to connect to. */
  defaultUrl?: string;
  width?: number;
}

/**
 * A panel for driving the game over a WebSocket. It connects a socket, wires it to the
 * engine's {@link WebSocketController}, and lets you send test commands. This is a
 * Storybook-first component so the remote-input adapter can be inspected before use.
 */
export function WebSocketPanel({ defaultUrl = 'ws://localhost:8080', width = 320 }: WebSocketPanelProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [sent, setSent] = useState<string[]>([]);
  const controllerRef = useRef<WebSocketController | null>(null);

  useEffect(() => {
    return () => {
      // Close the socket on unmount.
      (controllerRef.current as unknown as { close?: () => void } | null)?.close?.();
      controllerRef.current = null;
    };
  }, []);

  const connect = () => {
    setStatus('connecting');
    const socket = new WebSocket(url);
    const controller = new WebSocketController('websocket', socket as unknown as Parameters<WebSocketController['attach']>[0]);
    controllerRef.current = controller;
    socket.onopen = () => setStatus('connected');
    socket.onerror = () => setStatus('disconnected');
    socket.onclose = () => setStatus('disconnected');
  };

  const send = (held: number[]) => {
    const msg = JSON.stringify({ held, x: 0, y: 0 });
    setSent((s) => [...s.slice(-4), msg]);
    if (controllerRef.current) {
      (controllerRef.current as unknown as { handleMessage?(d: string): void }).handleMessage?.(msg);
    }
  };

  return (
    <section aria-label="WebSocket panel" style={{ fontFamily: 'monospace', border: '1px solid #444', padding: 16, maxWidth: width }}>
      <h3 style={{ margin: '0 0 8px' }}>WebSocket input</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="WebSocket URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1, fontFamily: 'monospace', padding: 4 }}
        />
        <button type="button" onClick={connect} style={{ padding: '4px 10px' }}>
          {status === 'connected' ? 'Reconnect' : 'Connect'}
        </button>
      </div>
      <div style={{ marginTop: 8, color: status === 'connected' ? '#7dff7d' : '#999' }}>
        Status: {status}
      </div>
      <div role="group" aria-label="test commands" style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => send([0])}>Punch (btn 0)</button>
        <button type="button" onClick={() => send([1])}>Kick (btn 1)</button>
        <button type="button" onClick={() => send([])}>Release</button>
      </div>
      <div style={{ marginTop: 12 }}>
        Sent:{' '}
        {sent.length === 0 && <span style={{ color: '#888' }}>none</span>}
        {sent.map((m, i) => (
          <div key={i} style={{ color: '#9ad0ff', fontSize: 12 }}>{m}</div>
        ))}
      </div>
    </section>
  );
}
