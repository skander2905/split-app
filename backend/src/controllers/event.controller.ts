import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { settlementService } from '../services/settlement.service';

export const eventController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Event name is required.' });
      }
      const event = await eventService.create(name.trim());
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      res.json(event);
    } catch (err) {
      next(err);
    }
  },

  async getSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      const result = await settlementService.calculate(event.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
