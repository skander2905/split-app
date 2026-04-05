import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { EventData, Expense, Participant, Settlement } from '@/types';

interface UseEventReturn {
  event: EventData | null;
  settlement: Settlement | null;
  loading: boolean;
  error: string | null;
  addParticipant: (name: string) => Promise<Participant>;
  addExpense: (data: {
    title: string;
    amount: number;
    paidById: string;
    participantIds: string[];
  }) => Promise<Expense>;
}

export function useEvent(slug: string): UseEventReturn {
  const [event, setEvent] = useState<EventData | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch event data and settlements in parallel
      const [eventData, settlementData] = await Promise.all([
        api.events.get(slug),
        api.events.getSettlements(slug),
      ]);
      setEvent(eventData);
      setSettlement(settlementData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Adds a participant and optimistically updates local state.
   * Settlement is re-fetched since it depends on participant list.
   */
  const addParticipant = async (name: string): Promise<Participant> => {
    const participant = await api.participants.add(slug, name);

    setEvent((prev) =>
      prev ? { ...prev, participants: [...prev.participants, participant] } : prev,
    );

    // Refresh settlement after participant list changes
    const settlementData = await api.events.getSettlements(slug);
    setSettlement(settlementData);

    return participant;
  };

  /**
   * Adds an expense and prepends it to the expense list.
   * Settlement is re-fetched since balances have changed.
   */
  const addExpense = async (data: {
    title: string;
    amount: number;
    paidById: string;
    participantIds: string[];
  }): Promise<Expense> => {
    const expense = await api.expenses.add(slug, data);

    setEvent((prev) =>
      prev ? { ...prev, expenses: [expense, ...prev.expenses] } : prev,
    );

    // Refresh settlement after new expense is added
    const settlementData = await api.events.getSettlements(slug);
    setSettlement(settlementData);

    return expense;
  };

  return { event, settlement, loading, error, addParticipant, addExpense };
}
