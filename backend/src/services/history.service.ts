import prisma from '../lib/prisma';
import { Prisma, HistoryAction } from '@prisma/client';
import { expenseService, toSnapshot, type ExpenseSnapshot } from './expense.service';
import type { ParticipantSnapshot } from './participant.service';

const toJson = (v: ExpenseSnapshot | null): Prisma.InputJsonValue | undefined =>
  v ? (v as unknown as Prisma.InputJsonValue) : undefined;

/** Expense actions participate in undo/redo; participant actions are log-only. */
const EXPENSE_ACTIONS: HistoryAction[] = [
  HistoryAction.ADD,
  HistoryAction.EDIT,
  HistoryAction.DELETE,
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistorySnapshot = ExpenseSnapshot | ParticipantSnapshot;

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  expenseId: string | null;
  data: HistorySnapshot | null;
  prevData: HistorySnapshot | null;
  undoneAt: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Clears the entire redo stack for an event (all undone entries).
 * Called whenever a new action is recorded so redo is no longer possible.
 */
async function clearRedoStack(eventId: string) {
  await prisma.expenseHistory.deleteMany({
    where: { eventId, undoneAt: { not: null } },
  });
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const historyService = {
  // ── Read ──────────────────────────────────────────────────────────────────

  async getHistory(eventId: string): Promise<HistoryEntry[]> {
    const entries = await prisma.expenseHistory.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((e) => ({
      id: e.id,
      action: e.action,
      expenseId: e.expenseId,
      data: e.data as HistorySnapshot | null,
      prevData: e.prevData as HistorySnapshot | null,
      undoneAt: e.undoneAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    }));
  },

  // ── Record (called by expense operations) ─────────────────────────────────

  async record(
    eventId: string,
    action: HistoryAction,
    expenseId: string,
    data: ExpenseSnapshot | null,
    prevData: ExpenseSnapshot | null,
  ) {
    // Any new action wipes the redo stack
    await clearRedoStack(eventId);

    return prisma.expenseHistory.create({
      data: {
        eventId,
        action,
        expenseId,
        data: toJson(data),
        prevData: toJson(prevData),
      },
    });
  },

  /**
   * Records a participant removal as a log-only entry. These are NOT part of the
   * undo/redo stack (see EXPENSE_ACTIONS), so we don't clear the redo stack here.
   */
  async recordParticipantRemoval(eventId: string, participant: ParticipantSnapshot) {
    return prisma.expenseHistory.create({
      data: {
        eventId,
        action: HistoryAction.REMOVE_PARTICIPANT,
        expenseId: null,
        data: { id: participant.id, name: participant.name } as Prisma.InputJsonValue,
      },
    });
  },

  // ── Undo ──────────────────────────────────────────────────────────────────

  /**
   * Undo algorithm:
   *  1. Find the most recent ACTIVE history entry (undoneAt IS NULL, latest createdAt).
   *  2. Apply the inverse operation:
   *       ADD    → delete the expense
   *       EDIT   → restore expense to prevData
   *       DELETE → recreate expense from prevData
   *  3. Mark the entry as undone (undoneAt = now).
   */
  async undo(eventId: string) {
    const entry = await prisma.expenseHistory.findFirst({
      where: { eventId, undoneAt: null, action: { in: EXPENSE_ACTIONS } },
      orderBy: { createdAt: 'desc' },
    });

    if (!entry || !entry.expenseId) return null;

    const { action, expenseId, prevData } = entry;

    if (action === 'ADD') {
      // Inverse of ADD = delete
      await expenseService.remove(expenseId);
    } else if (action === 'EDIT') {
      // Inverse of EDIT = restore previous state
      const prev = prevData as unknown as ExpenseSnapshot;
      await expenseService.update(
        expenseId,
        prev.title,
        prev.amount,
        prev.paidById,
        prev.participantIds,
      );
    } else if (action === 'DELETE') {
      // Inverse of DELETE = recreate from the snapshot saved before deletion
      const prev = prevData as unknown as ExpenseSnapshot;
      await expenseService.recreate(prev);
    }

    // Mark as undone
    await prisma.expenseHistory.update({
      where: { id: entry.id },
      data: { undoneAt: new Date() },
    });

    return entry;
  },

  // ── Redo ──────────────────────────────────────────────────────────────────

  /**
   * Redo algorithm:
   *  1. Find the most recently undone entry (max undoneAt among entries where undoneAt IS NOT NULL).
   *     Ordering by undoneAt DESC gives the entry that was undone last — which is the first to redo.
   *  2. Re-apply the original operation:
   *       ADD    → recreate expense from data
   *       EDIT   → re-apply data to expense
   *       DELETE → delete the expense again
   *  3. Clear undoneAt (move entry back to active stack).
   */
  async redo(eventId: string) {
    const entry = await prisma.expenseHistory.findFirst({
      where: { eventId, undoneAt: { not: null }, action: { in: EXPENSE_ACTIONS } },
      orderBy: { undoneAt: 'desc' }, // most recently undone = first to redo
    });

    if (!entry || !entry.expenseId) return null;

    const { action, expenseId, data } = entry;

    if (action === 'ADD') {
      // Re-apply ADD = recreate from original snapshot
      const snap = data as unknown as ExpenseSnapshot;
      await expenseService.recreate(snap);
    } else if (action === 'EDIT') {
      // Re-apply EDIT = apply data again
      const snap = data as unknown as ExpenseSnapshot;
      await expenseService.update(
        expenseId,
        snap.title,
        snap.amount,
        snap.paidById,
        snap.participantIds,
      );
    } else if (action === 'DELETE') {
      // Re-apply DELETE = delete again
      await expenseService.remove(expenseId);
    }

    // Clear undoneAt — entry is active again
    await prisma.expenseHistory.update({
      where: { id: entry.id },
      data: { undoneAt: null },
    });

    return entry;
  },
};
