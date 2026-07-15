'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ONBOARDING_QUESTIONS, onboardingAnswersSchema, type OnboardingAnswers } from '@/lib/onboarding';

/**
 * The onboarding form (Chat 4). Same taps/fields visual language as
 * QualifierForm, but collects only what the qualifier didn't already capture
 * (Decision #4: never ask twice). No Turnstile here — the token in the URL is
 * itself the access control (32 chars, ~192 bits), unlike the public
 * qualifier/contact forms Turnstile protects.
 *
 * "Save progress" persists a lenient partial draft (jsonb-merged server-side,
 * so earlier answers are never lost). "Submit" validates fully and starts the
 * 7-day fit-review clock — irreversible, so it's a distinct, clearly-labeled
 * action from the save button.
 */
type SingleAnswers = { primaryGoal: string; timeline: string };
type TextAnswers = Pick<
  OnboardingAnswers,
  'targetCustomer' | 'competitors' | 'brandAssets' | 'domainAccess' | 'preserveOrAvoid'
>;

export function OnboardingForm({
  token,
  initial,
}: {
  token: string;
  initial: Partial<OnboardingAnswers>;
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<string[]>(initial.accountsToConnect ?? []);
  const [single, setSingle] = useState<SingleAnswers>({
    primaryGoal: initial.primaryGoal ?? '',
    timeline: initial.timeline ?? '',
  });
  const [text, setText] = useState<TextAnswers>({
    targetCustomer: initial.targetCustomer ?? '',
    competitors: initial.competitors ?? '',
    brandAssets: initial.brandAssets ?? '',
    domainAccess: initial.domainAccess ?? '',
    preserveOrAvoid: initial.preserveOrAvoid ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleAccount(value: string) {
    setAccounts((a) => (a.includes(value) ? a.filter((x) => x !== value) : [...a, value]));
  }
  function pickSingle(id: keyof SingleAnswers, value: string) {
    setSingle((s) => ({ ...s, [id]: value }));
    setErrors((e) => ({ ...e, [id]: '' }));
  }

  function currentAnswers() {
    return { accountsToConnect: accounts, primaryGoal: single.primaryGoal, timeline: single.timeline, ...text };
  }

  async function saveDraft() {
    setFormError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: currentAnswers(), submit: false }),
      });
      if (res.ok) setNotice('Progress saved — come back anytime with this same link.');
      else setFormError('Couldn’t save just now. Please try again.');
    } catch {
      setFormError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const payload = currentAnswers();
    const parsed = onboardingAnswersSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v?.[0]) next[k] = v[0];
      if (!single.primaryGoal) next.primaryGoal = 'Please choose an option.';
      if (!single.timeline) next.timeline = 'Please choose an option.';
      if (!text.targetCustomer.trim()) next.targetCustomer = 'Please tell us a bit about your customer.';
      setErrors(next);
      setFormError('Please complete the highlighted fields.');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: parsed.data, submit: true }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      setFormError('Something went wrong submitting. Please try again.');
      setSubmitting(false);
    } catch {
      setFormError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  const accountsQ = ONBOARDING_QUESTIONS[0];
  const goalQ = ONBOARDING_QUESTIONS.find((q) => q.id === 'primaryGoal')!;
  const timelineQ = ONBOARDING_QUESTIONS.find((q) => q.id === 'timeline')!;

  return (
    <form className="qform" onSubmit={submit} noValidate>
      <fieldset className="q-block">
        <legend className="q-label">{accountsQ.label}</legend>
        {accountsQ.help && <p className="q-help">{accountsQ.help}</p>}
        <div className="opt-grid" role="group">
          {accountsQ.options.map((o) => {
            const selected = accounts.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                className={`opt${selected ? ' on' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleAccount(o.value)}
                data-hover
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">{goalQ.label}</legend>
        <div className="opt-grid" role="radiogroup">
          {goalQ.options.map((o) => {
            const selected = single.primaryGoal === o.value;
            return (
              <button
                type="button"
                key={o.value}
                className={`opt${selected ? ' on' : ''}`}
                role="radio"
                aria-checked={selected}
                onClick={() => pickSingle('primaryGoal', o.value)}
                data-hover
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {errors.primaryGoal && <p className="q-error">{errors.primaryGoal}</p>}
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">{timelineQ.label}</legend>
        <div className="opt-grid" role="radiogroup">
          {timelineQ.options.map((o) => {
            const selected = single.timeline === o.value;
            return (
              <button
                type="button"
                key={o.value}
                className={`opt${selected ? ' on' : ''}`}
                role="radio"
                aria-checked={selected}
                onClick={() => pickSingle('timeline', o.value)}
                data-hover
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {errors.timeline && <p className="q-error">{errors.timeline}</p>}
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">Tell us about your customer</legend>
        <label className="field">
          <span>Who is your ideal customer, and what area or market do you serve?</span>
          <textarea
            rows={3}
            value={text.targetCustomer}
            onChange={(e) => setText({ ...text, targetCustomer: e.target.value })}
            maxLength={800}
            aria-invalid={!!errors.targetCustomer}
          />
          {errors.targetCustomer && <em className="q-error">{errors.targetCustomer}</em>}
        </label>
        <label className="field" style={{ marginTop: 16 }}>
          <span>1–3 competitors or businesses you admire (optional)</span>
          <input
            value={text.competitors}
            onChange={(e) => setText({ ...text, competitors: e.target.value })}
            maxLength={400}
          />
        </label>
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">Access &amp; assets</legend>
        <label className="field">
          <span>
            Where is your domain and hosting, and do you have login access? If unsure, just say so — we&rsquo;ll help
            figure it out.
          </span>
          <textarea
            rows={2}
            value={text.domainAccess}
            onChange={(e) => setText({ ...text, domainAccess: e.target.value })}
            maxLength={800}
          />
        </label>
        <label className="field" style={{ marginTop: 16 }}>
          <span>Do you have a logo, brand guide, or brand assets? Links or notes are fine.</span>
          <textarea
            rows={2}
            value={text.brandAssets}
            onChange={(e) => setText({ ...text, brandAssets: e.target.value })}
            maxLength={800}
          />
        </label>
      </fieldset>

      <fieldset className="q-block">
        <legend className="q-label">Anything to preserve or avoid?</legend>
        <label className="field">
          <span>Optional — phrasing, imagery, past mistakes, anything we should be careful with.</span>
          <textarea
            rows={3}
            value={text.preserveOrAvoid}
            onChange={(e) => setText({ ...text, preserveOrAvoid: e.target.value })}
            maxLength={800}
          />
        </label>
      </fieldset>

      {formError && (
        <p className="q-error" role="alert" style={{ marginTop: 16 }}>
          {formError}
        </p>
      )}
      {notice && (
        <p className="q-fine" style={{ marginTop: 16, color: 'var(--green)' }}>
          {notice}
        </p>
      )}

      <div className="q-actions">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <button type="submit" className="btn-primary" data-hover disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit onboarding info →'}
          </button>
          <button type="button" className="btn-ghost" data-hover disabled={saving} onClick={saveDraft}>
            {saving ? 'Saving…' : 'Save progress for later'}
          </button>
        </div>
        <p className="q-fine">
          Submitting starts our 7-day fit-review window — we confirm fit before any heavy build begins.
        </p>
      </div>
    </form>
  );
}
