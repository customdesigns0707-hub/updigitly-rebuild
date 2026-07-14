/**
 * GoHighLevel / LeadConnector API v2 client. Server-only.
 *
 * GHL is the CRM/workflow/comms layer ONLY — never the source of truth
 * (Decision #4). This client exposes the small surface the sync worker needs:
 * upsert a contact (idempotent by email/phone on GHL's side), read a contact's
 * current tags/custom-fields (so the worker can compare before writing), update
 * a contact, and append a note.
 */
import 'server-only';
import { ghl } from '../env';

export class GhlError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`GHL API ${status}: ${body.slice(0, 300)}`);
    this.name = 'GhlError';
    this.status = status;
    this.body = body;
  }
}

export interface GhlCustomField {
  id: string;
  value: string;
}
export interface GhlContact {
  id: string;
  tags: string[];
  customFields: GhlCustomField[];
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${ghl.token}`,
    Version: ghl.apiVersion,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ghl.apiBase}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    // GHL calls should never be cached
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new GhlError(res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface UpsertContactInput {
  name: string;
  email: string;
  phone: string;
  tags?: string[];
  customFields?: GhlCustomField[];
}

/**
 * Upsert (create-or-match) a contact. GHL dedupes by email/phone within the
 * location, so calling this twice with the same email returns the SAME contact
 * id — the API-level idempotency the sync worker relies on for the first event.
 */
export async function upsertContact(input: UpsertContactInput): Promise<{ id: string; isNew: boolean }> {
  const data = await request<{ contact?: { id: string }; new?: boolean }>('POST', '/contacts/upsert', {
    locationId: ghl.locationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    tags: input.tags,
    customFields: input.customFields,
  });
  const id = data.contact?.id;
  if (!id) throw new GhlError(502, `upsert returned no contact id: ${JSON.stringify(data)}`);
  return { id, isNew: data.new ?? false };
}

export async function getContact(id: string): Promise<GhlContact> {
  const data = await request<{
    contact?: { id: string; tags?: string[]; customFields?: GhlCustomField[]; customField?: GhlCustomField[] };
  }>('GET', `/contacts/${id}`);
  const c = data.contact;
  if (!c) throw new GhlError(404, `contact ${id} not found`);
  return {
    id: c.id,
    tags: c.tags ?? [],
    // GHL has used both `customFields` and `customField` across versions.
    customFields: (c.customFields ?? c.customField ?? []).map((f) => ({ id: f.id, value: String(f.value ?? '') })),
  };
}

export async function updateContact(
  id: string,
  patch: { tags?: string[]; customFields?: GhlCustomField[] },
): Promise<void> {
  await request('PUT', `/contacts/${id}`, patch);
}

export async function addNote(contactId: string, body: string): Promise<{ id: string }> {
  const data = await request<{ note?: { id: string } }>('POST', `/contacts/${contactId}/notes`, { body });
  return { id: data.note?.id ?? '' };
}

export const ghlConfigured = ghl.isConfigured;
