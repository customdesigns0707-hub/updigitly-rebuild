/**
 * Shared helpers for the Hidden Deck hero canvas panels.
 * Ported 1:1 from the approved standalone mockup (Concept G · v3, map-fixed).
 * Palette is locked: GREEN #00E887 + soft orange #FFB84D only.
 */

export const GREEN = '#00e887';
export const AMBER = '#ffb84d';
export const DIM = '#8b93a1';
export const INK = '#f2f4f2';

export const gA = (a: number) => `rgba(0,232,135,${a})`;
export const aA = (a: number) => `rgba(255,184,77,${a})`;

export interface Dim {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
}

/** One animated panel. `frame()` draws one frame; `resize()` refits the canvas. */
export interface Panel {
  frame(): void;
  resize(): void;
}

/** Size the canvas to its CSS box (DPR-aware, capped at 2) and return draw dims. */
export function fitCanvas(c: HTMLCanvasElement): Dim | null {
  const r = c.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  c.width = r.width * d;
  c.height = r.height * d;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, W: r.width, H: r.height };
}

interface GhostOpts {
  a?: number;
  amber?: boolean;
  size?: number;
  weight?: number;
  align?: CanvasTextAlign;
}

/** Thin, barely-visible ghost text — the "faint data everywhere" signature. */
export function ghost(
  ctx: CanvasRenderingContext2D,
  txt: string,
  x: number,
  y: number,
  { a = 0.24, amber = false, size = 9, weight = 200, align = 'left' }: GhostOpts = {},
) {
  ctx.font = `${weight} ${size}px JetBrains Mono, monospace`;
  ctx.fillStyle = amber ? aA(a) : gA(a);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(txt, x, y);
}
