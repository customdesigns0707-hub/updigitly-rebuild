'use client';
import Link from 'next/link';
import { useState } from 'react';
import { siteConfig } from '@/config/site';

/**
 * Fixed top nav + full-screen mobile menu.
 * Desktop: logo→Home · The System · Pricing · "Strategy Call" primary CTA (label locked).
 * Mobile:  System / Pricing / Strategy Call / Contact + phone CTA (never displaces Strategy Call).
 * Pass `active` (e.g. "/pricing") to underline the current page.
 */
export function Nav({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    document.body.style.overflow = '';
  };
  const toggle = () => {
    setOpen((o) => {
      document.body.style.overflow = !o ? 'hidden' : '';
      return !o;
    });
  };

  return (
    <>
      <nav className="nav">
        <Link href="/" className="logo" data-hover>
          Updigitly<span>.</span>
        </Link>
        <div className="nav-links">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className={active === item.href ? 'active' : ''} data-hover>
              {item.label}
            </Link>
          ))}
        </div>
        <Link className="nav-cta" href={siteConfig.primaryCta.href} data-hover>
          {siteConfig.primaryCta.label}
        </Link>
        <button className={`burger${open ? ' open' : ''}`} aria-label="Toggle menu" aria-expanded={open} onClick={toggle}>
          <span /><span /><span />
        </button>
      </nav>

      <div className={`mnav${open ? ' open' : ''}`}>
        {siteConfig.mobileNav.map((item) => (
          <Link key={item.href} href={item.href} onClick={close}>
            {item.label}
          </Link>
        ))}
        {/* Phone as a discreet tel: CTA — present but never the primary action */}
        <a className="mtel" href={siteConfig.phone.href} onClick={close}>
          Call us · {siteConfig.phone.display}
        </a>
      </div>
    </>
  );
}
