import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { participantController } from '../controllers/participant.controller';
import { expenseController } from '../controllers/expense.controller';
import { historyController } from '../controllers/history.controller';

const router = Router();

// ── Events ───────────────────────────────────────────────────────────────────
router.post('/events', eventController.create);
router.get('/events/:slug', eventController.getBySlug);
router.get('/events/:slug/settlements', eventController.getSettlements);

// ── Participants ──────────────────────────────────────────────────────────────
router.post('/events/:slug/participants', participantController.add);

// ── Expenses ──────────────────────────────────────────────────────────────────
router.post('/events/:slug/expenses', expenseController.add);
router.patch('/events/:slug/expenses/:expenseId', expenseController.update);
router.delete('/events/:slug/expenses/:expenseId', expenseController.remove);

// ── History / Undo / Redo ─────────────────────────────────────────────────────
router.get('/events/:slug/history', historyController.getHistory);
router.post('/events/:slug/history/undo', historyController.undo);
router.post('/events/:slug/history/redo', historyController.redo);

export { router };
