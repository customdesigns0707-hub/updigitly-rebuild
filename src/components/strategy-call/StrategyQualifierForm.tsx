'use client';
import { useState } from 'react';
import Link from 'next/link';
import { STRATEGY_QUALIFIER_QUESTIONS, strategyCallSubmitSchema } from '@/lib/strategyCall';
import { Turnstile } from '@/components/Turnstile';

/**
 * Strategy Call pre-booking qualifier — picked up from the Chat 4 placeholder
 * (see [[updigitly-phase2-chat4]]). Same tap/radio pattern and shared Zod
 * validation as the enroll qualifier and the contact form, but a fresh,
 * smaller question set (never specified in Phase 1 — see
 * strategyCall.ts). NOT a gate: this sits alongside the calendar hand-off,
 * never blocks or delays booking (Decision #3 — /strategy-call is also the
 * escape hatch for unclear situations).
 */
type SingleAnswers = { locations: string; presence: string; teamSize: string };

export function StrategyQualifierForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [single, setSingle] = useState<SingleAnswers>({ locations: '', presence: '', teamSize: '' });
  const [contact, setContact] = useState({ contactName: '', businessName: '', email: '', phone: '' });
  const [goal, setGoal] = useState('');
  const [anythingElse, setAnythingElse] = useState('');
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Bumped after any failed submit so Turnstile mints a fresh, single-use token.
  const [turnstileReset, setTurnstileReset] = useState(0);

  function pickSingle(id: string, value: string) {
    setSingle((s) => ({ ...s, [id]: value }));
    setErrors((e) => ({ ...e, [id]: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      contactName: contact.contactName,
      businessName: contact.businessName,
      email: contact.email,
      phone: contact.phone,
      answers: single,
      goal,
      anythingElse,
      turnstileToken: token,
    };

    const parsed = strategyCallSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v?.[0]) next[k] = v[0];
      for (const id of ['locations', 'presence', 'teamSize'] as const) {
        if (!single[id]) next[id] = 'Please choose an option.';
      }
      if (!contact.contactName.trim()) next.contactName = 'Required.';
      if (!contact.businessName.trim()) next.businessName = 'Required.';
      if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) next.email = 'Enter a valid email.';
      if (contact.phone.trim().length < 7) next.phone = 'Enter a valid phone.';
      if (goal.trim().length < 10) next.goal = 'Tell us a bit more — a sentence or two is plenty.';
      setErrors(next);
      setFormError('Please complete the highlighted fields.');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/strategy-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 201) {
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'not_configured') {
        setFormError('This isn’t fully configured yet — please call us instead.');
      } else if (data.error === 'turnstile') {
        setFormError('Verification expired — we’ve refreshed it, please submit again.');
      } else {
        setFormError('Something went wrong saving your details. Please try again.');
      }
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
          <h3>Thanks, {contact.contactName.split(' ')[0] || 'there'}</h3>
          <p>
            We&rsquo;ve got your answers and we&rsquo;ll come to the call prepared. Book a time above if you
            haven&rsquo;t already — no need to wait on us.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="qform" onSubmit={submit} noValidate>
      {STRATEGY_QUALIFIER_QUESTIONS.map((q) => (
        <fieldset className="q-block" key={q.id}>
          <legend className="q-label">{q.label}</legend>
          {q.help && <p className="q-help">{q.help}</p>}
          <div className="opt-grid" role="radiogroup">
            {q.options.map((o) => {
              const selected = single[q.id as keyof SingleAnswers] === o.value;
              return (
                <button
                  type="button"
                  key={o.value}
                  className={`opt${selected ? ' on' : ''}`}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickSingle(q.id, o.value)}
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
        <legend className="q-label">What&rsquo;s the goal for this call?</legend>
        <p className="q-help">A sentence or two so we come prepared — not a form to fill out for its own sake.</p>
        <textarea
          rows={3}
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            setErrors((er) => ({ ...er, goal: '' }));
          }}
          maxLength={1000}
          aria-invalid={!!errors.goal}
        />
        {errors.goal && <p className="q-error">{errors.goal}</p>}
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">Where should we send this?</legend>
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
          {submitting ? 'Sending…' : 'Send answers →'}
        </button>
        <p className="q-fine">
          This never approves, rejects, prices, or reschedules anything — book above whenever works for you. See our{' '}
          <Link href="/legal" style={{ color: 'var(--green)' }}>
            privacy &amp; terms
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
