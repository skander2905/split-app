import prisma from '../lib/prisma';

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
    // Round to 2 decimal places to avoid floating-point drift
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
      include: {
        paidBy: true,
        splits: { include: { participant: true } },
      },
    });
  },
};
