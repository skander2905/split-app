import prisma from '../lib/prisma';

/** Minimal snapshot stored in history for a removed participant. */
export interface ParticipantSnapshot {
  id: string;
  name: string;
}

export const participantService = {
  async addToEvent(eventId: string, name: string) {
    return prisma.participant.create({ data: { name, eventId } });
  },

  async findById(id: string) {
    return prisma.participant.findUnique({ where: { id } });
  },

  /**
   * Counts how many expenses, splits, and payments reference this participant.
   * A participant can only be removed when this is 0 (no cascade — removing an
   * involved participant would corrupt balances).
   */
  async involvementCount(participantId: string): Promise<number> {
    const [paidExpenses, splits, payments] = await Promise.all([
      prisma.expense.count({ where: { paidById: participantId } }),
      prisma.expenseSplit.count({ where: { participantId } }),
      prisma.payment.count({
        where: { OR: [{ fromId: participantId }, { toId: participantId }] },
      }),
    ]);
    return paidExpenses + splits + payments;
  },

  async remove(participantId: string) {
    return prisma.participant.delete({ where: { id: participantId } });
  },
};
