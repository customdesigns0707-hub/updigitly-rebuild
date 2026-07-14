'use client';
import { useEffect, useRef } from 'react';
import { createUsaMap } from './deck/usaMap';
import { createPerformance } from './deck/performance';
import { createAiOptimization } from './deck/aiOptimization';
import { createGrowthIndex } from './deck/growthIndex';
import { createLeads } from './deck/leads';
import type { Panel } from './deck/shared';

/**
 * Hidden Deck hero (Concept G · v3) — the full-screen analytics interface
 * hidden at ~4% visibility and revealed by a radial-mask "flashlight" that
 * follows the pointer (mouse, touch, or pen — the finger drives the light).
 *
 * Mounted only when the viewport's SHORTER side is >= 600px (see HeroLayers);
 * desktop corner layout vs tablet centered-map layout is pure CSS, so this
 * one component serves both. One shared rAF loop drives all five canvases,
 * fully unmounted (zero CPU) whenever the classic phone hero is shown.
 * Motion is intentionally NOT gated behind prefers-reduced-motion — the live
 * animation is core to the approved design.
 */

const FLECKS: { top: string; left: string; amber?: boolean; txt: string }[] = [
  { top: '52%', left: '40%', txt: 'NODE 07 · SYNC' },
  { top: '28%', left: '35%', amber: true, txt: '↑ 12.4%' },
  { top: '64%', left: '57%', txt: 'LATENCY 42MS' },
  { top: '22%', left: '60%', txt: 'QUEUE · 0' },
  { top: '72%', left: '33%', amber: true, txt: '+38 LEADS' },
  { top: '44%', left: '66%', txt: 'OK · OK · OK' },
  { top: '58%', left: '48%', txt: 'PKT 0x1F4 · ACK' },
  { top: '34%', left: '52%', txt: 'THRPT 1.2GB/S' },
  { top: '48%', left: '30%', amber: true, txt: 'ROI 4.2×' },
  { top: '68%', left: '44%', txt: 'MODELS · 6 ACTIVE' },
];

function TickerItems() {
  return (
    <>
      <span><b>UPDIGITLY</b> GROWTH SYSTEMS</span>
      <span>SEO <b>+38%</b></span>
      <span>NATIONAL LEAD CAPTURE <b>24/7</b></span>
      <span>RESPONSE <i>&lt; 60 SEC</i></span>
      <span>SENIOR TEAM <b>100%</b></span>
      <span>AUDIT → LAUNCH → SCALE</span>
      <span>CONVERSION <b>+4.8%</b></span>
      <span>UPTIME <b>99.9%</b></span>
      <span>AI MODELS <b>6 ACTIVE</b></span>
    </>
  );
}

export function DeckLayer() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const torchRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLCanvasElement | null>(null);
  const perfRef = useRef<HTMLCanvasElement | null>(null);
  const aiRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current, torch = torchRef.current;
    if (!layer || !torch) return;

    /* ---------- panels: one shared rAF drives all five canvases ---------- */
    const canvases = [mapRef, perfRef, aiRef, lineRef, barsRef].map((r) => r.current);
    if (canvases.some((c) => !c)) return;
    const [mapC, perfC, aiC, lineC, barsC] = canvases as HTMLCanvasElement[];
    const panels: Panel[] = [
      createUsaMap(mapC),
      createPerformance(perfC),
      createAiOptimization(aiC),
      createGrowthIndex(lineC),
      createLeads(barsC),
    ];

    // Refit a canvas whenever CSS resizes it (viewport resize, orientation,
    // desktop↔tablet layout change).
    const byCanvas = new Map<Element, Panel>();
    canvases.forEach((c, i) => byCanvas.set(c as HTMLCanvasElement, panels[i]));
    const ro = new ResizeObserver((entries) => {
      entries.forEach((en) => byCanvas.get(en.target)?.resize());
    });
    canvases.forEach((c) => ro.observe(c as HTMLCanvasElement));

    /* ---------- flashlight: pointer + touch drive the radial mask ---------- */
    let tx = window.innerWidth / 2, ty = window.innerHeight * 0.58;
    let mx = tx, my = ty;
    const onPoint = (e: PointerEvent) => {
      const r = layer.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
    };
    // pointermove covers mouse; pointerdown+move cover touch (finger = light)
    window.addEventListener('pointermove', onPoint, { passive: true });
    window.addEventListener('pointerdown', onPoint, { passive: true });

    let raf = 0;
    const loop = () => {
      mx += (tx - mx) * 0.1;
      my += (ty - my) * 0.1;
      const px = mx + 'px', py = my + 'px';
      layer.style.setProperty('--mx', px);
      layer.style.setProperty('--my', py);
      torch.style.setProperty('--mx', px);
      torch.style.setProperty('--my', py);
      panels.forEach((p) => p.frame());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    /* ---------- SYS ONLINE clock ---------- */
    const tick = () => {
      const n = new Date();
      if (clockRef.current) {
        clockRef.current.textContent =
          'SYS ONLINE · ' +
          String(n.getHours()).padStart(2, '0') + ':' +
          String(n.getMinutes()).padStart(2, '0') + ':' +
          String(n.getSeconds()).padStart(2, '0');
      }
    };
    tick();
    const clock = window.setInterval(tick, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(clock);
      window.removeEventListener('pointermove', onPoint);
      window.removeEventListener('pointerdown', onPoint);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <div className="deck-layer" ref={layerRef} aria-hidden="true">
        <div className="deck-grid" />
        <div className="deck-watermark">UPDIGITLY</div>

        <div className="deck-readout tl">UPDIGITLY {'//'} OPS · 3 REGIONS · US</div>
        <div className="deck-readout tr" ref={clockRef}>SYS ONLINE</div>

        {FLECKS.map((f) => (
          <div key={f.txt} className={`deck-fleck${f.amber ? ' amber' : ''}`} style={{ top: f.top, left: f.left }}>
            {f.txt}
          </div>
        ))}

        <div className="deck-panel deck-p-map">
          <div className="deck-panel-head"><span>NATIONAL REACH — UNITED STATES</span><span className="deck-live" /></div>
          <canvas ref={mapRef} />
        </div>
        <div className="deck-panel deck-p-perf">
          <div className="deck-panel-head"><span>UPDIGITLY {'//'} PERFORMANCE</span><span className="deck-live" /></div>
          <canvas ref={perfRef} />
        </div>
        <div className="deck-panel deck-p-ai">
          <div className="deck-panel-head"><span>AI OPTIMIZATION</span><span className="deck-live" /></div>
          <canvas ref={aiRef} />
        </div>
        <div className="deck-panel deck-p-line">
          <div className="deck-panel-head"><span>GROWTH INDEX — 12 MO</span><span className="deck-live" /></div>
          <canvas ref={lineRef} />
        </div>
        <div className="deck-panel deck-p-bars">
          <div className="deck-panel-head"><span>LEADS / WK</span><span className="deck-live" /></div>
          <canvas ref={barsRef} />
        </div>

        <div className="deck-ticker">
          <div className="deck-ticker-track">
            <TickerItems />
            <TickerItems />
          </div>
        </div>
      </div>

      <div className="deck-vignette" aria-hidden="true" />
      <div className="deck-torch" ref={torchRef} aria-hidden="true" />
      <div className="deck-hint" aria-hidden="true">Move your cursor — the interface is under the surface</div>
    </>
  );
}
