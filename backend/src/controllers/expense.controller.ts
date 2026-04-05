import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { expenseService } from '../services/expense.service';

export const expenseController = {
  async add(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, amount, paidById, participantIds } = req.body;

      // Validation
      if (!title?.trim())
        return res.status(400).json({ error: 'Title is required.' });
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
        return res.status(400).json({ error: 'A positive amount is required.' });
      if (!paidById)
        return res.status(400).json({ error: 'Payer is required.' });
      if (!Array.isArray(participantIds) || participantIds.length === 0)
        return res.status(400).json({ error: 'At least one participant is required.' });

      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const expense = await expenseService.create(
        event.id,
        title.trim(),
        parseFloat(amount),
        paidById,
        participantIds,
      );

      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  },
};
