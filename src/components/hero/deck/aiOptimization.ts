/**
 * AI OPTIMIZATION — thin node constellation: AI core + 6 integrations
 * (CRM/SMS/CHAT/SEO/EMAIL/ADS) with pulses flowing INTO the core.
 * Ported 1:1 from the approved mockup.
 */
import { AMBER, Dim, GREEN, Panel, fitCanvas, gA, ghost } from './shared';

const SATS = ['CRM', 'SMS', 'CHAT', 'SEO', 'EMAIL', 'ADS'];

export function createAiOptimization(canvas: HTMLCanvasElement): Panel {
  let dim: Dim | null = fitCanvas(canvas);
  let t = 0;

  return {
    resize() { dim = fitCanvas(canvas); },
    frame() {
      if (!dim) return;
      const { ctx, W, H } = dim;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.4, cy = H * 0.52, R = Math.min(W, H) * 0.36, rot = t * 0.05;
      // connections + inbound pulses
      SATS.forEach((s, i) => {
        const a = rot + (i / SATS.length) * Math.PI * 2;
        const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy);
        ctx.strokeStyle = gA(0.16); ctx.lineWidth = 1; ctx.stroke();
        const pr = (t * 0.12 + i * 0.17) % 1; // flowing INTO the core
        const px = sx + (cx - sx) * pr, py = sy + (cy - sy) * pr;
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 7);
        ctx.fillStyle = i % 3 === 0 ? AMBER : GREEN; ctx.fill();
        // satellite node + label
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fillStyle = gA(0.7); ctx.fill();
        ghost(ctx, s, sx, sy - 6, { a: 0.5, size: 8, align: 'center' });
      });
      // core
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      g.addColorStop(0, gA(0.28)); g.addColorStop(1, gA(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fillStyle = GREEN; ctx.fill();
      // rotating scan ring around core
      ctx.beginPath(); ctx.arc(cx, cy, 10, rot * 4, rot * 4 + 1.6);
      ctx.strokeStyle = gA(0.5); ctx.lineWidth = 1; ctx.stroke();
      ghost(ctx, 'AI', cx, cy + 14, { a: 0.6, size: 9, weight: 300, align: 'center' });
      // ghost stats
      ghost(ctx, 'OPTIMIZING…', 4, 14, { a: 0.28, size: 9 });
      ghost(ctx, 'MODELS 6', W - 4, H * 0.72, { a: 0.24, size: 8, align: 'right' });
      ghost(ctx, 'TASKS 1.2K/D', W - 4, H * 0.8, { a: 0.24, size: 8, align: 'right' });
      ghost(ctx, 'ACC 96.4%', W - 4, H * 0.88, { a: 0.24, amber: true, size: 8, align: 'right' });
      ghost(ctx, '6 INTEGRATIONS', 4, H * 0.92, { a: 0.22, size: 8 });
      t += 0.01;
    },
  };
}
