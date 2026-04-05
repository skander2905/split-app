import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { expenseService, toSnapshot } from '../services/expense.service';
import { historyService } from '../services/history.service';

export const expenseController = {
  // ── Add ───────────────────────────────────────────────────────────────────

  async add(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, amount, paidById, participantIds } = req.body;

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

      // Record ADD in history
      await historyService.record(event.id, 'ADD', expense.id, toSnapshot(expense), null);

      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  },

  // ── Update ────────────────────────────────────────────────────────────────

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { expenseId } = req.params;
      const { title, amount, paidById, participantIds } = req.body;

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

      // Capture state before update for history
      const before = await expenseService.findById(expenseId);
      if (!before) return res.status(404).json({ error: 'Expense not found.' });

      const updated = await expenseService.update(
        expenseId,
        title.trim(),
        parseFloat(amount),
        paidById,
        participantIds,
      );

      // Record EDIT with before/after snapshots
      await historyService.record(
        event.id,
        'EDIT',
        expenseId,
        toSnapshot(updated),
        toSnapshot(before),
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { expenseId } = req.params;

      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      // Capture full snapshot before deleting (needed for undo)
      const before = await expenseService.findById(expenseId);
      if (!before) return res.status(404).json({ error: 'Expense not found.' });

      await expenseService.remove(expenseId);

      // Record DELETE — data is null (expense gone), prevData has the full snapshot
      await historyService.record(event.id, 'DELETE', expenseId, null, toSnapshot(before));

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
