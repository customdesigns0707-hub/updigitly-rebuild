/**
 * GROWTH INDEX — 12 MO — thin (1.1px) upward-trending line with amber dashed
 * baseline, ghost gridlines/months and CTR/CPL/ROI stat block.
 * Ported 1:1 from the approved mockup.
 */
import { Dim, GREEN, Panel, aA, fitCanvas, gA, ghost } from './shared';

const N = 80;
const FRAMES = 150;
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function createGrowthIndex(canvas: HTMLCanvasElement): Panel {
  let dim: Dim | null = fitCanvas(canvas);
  const data: number[] = [];
  let base = 0.18;
  for (let i = 0; i < N; i++) {
    base += 0.006 + Math.random() * 0.006;
    base = Math.min(0.75, base);
    data.push(base + (Math.random() - 0.5) * 0.03);
  }
  let next = data[N - 1];
  let seg = 1;
  let trend = 1;
  function newTarget() {
    const last = data[data.length - 1];
    if (last > 0.86) trend = -1;
    else if (last < 0.24) trend = 1;
    next = Math.max(0.15, Math.min(0.9, last + trend * (0.02 + Math.random() * 0.03) + (Math.random() - 0.5) * 0.02));
  }
  newTarget();

  return {
    resize() { dim = fitCanvas(canvas); },
    frame() {
      if (!dim) return;
      const { ctx, W, H } = dim;
      ctx.clearRect(0, 0, W, H);
      seg += 1 / FRAMES;
      if (seg >= 1) { data.push(next); data.shift(); seg = 0; newTarget(); }
      const pts = data.slice();
      const e = 0.5 - 0.5 * Math.cos(Math.PI * seg);
      pts.push(data[data.length - 1] + (next - data[data.length - 1]) * e);
      const stepX = W / (pts.length - 1);
      const yOf = (v: number) => H - 12 - v * (H - 30);
      // ghost gridlines + y labels
      for (let g = 0; g <= 4; g++) {
        const y = 12 + ((H - 30) * g) / 4;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke();
        ghost(ctx, String(100 - g * 25), 2, y - 2, { a: 0.18, size: 8 });
      }
      // ghost month ticks
      MONTHS.forEach((m, i) => ghost(ctx, m, ((i + 0.5) / 12) * W, H - 2, { a: 0.16, size: 8, align: 'center' }));
      // area
      ctx.beginPath(); ctx.moveTo(0, yOf(pts[0]));
      pts.forEach((v, i) => ctx.lineTo(i * stepX, yOf(v)));
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, gA(0.14)); grd.addColorStop(1, gA(0));
      ctx.fillStyle = grd; ctx.fill();
      // amber trend baseline (steeper up)
      ctx.beginPath(); ctx.setLineDash([4, 5]);
      ctx.moveTo(0, yOf(0.22)); ctx.lineTo(W, yOf(0.7));
      ctx.strokeStyle = aA(0.4); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      // thin line
      ctx.beginPath();
      pts.forEach((v, i) => {
        const x = i * stepX, y = yOf(v);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = GREEN; ctx.lineWidth = 1.1; ctx.stroke();
      // leading dot
      const lx = W, ly = yOf(pts[pts.length - 1]);
      const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, 10);
      g2.addColorStop(0, gA(0.8)); g2.addColorStop(1, gA(0));
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, 7); ctx.fill();
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, 7); ctx.fill();
      // ghost stat block
      ghost(ctx, 'CTR 3.1%', W - 4, 16, { a: 0.26, align: 'right', size: 9 });
      ghost(ctx, 'CPL $12', W - 4, 28, { a: 0.2, align: 'right', size: 9 });
      ghost(ctx, 'ROI 4.2×', W - 4, 40, { a: 0.26, amber: true, align: 'right', size: 9 });
      ghost(ctx, 'MoM +8%', W - 4, 52, { a: 0.2, align: 'right', size: 9 });
    },
  };
}
