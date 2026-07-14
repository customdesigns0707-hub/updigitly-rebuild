import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Nav />
      <section className="final" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="sec-kicker">{'//'} 404</div>
        <h2>This page went dark.<br /><span className="dim">Let&rsquo;s get you back to the signal.</span></h2>
        <Link className="btn-primary" href="/" style={{ marginTop: 44 }}>Back home <span className="arrow">→</span></Link>
      </section>
      <Footer />
    </>
  );
}
