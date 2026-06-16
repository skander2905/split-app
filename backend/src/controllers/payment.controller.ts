import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { paymentService } from '../services/payment.service';
import { settlementService } from '../services/settlement.service';
import { settlementCap } from '../services/settlement.algorithm';

export const paymentController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { fromId, toId, amount } = req.body;
      if (!fromId || !toId || fromId === toId) {
        return res.status(400).json({ error: 'Invalid payer/recipient.' });
      }
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ error: 'Amount must be positive.' });
      }
      const event = await eventService.findBySlug(req.params.slug);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const valid = event.participants.some((p) => p.id === fromId)
        && event.participants.some((p) => p.id === toId);
      if (!valid) {
        return res.status(400).json({ error: 'Participant not in this event.' });
      }

      // Guard against overshoot: a settlement can't exceed the payer's current
      // debt to the recipient. Without this, a duplicate/stale "Settle" click
      // flips the balance and the next recompute suggests the transfer REVERSED.
      const { balances } = await settlementService.calculate(event.id);
      const cap = settlementCap(balances, fromId, toId);
      if (cap < 0.01) {
        return res.status(409).json({ error: 'That debt is already settled.' });
      }
      const recordAmount = Math.min(value, cap);

      const payment = await paymentService.create(event.id, fromId, toId, recordAmount);
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentService.remove(req.params.paymentId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
