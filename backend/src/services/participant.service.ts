import prisma from '../lib/prisma';

export const participantService = {
  async addToEvent(eventId: string, name: string) {
    return prisma.participant.create({ data: { name, eventId } });
  },
};
