'use client';
import { useState } from 'react';
import { contactSubmitSchema, contactPurposes } from '@/lib/enrollment';
import { Turnstile } from '@/components/Turnstile';

/**
 * Native /contact message form (Decision #4 — replaces the GHL iframe embed).
 * Purpose selector + fields, shared Zod validation, Turnstile, POST to
 * /api/contact. Persisted to Postgres, then a NEW GHL note per submission.
 */
export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [form, setForm] = useState({
    name: '',
    business: '',
    email: '',
    phone: '',
    purpose: '' as (typeof contactPurposes)[number] | '',
    message: '',
  });
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Bumped after any failed submit so Turnstile mints a fresh, single-use token.
  const [turnstileReset, setTurnstileReset] = useState(0);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k as string]: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = { ...form, turnstileToken: token };
    const parsed = contactSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      if (!form.name.trim()) next.name = 'Required.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
      if (!form.purpose) next.purpose = 'Choose a purpose.';
      if (!form.message.trim()) next.message = 'Add a short message.';
      setErrors(next);
      setFormError('Please complete the highlighted fields.');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'not_configured')
        setFormError('Messaging isn’t fully configured yet — please call us instead.');
      else if (data.error === 'turnstile')
        setFormError('Verification expired — we’ve refreshed it, please send again.');
      else setFormError('Something went wrong sending your message. Please try again.');
      // Spend-and-refresh the token so a retry never reuses a stale one.
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

  if (done) {
    return (
      <div className="embed-shell">
        <div className="embed-placeholder">
          <div className="confirm-check" aria-hidden="true">
            ✓
          </div>
          <h3>Message received</h3>
          <p>
            Thanks, {form.name.split(' ')[0] || 'there'} — your note is in and routed to the right desk. We reply
            during business hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="qform" onSubmit={submit} noValidate>
      <fieldset className="q-block">
        <legend className="q-label">What&rsquo;s this about?</legend>
        <div className="opt-grid" role="radiogroup" aria-label="Purpose">
          {contactPurposes.map((p) => (
            <button
              type="button"
              key={p}
              role="radio"
              aria-checked={form.purpose === p}
              className={`opt${form.purpose === p ? ' on' : ''}`}
              onClick={() => set('purpose', p)}
              data-hover
            >
              {p}
            </button>
          ))}
        </div>
        {errors.purpose && <p className="q-error">{errors.purpose}</p>}
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">Your details</legend>
        <div className="field-grid">
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
            {errors.name && <em className="q-error">{errors.name}</em>}
          </label>
          <label className="field">
            <span>Business (optional)</span>
            <input value={form.business} onChange={(e) => set('business', e.target.value)} autoComplete="organization" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
            {errors.email && <em className="q-error">{errors.email}</em>}
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
          </label>
        </div>
        <label className="field" style={{ marginTop: 18 }}>
          <span>Message</span>
          <textarea rows={4} value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={3000} aria-invalid={!!errors.message} />
          {errors.message && <em className="q-error">{errors.message}</em>}
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
          {submitting ? 'Sending…' : 'Send message →'}
        </button>
        <p className="q-fine">Sales question? The plans and strategy call are the faster route — links above.</p>
      </div>
    </form>
  );
}
