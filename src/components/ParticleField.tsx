'use client';
import { useEffect, useRef } from 'react';

/**
 * Hero "Signal Field" — a dim particle grid that ignites signal-green near
 * the cursor. Canvas-based, DPR-aware, and degrades to a static frame under
 * prefers-reduced-motion. Absolutely positioned to fill its parent (.hero).
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const GAP = 42;
    let pts: { ox: number; oy: number; e: number }[] = [];
    let W = 0, H = 0;
    const mouse = { x: -9999, y: -9999 };

    const build = () => {
      W = canvas.width = canvas.offsetWidth * dpr;
      H = canvas.height = canvas.offsetHeight * dpr;
      pts = [];
      const gap = GAP * dpr;
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) pts.push({ ox: x, oy: y, e: 0 });
      }
    };
    build();
    window.addEventListener('resize', build);

    const onMove = (ev: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (ev.clientX - r.left) * dpr;
      mouse.y = (ev.clientY - r.top) * dpr;
    };
    document.addEventListener('mousemove', onMove);

    let raf = 0;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.008;
      const R = 190 * dpr;
      const gap = GAP * dpr;
      for (const p of pts) {
        const dx = p.ox - mouse.x;
        const dy = p.oy - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const target = d < R ? 1 - d / R : 0;
        p.e += (target - p.e) * 0.08;
        const amb = 0.5 + 0.5 * Math.sin(t + p.ox * 0.002 + p.oy * 0.0013);
        const a = 0.05 + amb * 0.05 + p.e * 0.85;
        const size = (1 + p.e * 2.2) * dpr;
        ctx.fillStyle = p.e > 0.02 ? `rgba(0,232,135,${a.toFixed(3)})` : `rgba(140,150,170,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.ox, p.oy, size, 0, 6.2832);
        ctx.fill();
        if (p.e > 0.35) {
          ctx.strokeStyle = `rgba(0,232,135,${(p.e * 0.14).toFixed(3)})`;
          ctx.lineWidth = dpr * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.ox, p.oy); ctx.lineTo(p.ox + gap, p.oy);
          ctx.moveTo(p.ox, p.oy); ctx.lineTo(p.ox, p.oy + gap);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      for (const p of pts) {
        ctx.fillStyle = 'rgba(140,150,170,0.08)';
        ctx.beginPath();
        ctx.arc(p.ox, p.oy, dpr, 0, 6.2832);
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      document.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
