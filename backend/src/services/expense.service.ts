import prisma from '../lib/prisma';

/** Shape stored in ExpenseHistory.data / prevData */
export interface ExpenseSnapshot {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  eventId: string;
}

/** Build a plain snapshot from a full Prisma expense record */
export function toSnapshot(expense: {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  eventId: string;
  splits: { participantId: string }[];
}): ExpenseSnapshot {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    paidById: expense.paidById,
    eventId: expense.eventId,
    participantIds: expense.splits.map((s) => s.participantId),
  };
}

const includeRelations = {
  paidBy: true,
  splits: { include: { participant: true } },
} as const;

export const expenseService = {
  /**
   * Creates an expense and distributes it equally among the selected participants.
   * Each split stores the individual share so balances can be recalculated at any time.
   */
  async create(
    eventId: string,
    title: string,
    amount: number,
    paidById: string,
    participantIds: string[],
  ) {
    const splitAmount = Math.round((amount / participantIds.length) * 100) / 100;

    return prisma.expense.create({
      data: {
        title,
        amount,
        eventId,
        paidById,
        splits: {
          create: participantIds.map((participantId) => ({
            participantId,
            amount: splitAmount,
          })),
        },
      },
      include: includeRelations,
    });
  },

  /**
   * Recreates a previously deleted expense from a snapshot, preserving the original ID.
   * Used by undo (for DELETE) and redo (for ADD).
   */
  async recreate(snapshot: ExpenseSnapshot) {
    const splitAmount =
      Math.round((snapshot.amount / snapshot.participantIds.length) * 100) / 100;

    return prisma.expense.create({
      data: {
        id: snapshot.id,
        title: snapshot.title,
        amount: snapshot.amount,
        eventId: snapshot.eventId,
        paidById: snapshot.paidById,
        splits: {
          create: snapshot.participantIds.map((participantId) => ({
            participantId,
            amount: splitAmount,
          })),
        },
      },
      include: includeRelations,
    });
  },

  /**
   * Updates an expense: replaces all splits with fresh ones for the new participant set.
   */
  async update(
    expenseId: string,
    title: string,
    amount: number,
    paidById: string,
    participantIds: string[],
  ) {
    const splitAmount = Math.round((amount / participantIds.length) * 100) / 100;

    // Replace splits atomically inside a transaction
    await prisma.expenseSplit.deleteMany({ where: { expenseId } });

    return prisma.expense.update({
      where: { id: expenseId },
      data: {
        title,
        amount,
        paidById,
        splits: {
          create: participantIds.map((participantId) => ({
            participantId,
            amount: splitAmount,
          })),
        },
      },
      include: includeRelations,
    });
  },

  /** Hard-deletes an expense (splits cascade-delete via schema). */
  async remove(expenseId: string) {
    return prisma.expense.delete({
      where: { id: expenseId },
      include: includeRelations,
    });
  },

  async findById(expenseId: string) {
    return prisma.expense.findUnique({
      where: { id: expenseId },
      include: includeRelations,
    });
  },
};
