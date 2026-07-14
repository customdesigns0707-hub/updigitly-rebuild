'use client';
import { useEffect, useRef } from 'react';

/**
 * Draggable before/after "beam" comparison. The after-pane is clipped by a CSS
 * var --cut driven by pointer x. Fixed on mobile so the peek reveals content at
 * the edges (mock width ~88% of container).
 */
export function BeamSlider() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const beam = ref.current;
    if (!beam) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dragging = false;
    let teased = false;

    const setCut = (clientX: number) => {
      const r = beam.getBoundingClientRect();
      const pct = Math.min(92, Math.max(8, ((clientX - r.left) / r.width) * 100));
      beam.style.setProperty('--cut', pct + '%');
    };
    const down = (e: PointerEvent) => { dragging = true; teased = true; setCut(e.clientX); beam.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (dragging) setCut(e.clientX); };
    const up = () => { dragging = false; };

    beam.addEventListener('pointerdown', down);
    beam.addEventListener('pointermove', move);
    beam.addEventListener('pointerup', up);
    beam.addEventListener('pointercancel', up);

    let raf = 0;
    if (!reduced) {
      let t0: number | null = null;
      const tease = (now: number) => {
        if (teased) return;
        if (t0 === null) t0 = now;
        const p = (now - t0) / 4000;
        beam.style.setProperty('--cut', 50 + Math.sin(p * 6.2832) * 6 + '%');
        raf = requestAnimationFrame(tease);
      };
      raf = requestAnimationFrame(tease);
    }

    return () => {
      cancelAnimationFrame(raf);
      beam.removeEventListener('pointerdown', down);
      beam.removeEventListener('pointermove', move);
      beam.removeEventListener('pointerup', up);
      beam.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <div className="beam reveal in" ref={ref}>
      <div className="pane before">
        <div className="mock">
          <div className="biz">
            <div className="dotmark">B</div>
            <div>
              <div className="nm">Your Business Today</div>
              <div className="stars">★★★☆☆ · 23 reviews</div>
            </div>
          </div>
          <div className="row"><span>Search visibility</span><b>#14 — page 2</b></div>
          <div className="row"><span>Qualified leads / week</span><b>3</b></div>
          <div className="row"><span>Lead follow-up</span><b>None</b></div>
        </div>
      </div>
      <div className="pane after">
        <div className="mock">
          <div className="biz">
            <div className="dotmark">B</div>
            <div>
              <div className="nm">Your Business, Lit Up</div>
              <div className="stars">★★★★★ · 214 reviews</div>
            </div>
          </div>
          <div className="row"><span>Search visibility</span><b>#1 — top result</b></div>
          <div className="row"><span>Qualified leads / week</span><b>31</b></div>
          <div className="row"><span>Lead follow-up</span><b>Automated — 12 sec</b></div>
        </div>
      </div>
      <div className="handle" />
      <div className="knob" data-hover>◂▸</div>
      <div className="tag b">Before</div>
      <div className="tag a">With Updigitly</div>
    </div>
  );
}
