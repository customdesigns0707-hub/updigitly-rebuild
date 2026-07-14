'use client';
import { useEffect } from 'react';

/**
 * Drives the cursor-reactive glow on every panel. One delegated pointermove
 * listener finds the panel under the cursor (or finger) and writes the cursor's
 * position into that panel's --mx/--my CSS vars, so the green radial glow
 * (defined in globals.css) emanates from the exact point of contact. The glow
 * itself fades in/out via CSS :hover, so stale coordinates are never visible.
 */
const PANEL_SELECTOR = '.val, .plan, .model, .addon, .embed-shell, .direct';

export function PanelGlow() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(PANEL_SELECTOR) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  return null;
}
