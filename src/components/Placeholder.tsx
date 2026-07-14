import type { ReactNode } from 'react';

/**
 * Clearly-marked placeholder for functionality that Chats 2–3 attach:
 * qualifier, message form, calendar hand-off, checkout. Renders inside the
 * existing Signal `embed-shell` / `embed-placeholder` chrome so the shell is
 * design-complete and reviewable now, with the live piece dropped in later.
 *
 * `chat` labels WHICH build chat owns this attach point (2 = enrollment/data,
 * 3 = payment/onboarding) so nothing here is mistaken for finished work.
 */
export function Placeholder({
  badge,
  title,
  children,
  chat,
}: {
  badge: string;
  title: string;
  children?: ReactNode;
  chat: 2 | 3;
}) {
  return (
    <div className="embed-shell">
      <div className="embed-placeholder">
        <span className="badge">{badge} · CHAT {chat}</span>
        <h3>{title}</h3>
        {children ? <p>{children}</p> : null}
        <p style={{ opacity: 0.7 }}>
          Placeholder — the working piece is built in <code>Chat {chat}</code>. Design and layout are final.
        </p>
      </div>
    </div>
  );
}
