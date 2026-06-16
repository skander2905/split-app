import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { participantController } from '../controllers/participant.controller';
import { expenseController } from '../controllers/expense.controller';
import { historyController } from '../controllers/history.controller';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

// ── Events ───────────────────────────────────────────────────────────────────
router.post('/events', eventController.create);
router.get('/events/:slug', eventController.getBySlug);
router.patch('/events/:slug', eventController.rename);
router.get('/events/:slug/settlements', eventController.getSettlements);

// ── Participants ──────────────────────────────────────────────────────────────
router.post('/events/:slug/participants', participantController.add);
router.delete('/events/:slug/participants/:participantId', participantController.remove);

// ── Expenses ──────────────────────────────────────────────────────────────────
router.post('/events/:slug/expenses', expenseController.add);
router.patch('/events/:slug/expenses/:expenseId', expenseController.update);
router.delete('/events/:slug/expenses/:expenseId', expenseController.remove);

// ── Payments (settlements) ────────────────────────────────────────────────────
router.post('/events/:slug/payments', paymentController.create);
router.delete('/events/:slug/payments/:paymentId', paymentController.remove);

// ── History / Undo / Redo ─────────────────────────────────────────────────────
router.get('/events/:slug/history', historyController.getHistory);
router.post('/events/:slug/history/undo', historyController.undo);
router.post('/events/:slug/history/redo', historyController.redo);

export { router };
