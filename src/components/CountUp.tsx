'use client';
import { useEffect, useRef, useState } from 'react';

/** Animated count-up that fires once when scrolled into view.
 *  `pad` zero-pads the (integer) result to that width, e.g. pad={3} → "007". */
export function CountUp({ to, decimals = 0, pad }: { to: number; decimals?: number; pad?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Default to the real target value so SSR markup, no-JS, and crawlers/screen
  // readers always see the true number — never a literal 0. The animation
  // (when it runs) dips to 0 and counts back up only after mount + in-view.
  const [val, setVal] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setVal(to); return; }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          setVal(0);
          const dur = 1600;
          let start: number | null = null;
          const tick = (now: number) => {
            if (start === null) start = now;
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setVal(to * ease);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  const display = pad != null ? Math.round(val).toString().padStart(pad, '0') : val.toFixed(decimals);
  return <span ref={ref}>{display}</span>;
}
