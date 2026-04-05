import type { EventData, Expense, HistoryEntry, Participant, Settlement } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed');
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  events: {
    create: (name: string) =>
      request<{ id: string; name: string; slug: string }>('/events', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),

    get: (slug: string) => request<EventData>(`/events/${slug}`),

    getSettlements: (slug: string) =>
      request<Settlement>(`/events/${slug}/settlements`),
  },

  participants: {
    add: (slug: string, name: string) =>
      request<Participant>(`/events/${slug}/participants`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  },

  expenses: {
    add: (
      slug: string,
      data: { title: string; amount: number; paidById: string; participantIds: string[] },
    ) =>
      request<Expense>(`/events/${slug}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      slug: string,
      expenseId: string,
      data: { title: string; amount: number; paidById: string; participantIds: string[] },
    ) =>
      request<Expense>(`/events/${slug}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    remove: (slug: string, expenseId: string) =>
      request<void>(`/events/${slug}/expenses/${expenseId}`, { method: 'DELETE' }),
  },

  history: {
    get: (slug: string) => request<HistoryEntry[]>(`/events/${slug}/history`),
    undo: (slug: string) =>
      request<{ ok: boolean }>(`/events/${slug}/history/undo`, { method: 'POST' }),
    redo: (slug: string) =>
      request<{ ok: boolean }>(`/events/${slug}/history/redo`, { method: 'POST' }),
  },
};
