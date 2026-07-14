'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  QUALIFIER_QUESTIONS,
  enrollSubmitSchema,
  type EnrollablePlanKey,
} from '@/lib/enrollment';
import type { BillingKey } from '@/lib/plans';
import { Turnstile } from '@/components/Turnstile';

/**
 * Native qualifier (Decision #4). The four LOCKED questions as taps/toggles
 * plus name/business/email/phone and one optional free-text field. Validated
 * with the shared Zod schema (same rules the server enforces), bot-protected
 * with Turnstile, then POSTed to /api/enroll. On success the visitor is routed
 * to their private disclosure-review URL. Target ~60–90s on mobile.
 */
type SingleAnswers = { locations: string; website: string; crm: string };

export function QualifierForm({
  plan,
  billing,
  turnstileSiteKey,
}: {
  plan: EnrollablePlanKey;
  billing: BillingKey;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [single, setSingle] = useState<SingleAnswers>({ locations: '', website: '', crm: '' });
  const [needs, setNeeds] = useState<string[]>([]);
  const [contact, setContact] = useState({ contactName: '', businessName: '', email: '', phone: '' });
  const [anythingElse, setAnythingElse] = useState('');
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Bumped after any failed submit so the Turnstile widget mints a fresh token,
  // avoiding a `timeout-or-duplicate` reject when the visitor retries.
  const [turnstileReset, setTurnstileReset] = useState(0);

  function pickSingle(id: string, value: string) {
    setSingle((s) => ({ ...s, [id]: value }));
    setErrors((e) => ({ ...e, [id]: '' }));
  }
  function toggleNeed(value: string) {
    setNeeds((n) => (n.includes(value) ? n.filter((x) => x !== value) : [...n, value]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      plan,
      billing,
      contactName: contact.contactName,
      businessName: contact.businessName,
      email: contact.email,
      phone: contact.phone,
      answers: {
        locations: single.locations,
        website: single.website,
        crm: single.crm,
        needs,
      },
      anythingElse,
      turnstileToken: token,
    };

    const parsed = enrollSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const next: Record<string, string> = {};
      // top-level fields
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v?.[0]) next[k] = v[0];
      // nested answers.* — surface a message on each missing single question
      for (const id of ['locations', 'website', 'crm'] as const) {
        if (!single[id]) next[id] = 'Please choose an option.';
      }
      if (!contact.contactName.trim()) next.contactName = 'Required.';
      if (!contact.businessName.trim()) next.businessName = 'Required.';
      if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) next.email = 'Enter a valid email.';
      if (contact.phone.trim().length < 7) next.phone = 'Enter a valid phone.';
      setErrors(next);
      setFormError('Please complete the highlighted fields.');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 201) {
        const { secureId } = (await res.json()) as { secureId: string };
        router.push(`/enroll/${secureId}/review`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      if (data.error === 'not_configured') {
        setFormError('Enrollment is not fully configured yet. Please call us or book a strategy call.');
      } else if (data.error === 'turnstile') {
        setFormError('Verification expired — we’ve refreshed it, please submit again.');
      } else {
        setFormError('Something went wrong saving your details. Please try again.');
      }
      // The token we just sent is now spent; refresh it so a retry gets a new one.
      setToken('');
      setTurnstileReset((n) => n + 1);
      setSubmitting(false);
    } catch {
      setFormError('Network error — please try again.');
      setToken('');
      setTurnstileReset((n) => n + 1);
      setSubmitting(false);
    }
  }

  return (
    <form className="qform" onSubmit={submit} noValidate>
      {QUALIFIER_QUESTIONS.map((q) => (
        <fieldset className="q-block" key={q.id}>
          <legend className="q-label">{q.label}</legend>
          {q.help && <p className="q-help">{q.help}</p>}
          <div className="opt-grid" role={q.kind === 'single' ? 'radiogroup' : 'group'}>
            {q.options.map((o) => {
              const selected =
                q.kind === 'single'
                  ? single[q.id as keyof SingleAnswers] === o.value
                  : needs.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  className={`opt${selected ? ' on' : ''}`}
                  role={q.kind === 'single' ? 'radio' : undefined}
                  aria-checked={q.kind === 'single' ? selected : undefined}
                  aria-pressed={q.kind === 'multi' ? selected : undefined}
                  onClick={() => (q.kind === 'single' ? pickSingle(q.id, o.value) : toggleNeed(o.value))}
                  data-hover
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {errors[q.id] && <p className="q-error">{errors[q.id]}</p>}
        </fieldset>
      ))}

      <fieldset className="q-block">
        <legend className="q-label">Where should we send your enrollment?</legend>
        <div className="field-grid">
          <label className="field">
            <span>Your name</span>
            <input
              value={contact.contactName}
              onChange={(e) => setContact({ ...contact, contactName: e.target.value })}
              autoComplete="name"
              aria-invalid={!!errors.contactName}
            />
            {errors.contactName && <em className="q-error">{errors.contactName}</em>}
          </label>
          <label className="field">
            <span>Business name</span>
            <input
              value={contact.businessName}
              onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
              autoComplete="organization"
              aria-invalid={!!errors.businessName}
            />
            {errors.businessName && <em className="q-error">{errors.businessName}</em>}
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!errors.email}
            />
            {errors.email && <em className="q-error">{errors.email}</em>}
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <em className="q-error">{errors.phone}</em>}
          </label>
        </div>
        <label className="field" style={{ marginTop: 18 }}>
          <span>Anything else we should know? (optional)</span>
          <textarea
            rows={3}
            value={anythingElse}
            onChange={(e) => setAnythingElse(e.target.value)}
            maxLength={1000}
          />
        </label>
      </fieldset>

      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} resetSignal={turnstileReset} />

      {formError && (
        <p className="q-error" role="alert" style={{ marginTop: 16 }}>
          {formError}
        </p>
      )}

      <div className="q-actions">
        <button type="submit" className="btn-primary" data-hover disabled={submitting}>
          {submitting ? 'Saving…' : 'Continue to review →'}
        </button>
        <p className="q-fine">
          No charge yet. Next you&rsquo;ll review the full commitment and terms before anything is billed. See our{' '}
          <Link href="/legal" style={{ color: 'var(--green)' }}>
            privacy &amp; terms
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
