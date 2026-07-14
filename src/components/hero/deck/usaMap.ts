/**
 * NATIONAL REACH — big dots-only USA map (no outline stroke, per locked design).
 * Ported 1:1 from the approved mockup: true ~1.8:1 aspect via ASPECT=0.57,
 * contain-fit letterboxed so the shape can never squash; 3 amber regional
 * offices (WEST/CENTRAL/EAST OPS) with breathing pulse + radar ping, inter-
 * office arc mesh, office→city local-reach links, nationwide activity ripples.
 */
import { AMBER, Dim, Panel, aA, fitCanvas, gA, ghost } from './shared';

// Higher-fidelity continental-US outline, traced clockwise from the Pacific NW.
// Coords are raw [nx,ny] in 0..1; ASPECT compresses y so the shape keeps the
// real ~1.8:1 width:height and is letterboxed into the panel (never squashed).
const ASPECT = 0.57;
const US: [number, number][] = [
  [0.072, 0.110], [0.078, 0.075], [0.090, 0.115],
  [0.520, 0.085], [0.527, 0.060], [0.540, 0.095],
  [0.600, 0.120], [0.630, 0.100], [0.665, 0.150], [0.700, 0.160],
  [0.720, 0.185], [0.745, 0.155], [0.780, 0.140], [0.815, 0.120],
  [0.855, 0.165], [0.900, 0.160], [0.945, 0.150], [0.958, 0.110], [0.978, 0.140],
  [0.960, 0.200], [0.930, 0.220], [0.950, 0.255], [0.912, 0.285],
  [0.928, 0.335], [0.948, 0.400], [0.936, 0.445], [0.958, 0.500],
  [0.942, 0.555], [0.925, 0.610], [0.906, 0.665],
  [0.906, 0.725], [0.896, 0.805], [0.878, 0.880], [0.858, 0.950],
  [0.847, 0.895], [0.832, 0.820], [0.816, 0.760], [0.792, 0.740], [0.742, 0.755],
  [0.700, 0.752], [0.662, 0.782], [0.636, 0.756], [0.602, 0.778], [0.566, 0.802],
  [0.586, 0.862], [0.560, 0.905], [0.520, 0.832], [0.500, 0.800],
  [0.458, 0.782], [0.440, 0.742], [0.400, 0.722], [0.352, 0.702],
  [0.310, 0.688], [0.250, 0.686], [0.190, 0.682],
  [0.156, 0.662], [0.136, 0.602], [0.116, 0.542], [0.096, 0.472],
  [0.076, 0.402], [0.062, 0.332], [0.050, 0.252], [0.046, 0.182], [0.060, 0.130],
];
const UP = US.map((p) => [p[0], p[1] * ASPECT] as [number, number]); // aspect-corrected polygon

function inPoly(x: number, y: number, p: [number, number][]) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const minx = Math.min(...UP.map((p) => p[0]));
const maxx = Math.max(...UP.map((p) => p[0]));
const miny = Math.min(...UP.map((p) => p[1]));
const maxy = Math.max(...UP.map((p) => p[1]));

// 3 regional offices spread across the country (raw nx,ny) — no single HQ.
const OFFICES = [
  { rel: [0.14, 0.6] as const, name: 'WEST OPS' },
  { rel: [0.5, 0.44] as const, name: 'CENTRAL OPS' },
  { rel: [0.86, 0.235] as const, name: 'EAST OPS' },
];
const CITIES: [number, number, string][] = [
  [0.1, 0.15, 'SEA'], [0.345, 0.43, 'DEN'], [0.66, 0.3, 'CHI'],
  [0.5, 0.66, 'DAL'], [0.845, 0.87, 'MIA'], [0.78, 0.585, 'ATL'],
];
// local office → city links (indices into CITIES)
const LOCAL_LINKS: [number, number[]][] = [[0, [0, 1]], [1, [1, 2, 3]], [2, [2, 4, 5]]];

interface Dot { x: number; y: number; ph: number; tw: number }
interface Blip { x: number; y: number; r: number; a: number; amber: boolean }

export function createUsaMap(canvas: HTMLCanvasElement): Panel {
  let dim: Dim | null = fitCanvas(canvas);
  let dots: Dot[] = [];
  let tf = { scale: 1, offx: 0, offy: 0 };
  const blips: Blip[] = [];
  let f = 0;
  let t = 0;

  function build(W: number, H: number) {
    // contain-fit the true-aspect shape into the panel, centered (letterboxed)
    const mgn = 0.05, aw = W * (1 - mgn), ah = H * (1 - mgn);
    const scale = Math.min(aw / (maxx - minx), ah / (maxy - miny));
    tf = { scale, offx: (W - (maxx - minx) * scale) / 2, offy: (H - (maxy - miny) * scale) / 2 };
    dots = [];
    const cols = 78, rows = Math.round((78 * (maxy - miny)) / (maxx - minx));
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const ux = minx + ((gx + 0.5) / cols) * (maxx - minx);
        const uy = miny + ((gy + 0.5) / rows) * (maxy - miny);
        if (inPoly(ux, uy, UP)) {
          const jx = (Math.random() - 0.5) * ((maxx - minx) / cols) * 0.9;
          const jy = (Math.random() - 0.5) * ((maxy - miny) / rows) * 0.9;
          dots.push({
            x: tf.offx + (ux + jx - minx) * tf.scale,
            y: tf.offy + (uy + jy - miny) * tf.scale,
            ph: Math.random() * 7,
            tw: 0.4 + Math.random() * 0.6,
          });
        }
      }
    }
  }
  const N2P = (nx: number, ny: number) => ({
    x: tf.offx + (nx - minx) * tf.scale,
    y: tf.offy + (ny * ASPECT - miny) * tf.scale,
  });
  if (dim) build(dim.W, dim.H);

  return {
    resize() {
      dim = fitCanvas(canvas);
      if (dim) build(dim.W, dim.H);
    },
    frame() {
      if (!dim) return;
      const { ctx, W, H } = dim;
      ctx.clearRect(0, 0, W, H);
      f++;
      // land dots — DOTS ONLY (no outline), slow twinkle
      dots.forEach((d) => {
        const a = 0.18 + 0.14 * Math.sin(t * 0.9 + d.ph) * d.tw;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 0.95, 0, 7);
        ctx.fillStyle = gA(Math.max(0.05, a));
        ctx.fill();
      });
      const O = OFFICES.map((o) => ({ ...o, p: N2P(o.rel[0], o.rel[1]) }));
      const C = CITIES.map(([cx, cy, lbl]) => ({ p: N2P(cx, cy), lbl }));
      // local office→city links with inbound pulses (regional reach)
      LOCAL_LINKS.forEach(([oi, cis]) => {
        cis.forEach((ci, k) => {
          const A = O[oi].p, B = C[ci].p;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
          ctx.strokeStyle = gA(0.1); ctx.lineWidth = 1; ctx.stroke();
          const pr = (t * 0.22 + k * 0.4 + oi * 0.2) % 1;
          const px = B.x + (A.x - B.x) * pr, py = B.y + (A.y - B.y) * pr;
          ctx.beginPath(); ctx.arc(px, py, 1.3, 0, 7); ctx.fillStyle = gA(0.75); ctx.fill();
        });
      });
      // minor city nodes + labels
      C.forEach((c) => {
        ctx.beginPath(); ctx.arc(c.p.x, c.p.y, 1.6, 0, 7); ctx.fillStyle = gA(0.7); ctx.fill();
        ghost(ctx, c.lbl, c.p.x, c.p.y - 6, { a: 0.4, size: 8, align: 'center' });
      });
      // inter-office arcs (triangle mesh) with traveling pulses
      const pairs: [number, number][] = [[0, 1], [1, 2], [0, 2]];
      pairs.forEach(([a, b], i) => {
        const A = O[a].p, B = O[b].p;
        const mxp = (A.x + B.x) / 2, myp = Math.min(A.y, B.y) - H * 0.12;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mxp, myp, B.x, B.y);
        ctx.strokeStyle = gA(0.14); ctx.lineWidth = 1; ctx.stroke();
        const pr = (t * 0.1 + i * 0.33) % 1;
        const px = (1 - pr) * (1 - pr) * A.x + 2 * (1 - pr) * pr * mxp + pr * pr * B.x;
        const py = (1 - pr) * (1 - pr) * A.y + 2 * (1 - pr) * pr * myp + pr * pr * B.y;
        ctx.beginPath(); ctx.arc(px, py, 1.9, 0, 7); ctx.fillStyle = AMBER; ctx.fill();
      });
      // nationwide "activity" ripples — random lead-capture blips across the map
      if (f % 16 === 0 && dots.length) {
        const d = dots[(Math.random() * dots.length) | 0];
        blips.push({ x: d.x, y: d.y, r: 1.5, a: 0.5, amber: Math.random() < 0.26 });
      }
      for (let i = blips.length - 1; i >= 0; i--) {
        const bp = blips[i];
        bp.r += 0.65; bp.a -= 0.011;
        if (bp.a <= 0) { blips.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, 7);
        ctx.strokeStyle = bp.amber ? aA(bp.a) : gA(bp.a); ctx.lineWidth = 1; ctx.stroke();
      }
      // office nodes — amber, breathing pulse + slow radar ping
      O.forEach((o, i) => {
        const pulse = 3.4 + Math.sin(t * 1.0 + i) * 1.3;
        const g = ctx.createRadialGradient(o.p.x, o.p.y, 0, o.p.x, o.p.y, 20);
        g.addColorStop(0, aA(0.5)); g.addColorStop(1, aA(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.p.x, o.p.y, 20, 0, 7); ctx.fill();
        const ping = (t * 0.45 + i * 0.3) % 1;
        ctx.beginPath(); ctx.arc(o.p.x, o.p.y, 4 + ping * 38, 0, 7);
        ctx.strokeStyle = aA(0.42 * (1 - ping)); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(o.p.x, o.p.y, pulse, 0, 7); ctx.fillStyle = AMBER; ctx.fill();
        ghost(ctx, o.name, o.p.x, o.p.y - 9, { a: 0.7, amber: true, size: 9, weight: 300, align: 'center' });
      });
      // ghost coverage stats
      ghost(ctx, 'COVERAGE 48 STATES', 6, H - 6, { a: 0.24, size: 9 });
      ghost(ctx, '3 REGIONAL OFFICES', 6, H - 18, { a: 0.24, size: 9 });
      ghost(ctx, 'ACTIVE MARKETS · 214', W - 6, H - 6, { a: 0.22, size: 9, align: 'right' });
      t += 0.008;
    },
  };
}
