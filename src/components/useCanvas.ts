import { useEffect, useRef } from 'react';

/**
 * A React hook that gives a component a managed 2D canvas and its rendering context,
 * sized to a fixed width/height. The `draw` callback runs on mount and again whenever
 * `width`, `height`, or any `redrawDeps` change.
 */
export function useCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  redrawDeps: readonly unknown[] = [],
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);

  // Keep the latest `draw` in a ref without mutating it during render.
  useEffect(() => {
    drawRef.current = draw;
  });

  // A stable serialised key from the caller's redraw deps; the effect depends on this
  // single string so eslint can statically verify the dependency list.
  const redrawKey = JSON.stringify(redrawDeps);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure canvas backing store matches CSS size (avoid blur).
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRef.current(ctx);
  }, [width, height, redrawKey]);

  return canvasRef;
}
