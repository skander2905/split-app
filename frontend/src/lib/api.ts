import type { EventData, Expense, Participant, Settlement } from '@/types';

// In development Vite proxies /api → http://localhost:3001
// In production set VITE_API_URL to your backend URL
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
      data: {
        title: string;
        amount: number;
        paidById: string;
        participantIds: string[];
      },
    ) =>
      request<Expense>(`/events/${slug}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
