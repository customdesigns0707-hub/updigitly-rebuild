/**
 * LEADS / WK — thin lollipop chart with amber PEAK marker, ghost week labels
 * and MTD/QTD/CONV stats. Ported 1:1 from the approved mockup.
 */
import { AMBER, Dim, INK, Panel, aA, fitCanvas, gA, ghost } from './shared';

const N = 34;

export function createLeads(canvas: HTMLCanvasElement): Panel {
  let dim: Dim | null = fitCanvas(canvas);
  const vals = Array.from({ length: N }, () => 0.3 + Math.random() * 0.5);
  const phases = Array.from({ length: N }, () => Math.random() * 7);
  const amberIdx = N - 6;
  let t = 0;

  return {
    resize() { dim = fitCanvas(canvas); },
    frame() {
      if (!dim) return;
      const { ctx, W, H } = dim;
      ctx.clearRect(0, 0, W, H);
      const baseY = H - 14, top = 10, stepX = W / N;
      ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < N; i++) {
        const h = (vals[i] + Math.sin(t * 0.5 + phases[i]) * 0.04) * (baseY - top);
        const x = stepX * (i + 0.5), y = baseY - h, amber = i === amberIdx;
        ctx.strokeStyle = amber ? aA(0.9) : gA(0.5);
        ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, amber ? 2.4 : 1.6, 0, 7);
        ctx.fillStyle = amber ? AMBER : gA(0.85); ctx.fill();
        if (amber) ghost(ctx, 'PEAK', x, y - 8, { a: 0.6, amber: true, size: 9, align: 'center' });
        if (i % 6 === 0) ghost(ctx, 'W' + (i + 1), x, H - 3, { a: 0.18, size: 8, align: 'center' }); // ghost week labels
      }
      ctx.font = '300 12px JetBrains Mono, monospace';
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('▲ +' + (38 + Math.round(Math.sin(t * 0.5) * 4)) + ' /wk', 2, 14);
      ghost(ctx, 'MTD 152', W - 4, 14, { a: 0.26, align: 'right', size: 9 });
      ghost(ctx, 'QTD 611', W - 4, 26, { a: 0.2, align: 'right', size: 9 });
      ghost(ctx, 'CONV 4.8%', W - 4, 38, { a: 0.26, amber: true, align: 'right', size: 9 });
      t += 0.012;
    },
  };
}
