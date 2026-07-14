import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { ContactForm } from '@/components/ContactForm';
import { siteConfig } from '@/config/site';
import { turnstile } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach Updigitly for general, account, partnership, or billing questions. Ready to start? View plans or book a strategy call.',
};

/**
 * CONTACT (/contact) — administrative / non-sales communication (Sitemap v2,
 * Decision #3). Purpose selector routes intent; SALES intent is pushed to
 * /pricing and /strategy-call so this never becomes a hidden strategy-call
 * substitute. Reached from footer + mobile nav only. The working message form
 * (with the purpose selector) is a marked placeholder, built in Chat 2.
 */

const PURPOSES = ['General question', 'Existing client', 'Partnership', 'Billing', 'Other'];

export default function ContactPage() {
  return (
    <>
      <Nav active="/contact" />

      <div className="contact-wrap">
        <div className="kicker">{'//'} Contact</div>
        <h1>Reach the <span className="dim">right desk.</span></h1>
        <p className="sub">
          For general, account, partnership, or billing questions. Looking to get started? That&rsquo;s a different
          door — see the plans or book a strategy call.
        </p>

        <Reveal>
          <div className="hero-ctas" style={{ marginTop: 28 }}>
            <Link className="btn-ghost" href="/pricing" data-hover><span className="pulse" />View plans →</Link>
            <Link className="btn-ghost" href="/strategy-call" data-hover><span className="pulse" />Book a strategy call →</Link>
          </div>
        </Reveal>

        <div className="cols" style={{ marginTop: 64 }}>
          <div>
            <Reveal className="direct">
              <div className="lbl">What&rsquo;s this about?</div>
              <p style={{ marginTop: 10 }}>
                The message form sorts your note to the right place. Choose a purpose and a strategist or the right
                desk gets back to you directly.
              </p>
              <div className="pills" style={{ marginTop: 20 }}>
                {PURPOSES.map((p) => (
                  <span className="pill" key={p} data-hover>{p}</span>
                ))}
              </div>
            </Reveal>
            <Reveal className="direct">
              <div className="lbl">Prefer to call?</div>
              <a className="sf-tel" href={siteConfig.phone.href} data-hover style={{ marginTop: 14 }}>
                <span className="pulse" />Call · {siteConfig.phone.display}
              </a>
              <p style={{ marginTop: 14 }}>
                Monitored during business hours. Or email{' '}
                <a href={siteConfig.email.href} style={{ color: 'var(--green)' }}>{siteConfig.email.display}</a>.
              </p>
            </Reveal>
          </div>

          {/* Native message form (with purpose selector) — Chat 2 */}
          <div>
            <ContactForm turnstileSiteKey={turnstile.siteKey} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
