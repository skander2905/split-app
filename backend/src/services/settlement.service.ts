import prisma from '../lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Balance {
  participantId: string;
  name: string;
  amount: number; // positive = is owed money, negative = owes money
}

interface Transaction {
  from: string; // who pays
  fromId: string;
  to: string; // who receives
  toId: string;
  amount: number;
}

// ─── Settlement Algorithm ────────────────────────────────────────────────────

/**
 * Greedy min-cash-flow algorithm to minimise the number of transactions.
 *
 * How it works:
 *  1. Each person's NET BALANCE = (total paid) − (total owed across all expenses).
 *     Positive → creditor (is owed money).
 *     Negative → debtor (owes money).
 *
 *  2. Sort participants by balance.  Repeatedly match the BIGGEST DEBTOR
 *     (most negative) with the BIGGEST CREDITOR (most positive):
 *       payment = min(|debtor's debt|, creditor's credit)
 *     Record the transaction, subtract from both, remove anyone who hits 0.
 *
 *  3. Each iteration fully settles at least one person, so the total number
 *     of transactions ≤ (n − 1) for n participants.
 *
 * Example:
 *   Alice: −$30, Bob: +$10, Carol: +$20
 *   → Alice pays Carol $20  (Carol settled)
 *   → Alice pays Bob   $10  (Alice & Bob settled)
 *   = 2 transactions (optimal)
 */
function calculateSettlements(balances: Balance[]): Transaction[] {
  // Work on a copy; ignore negligible balances (rounding artefacts)
  const people = balances
    .map((b) => ({ ...b, amount: parseFloat(b.amount.toFixed(2)) }))
    .filter((b) => Math.abs(b.amount) >= 0.01);

  const transactions: Transaction[] = [];

  while (people.length >= 2) {
    // Sort ascending → biggest debtor at index 0, biggest creditor at the end
    people.sort((a, b) => a.amount - b.amount);

    const debtor = people[0];
    const creditor = people[people.length - 1];

    // If the top "creditor" has a non-positive balance, everyone is settled
    if (creditor.amount < 0.01) break;

    const amount = parseFloat(
      Math.min(-debtor.amount, creditor.amount).toFixed(2),
    );

    transactions.push({
      from: debtor.name,
      fromId: debtor.participantId,
      to: creditor.name,
      toId: creditor.participantId,
      amount,
    });

    debtor.amount = parseFloat((debtor.amount + amount).toFixed(2));
    creditor.amount = parseFloat((creditor.amount - amount).toFixed(2));

    // Remove fully-settled participants (pop end before shifting start)
    if (Math.abs(creditor.amount) < 0.01) people.pop();
    if (Math.abs(debtor.amount) < 0.01) people.shift();
  }

  return transactions;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const settlementService = {
  async calculate(eventId: string) {
    const [participants, expenses] = await Promise.all([
      prisma.participant.findMany({ where: { eventId } }),
      prisma.expense.findMany({
        where: { eventId },
        include: { splits: true },
      }),
    ]);

    // Build a balance map: participantId → { name, paid, owed }
    const map: Record<string, { name: string; paid: number; owed: number }> =
      {};

    for (const p of participants) {
      map[p.id] = { name: p.name, paid: 0, owed: 0 };
    }

    for (const expense of expenses) {
      // The payer gets credit for the full expense amount
      if (map[expense.paidById]) {
        map[expense.paidById].paid += expense.amount;
      }
      // Each split participant owes their share
      for (const split of expense.splits) {
        if (map[split.participantId]) {
          map[split.participantId].owed += split.amount;
        }
      }
    }

    const balances: Balance[] = Object.entries(map).map(
      ([id, { name, paid, owed }]) => ({
        participantId: id,
        name,
        amount: parseFloat((paid - owed).toFixed(2)),
      }),
    );

    return {
      balances,
      transactions: calculateSettlements(balances),
    };
  },
};
