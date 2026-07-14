'use client';
import { useEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';

/**
 * Scroll-in reveal wrapper. Adds `.in` when the element enters the viewport.
 * `as` lets you render any tag (div by default) while keeping the animation.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className = '',
  extraClass = 'reveal',
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  extraClass?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`${extraClass}${seen ? ' in' : ''} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
