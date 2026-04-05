import { randomBytes } from 'crypto';
import prisma from '../lib/prisma';

/** Generates a short, URL-safe slug (8 hex chars). */
function generateSlug(): string {
  return randomBytes(4).toString('hex');
}

export const eventService = {
  async create(name: string) {
    const slug = generateSlug();
    return prisma.event.create({ data: { name, slug } });
  },

  /**
   * Fetches a full event with all nested relations needed by the frontend:
   * participants, expenses (with payer + per-participant splits).
   */
  async findBySlug(slug: string) {
    return prisma.event.findUnique({
      where: { slug },
      include: {
        participants: { orderBy: { id: 'asc' } },
        expenses: {
          orderBy: { createdAt: 'desc' },
          include: {
            paidBy: true,
            splits: { include: { participant: true } },
          },
        },
      },
    });
  },
};
