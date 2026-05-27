import prisma from '../lib/prisma';

export const paymentService = {
  async create(eventId: string, fromId: string, toId: string, amount: number) {
    return prisma.payment.create({
      data: { eventId, fromId, toId, amount },
    });
  },

  async remove(id: string) {
    return prisma.payment.delete({ where: { id } });
  },
};
