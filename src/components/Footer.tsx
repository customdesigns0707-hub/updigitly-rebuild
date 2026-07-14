import Link from 'next/link';
import { siteConfig } from '@/config/site';

/**
 * Site footer — LOCKED structure (Decision #3):
 * nav + Engagements (→ /pricing anchors) + managed inbox + phone CTA
 * + "© Updigitly · Legal" (the single discreet legal entry point).
 */
export function Footer() {
  const { footer, phone, email } = siteConfig;
  return (
    <footer className="site-footer">
      <div className="sf-top">
        <div className="sf-brand">
          <div className="sf-logo">Updigitly<span>.</span></div>
          <p>
            A managed digital growth partner. One connected system — accountable for the growth it produces.
          </p>
        </div>

        <div className="sf-col">
          <div className="sf-head">Navigate</div>
          {footer.nav.map((i) => (
            <Link key={i.href} href={i.href} data-hover>{i.label}</Link>
          ))}
        </div>

        <div className="sf-col">
          <div className="sf-head">Engagements</div>
          {footer.engagements.map((i) => (
            <Link key={i.href} href={i.href} data-hover>{i.label}</Link>
          ))}
        </div>

        <div className="sf-col sf-reach">
          <div className="sf-head">Reach us</div>
          <a className="sf-mail" href={email.href} data-hover>{email.display}</a>
          <br />
          <a className="sf-tel" href={phone.href} data-hover>
            <span className="pulse" />Call · {phone.display}
          </a>
        </div>
      </div>

      <div className="sf-bottom">
        <div className="sf-legal">
          © {new Date().getFullYear()} Updigitly · <Link href="/legal" data-hover><b>Legal</b></Link>
        </div>
        <div>SENIOR-LED · ONE ACCOUNTABLE SYSTEM</div>
      </div>
    </footer>
  );
}
