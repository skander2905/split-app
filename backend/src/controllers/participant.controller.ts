import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { participantService } from '../services/participant.service';
import { historyService } from '../services/history.service';

export const participantController = {
  async add(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Participant name is required.' });
      }

      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const participant = await participantService.addToEvent(event.id, name.trim());
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { participantId } = req.params;

      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const participant = await participantService.findById(participantId);
      if (!participant || participant.eventId !== event.id) {
        return res.status(404).json({ error: 'Participant not found.' });
      }

      const involvement = await participantService.involvementCount(participantId);
      if (involvement > 0) {
        return res.status(409).json({
          error:
            'This participant is part of an expense or payment. Remove those first, then try again.',
        });
      }

      await participantService.remove(participantId);
      await historyService.recordParticipantRemoval(event.id, participant);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
