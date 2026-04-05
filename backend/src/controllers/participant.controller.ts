import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { participantService } from '../services/participant.service';

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
};
