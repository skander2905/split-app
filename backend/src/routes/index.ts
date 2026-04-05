import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { participantController } from '../controllers/participant.controller';
import { expenseController } from '../controllers/expense.controller';

const router = Router();

// ── Events ──────────────────────────────────────────────────────────────────
router.post('/events', eventController.create);
router.get('/events/:slug', eventController.getBySlug);
router.get('/events/:slug/settlements', eventController.getSettlements);

// ── Participants ─────────────────────────────────────────────────────────────
router.post('/events/:slug/participants', participantController.add);

// ── Expenses ─────────────────────────────────────────────────────────────────
router.post('/events/:slug/expenses', expenseController.add);

export { router };
