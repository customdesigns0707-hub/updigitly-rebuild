'use client';
import { useEffect, useState } from 'react';
import { ParticleField } from '@/components/ParticleField';
import { DeckLayer } from './DeckLayer';

/**
 * Homepage hero decoration switch — mounts exactly ONE variant so hidden
 * canvases never burn CPU:
 *
 *   shortest viewport side >= 600px  → Hidden Deck (new hero)
 *       - width >= 1100px: desktop corner layout (pure CSS)
 *       - width  < 1100px: tablet centered-map layout (pure CSS)
 *   shortest viewport side  < 600px  → classic hero (ParticleField),
 *       i.e. ALL phones in either orientation keep the existing hero.
 *
 * Switching on the SHORTER side means a landscape phone (e.g. 844×390)
 * never leaks the deck design. The matchMedia listener re-evaluates live
 * on resize/rotation, unmounting the old variant (its effect cleanup
 * cancels rAF loops and listeners).
 */
const DECK_QUERY = '(min-width: 600px) and (min-height: 600px)';

export function HeroLayers() {
  const [variant, setVariant] = useState<'pending' | 'classic' | 'deck'>('pending');

  useEffect(() => {
    const mq = window.matchMedia(DECK_QUERY);
    const apply = () => setVariant(mq.matches ? 'deck' : 'classic');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (variant === 'deck') return <DeckLayer />;
  if (variant === 'classic') return <ParticleField />;
  return null; // SSR / first paint: decoration mounts right after hydration
}
