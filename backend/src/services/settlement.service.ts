import prisma from '../lib/prisma';
import { calculateSettlements, computeBalances } from './settlement.algorithm';

// ─── Service ─────────────────────────────────────────────────────────────────

export const settlementService = {
  async calculate(eventId: string) {
    const [participants, expenses, payments] = await Promise.all([
      prisma.participant.findMany({ where: { eventId } }),
      prisma.expense.findMany({
        where: { eventId },
        include: { splits: true },
      }),
      prisma.payment.findMany({ where: { eventId } }),
    ]);

    const balances = computeBalances(
      participants.map((p) => ({ id: p.id, name: p.name })),
      expenses.map((e) => ({
        paidById: e.paidById,
        amount: e.amount,
        splits: e.splits.map((s) => ({ participantId: s.participantId, amount: s.amount })),
      })),
      payments.map((p) => ({ fromId: p.fromId, toId: p.toId, amount: p.amount })),
    );

    return {
      balances,
      transactions: calculateSettlements(balances),
      payments,
    };
  },
};
