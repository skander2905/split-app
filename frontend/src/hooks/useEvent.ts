import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { EventData, Expense, HistoryEntry, Participant, Settlement } from '@/types';

interface UseEventReturn {
  event: EventData | null;
  settlement: Settlement | null;
  history: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  loading: boolean;
  error: string | null;
  addParticipant: (name: string) => Promise<Participant>;
  addExpense: (data: {
    title: string;
    amount: number;
    paidById: string;
    participantIds: string[];
  }) => Promise<Expense>;
  editExpense: (
    expenseId: string,
    data: { title: string; amount: number; paidById: string; participantIds: string[] },
  ) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export function useEvent(slug: string): UseEventReturn {
  const [event, setEvent] = useState<EventData | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [eventData, settlementData, historyData] = await Promise.all([
        api.events.get(slug),
        api.events.getSettlements(slug),
        api.history.get(slug),
      ]);
      setEvent(eventData);
      setSettlement(settlementData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** After any mutation, refresh settlements and history from the server. */
  const refreshDerived = async () => {
    const [settlementData, historyData] = await Promise.all([
      api.events.getSettlements(slug),
      api.history.get(slug),
    ]);
    setSettlement(settlementData);
    setHistory(historyData);
  };

  // ── Participants ───────────────────────────────────────────────────────────

  const addParticipant = async (name: string): Promise<Participant> => {
    const participant = await api.participants.add(slug, name);
    setEvent((prev) =>
      prev ? { ...prev, participants: [...prev.participants, participant] } : prev,
    );
    await refreshDerived();
    return participant;
  };

  // ── Expenses ───────────────────────────────────────────────────────────────

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
    await refreshDerived();
    return expense;
  };

  const editExpense = async (
    expenseId: string,
    data: { title: string; amount: number; paidById: string; participantIds: string[] },
  ): Promise<Expense> => {
    const updated = await api.expenses.update(slug, expenseId, data);
    setEvent((prev) =>
      prev
        ? { ...prev, expenses: prev.expenses.map((e) => (e.id === expenseId ? updated : e)) }
        : prev,
    );
    await refreshDerived();
    return updated;
  };

  const deleteExpense = async (expenseId: string): Promise<void> => {
    await api.expenses.remove(slug, expenseId);
    setEvent((prev) =>
      prev
        ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expenseId) }
        : prev,
    );
    await refreshDerived();
  };

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  // After undo/redo the full event must be re-fetched because the expense list
  // can change in complex ways (expense recreated with same ID, etc.)

  const undo = async (): Promise<void> => {
    await api.history.undo(slug);
    await fetchAll();
  };

  const redo = async (): Promise<void> => {
    await api.history.redo(slug);
    await fetchAll();
  };

  // ── Derived flags ──────────────────────────────────────────────────────────

  const canUndo = history.some((h) => !h.undoneAt);
  const canRedo = history.some((h) => !!h.undoneAt);

  return {
    event,
    settlement,
    history,
    canUndo,
    canRedo,
    loading,
    error,
    addParticipant,
    addExpense,
    editExpense,
    deleteExpense,
    undo,
    redo,
  };
}
