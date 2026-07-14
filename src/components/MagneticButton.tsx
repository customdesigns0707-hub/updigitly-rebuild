'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { ReactNode } from 'react';

/** Primary CTA that magnetically attracts the cursor on fine-pointer devices. */
export function MagneticButton({ href, children }: { href: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.22}px,${y * 0.22}px)`;
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
    el.style.transform = 'translate(0,0)';
    setTimeout(() => { if (el) el.style.transition = ''; }, 500);
  };

  return (
    <Link ref={ref} href={href} className="btn-primary" data-hover onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </Link>
  );
}
