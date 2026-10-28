// API client — replaces firebase.ts
// All requests go to /api/* which Nginx proxies to the Express backend.

const BASE = '/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Clause {
  id: string;
  title: string;
  text: string;
  order: number;
}

export interface ContractPayload {
  signature1: string;
  signature2: string;
  clausesSnapshot: Clause[];
  draftId?: string | null;
}

export interface DraftPayload {
  signature1: string | null;
  signature2: string | null;
  clausesSnapshot: Clause[];
}

export interface SavedContract {
  id: string;
  status: string;
  created_at: string;
}

// ─── Clauses ──────────────────────────────────────────────────────────────────

export async function getClauses(): Promise<Clause[]> {
  const res = await fetch(`${BASE}/clauses?_=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to fetch clauses: ${res.statusText}`);
  return res.json();
}

export async function createClause(
  title: string,
  text: string,
  order: number,
  adminKey: string
): Promise<Clause> {
  const res = await fetch(`${BASE}/clauses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify({ title, text, order }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create clause: ${res.statusText}`);
  }
  return res.json();
}

export async function updateClause(
  id: string,
  title: string,
  text: string,
  adminKey: string
): Promise<Clause> {
  const res = await fetch(`${BASE}/clauses/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify({ title, text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to update clause: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteClause(id: string, adminKey: string): Promise<void> {
  const res = await fetch(`${BASE}/clauses/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to delete clause: ${res.statusText}`);
  }
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function saveContract(payload: ContractPayload): Promise<SavedContract> {
  const res = await fetch(`${BASE}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to save contract: ${res.statusText}`);
  }
  return res.json();
}

export async function saveDraft(payload: DraftPayload): Promise<SavedContract> {
  const res = await fetch(`${BASE}/contracts/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to save contract draft: ${res.statusText}`);
  }
  return res.json();
}

export async function getContract(id: string): Promise<SavedContract & { signature1: string | null; signature2: string | null; clauses_snapshot: Clause[] }> {
  const res = await fetch(`${BASE}/contracts/${id}`);
  if (!res.ok) throw new Error(`Contract not found: ${res.statusText}`);
  return res.json();
}

export async function getLatestContract(): Promise<SavedContract & { signature1: string | null; signature2: string | null; clauses_snapshot: Clause[] } | null> {
  const res = await fetch(`${BASE}/contracts/latest?_=${Date.now()}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch latest contract: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteAllContracts(adminKey: string): Promise<void> {
  const res = await fetch(`${BASE}/contracts/latest`, {
    method: 'DELETE',
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to delete contracts: ${res.statusText}`);
  }
}

