import type { ReactNode } from 'react';

/**
 * Visually hidden but available to assistive tech. Use for text that backs a canvas
 * or purely visual element, so screen readers announce the same information a sighted
 * user sees on the canvas.
 */
export function VisuallyHidden({ children, role, live }: { children: ReactNode; role?: string; live?: 'polite' | 'assertive' }) {
  return (
    <span
      className="visually-hidden"
      role={role}
      aria-live={live}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
}
