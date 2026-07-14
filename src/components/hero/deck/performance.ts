/**
 * PERFORMANCE — thin concentric rings (1.4px) SEO / UPTIME / ENGAGE with
 * live wobble + ghost data. Ported 1:1 from the approved mockup.
 */
import { AMBER, DIM, Dim, GREEN, INK, Panel, fitCanvas, gA, ghost } from './shared';

const RINGS = [
  { f: 0.46, base: 0.86, amp: 0.02, col: GREEN, label: 'SEO' },
  { f: 0.34, base: 0.94, amp: 0.015, col: gA(0.5), label: 'UPTIME' },
  { f: 0.22, base: 0.68, amp: 0.03, col: AMBER, label: 'ENGAGE' },
];

export function createPerformance(canvas: HTMLCanvasElement): Panel {
  let dim: Dim | null = fitCanvas(canvas);
  let intro = 0;
  let t = 0;

  return {
    resize() { dim = fitCanvas(canvas); },
    frame() {
      if (!dim) return;
      const { ctx, W, H } = dim;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.36, cy = H * 0.54, R = Math.min(W, H) * 0.98;
      intro = Math.min(1, intro + 0.006);
      const iE = 0.5 - 0.5 * Math.cos(Math.PI * intro);
      RINGS.forEach((r, i) => {
        const rr = R * r.f;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke();
        const live = r.base + Math.sin(t * 0.5 + i * 1.3) * r.amp;
        ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * live * iE);
        ctx.strokeStyle = r.col; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
      });
      const lo = RINGS[0].base + Math.sin(t * 0.5) * RINGS[0].amp;
      ctx.font = `300 ${Math.max(18, W * 0.085)}px JetBrains Mono, monospace`;
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(lo * iE * 100) + '%', cx, cy - 4);
      ctx.font = '300 9px JetBrains Mono, monospace'; ctx.fillStyle = DIM;
      ctx.fillText('OVERALL', cx, cy + Math.max(14, W * 0.05));
      ctx.textBaseline = 'alphabetic';
      // legend
      RINGS.forEach((r, i) => {
        const ly = H * 0.24 + i * H * 0.15;
        ctx.beginPath(); ctx.arc(W * 0.68, ly - 3, 2.6, 0, 7); ctx.fillStyle = r.col; ctx.fill();
        ghost(ctx, r.label, W * 0.68 + 10, ly, { a: 0.5, size: 9, weight: 300 });
      });
      // extra ghost data
      ghost(ctx, 'CRAWL 1.2K', W * 0.68, H * 0.72, { a: 0.22, size: 8 });
      ghost(ctx, 'INDEX 98%', W * 0.68, H * 0.8, { a: 0.22, size: 8 });
      ghost(ctx, 'BOUNCE 21%', W * 0.68, H * 0.88, { a: 0.22, size: 8 });
      ghost(ctx, 'SESS 4:12', 4, H * 0.92, { a: 0.2, size: 8 });
      ghost(ctx, 'LINKS 340', 4, H * 0.84, { a: 0.2, size: 8 });
      t += 0.01;
    },
  };
}
