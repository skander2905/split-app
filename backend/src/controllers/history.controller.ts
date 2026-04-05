import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { historyService } from '../services/history.service';

export const historyController = {
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const history = await historyService.getHistory(event.id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },

  async undo(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const entry = await historyService.undo(event.id);
      if (!entry) return res.status(400).json({ error: 'Nothing to undo.' });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async redo(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const entry = await historyService.redo(event.id);
      if (!entry) return res.status(400).json({ error: 'Nothing to redo.' });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};
