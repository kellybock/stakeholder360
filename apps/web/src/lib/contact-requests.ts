export interface ContactRequest {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByAgency: string;
  rmName: string | null;
  rmEmail: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

const store = globalThis as unknown as { __contactRequests?: ContactRequest[] };
if (!store.__contactRequests) store.__contactRequests = [];

export function addContactRequest(input: Omit<ContactRequest, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>): ContactRequest {
  const request: ContactRequest = {
    ...input,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };
  store.__contactRequests!.push(request);
  return request;
}

export function getContactRequests(stakeholderId?: string): ContactRequest[] {
  const all = store.__contactRequests ?? [];
  if (stakeholderId) return all.filter(r => r.stakeholderId === stakeholderId);
  return all;
}

export function getAllContactRequests(): ContactRequest[] {
  return store.__contactRequests ?? [];
}

export function resolveContactRequest(id: string, status: 'approved' | 'denied', resolvedBy: string): ContactRequest | null {
  const request = (store.__contactRequests ?? []).find(r => r.id === id);
  if (!request) return null;
  request.status = status;
  request.resolvedAt = new Date().toISOString();
  request.resolvedBy = resolvedBy;
  return request;
}
