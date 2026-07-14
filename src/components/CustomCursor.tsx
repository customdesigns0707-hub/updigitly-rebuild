'use client';
import { useEffect } from 'react';

/**
 * Kinetic dot+ring cursor. Activates only on fine-pointer, non-reduced-motion
 * desktops. Adds `.has-cursor` to <body> so CSS hides the native cursor only
 * when ours is live. Elements with [data-hover] grow the ring.
 */
export function CustomCursor() {
  useEffect(() => {
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    document.body.classList.add('has-cursor');

    let cx = 0, cy = 0, rx = 0, ry = 0, raf = 0;
    const onMove = (e: MouseEvent) => { cx = e.clientX; cy = e.clientY; };
    const loop = () => {
      rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
      dot.style.transform = `translate(${cx - 3}px,${cy - 3}px)`;
      ring.style.transform = `translate(${rx - 17}px,${ry - 17}px)`;
      raf = requestAnimationFrame(loop);
    };
    const enter = () => document.body.classList.add('cursor-hover');
    const leave = () => document.body.classList.remove('cursor-hover');

    document.addEventListener('mousemove', onMove);
    const targets = document.querySelectorAll('[data-hover]');
    targets.forEach((el) => { el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave); });
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      targets.forEach((el) => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); });
      dot.remove(); ring.remove();
      document.body.classList.remove('has-cursor', 'cursor-hover');
    };
  }, []);

  return null;
}
