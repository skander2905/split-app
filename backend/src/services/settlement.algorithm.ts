// ─── Settlement Algorithm (pure, no I/O) ──────────────────────────────────────
// Extracted from settlement.service so it can be unit-tested in isolation.

export interface Balance {
  participantId: string;
  name: string;
  amount: number; // positive = is owed money, negative = owes money
}

export interface Transaction {
  from: string; // who pays
  fromId: string;
  to: string; // who receives
  toId: string;
  amount: number;
}

// ─── Balance computation (pure) ───────────────────────────────────────────────

export interface ParticipantInput {
  id: string;
  name: string;
}

export interface ExpenseInput {
  paidById: string;
  amount: number;
  splits: { participantId: string; amount: number }[];
}

export interface PaymentInput {
  fromId: string;
  toId: string;
  amount: number;
}

/**
 * Net balance per participant = (total paid) − (total owed).
 *  - An expense credits the payer its full amount; each split debits that person.
 *  - A settlement payment from A→B credits A (debt down) and debits B (credit down).
 * Positive → is owed money; negative → owes money.
 */
export function computeBalances(
  participants: ParticipantInput[],
  expenses: ExpenseInput[],
  payments: PaymentInput[],
): Balance[] {
  const map: Record<string, { name: string; paid: number; owed: number }> = {};
  for (const p of participants) map[p.id] = { name: p.name, paid: 0, owed: 0 };

  for (const expense of expenses) {
    if (map[expense.paidById]) map[expense.paidById].paid += expense.amount;
    for (const split of expense.splits) {
      if (map[split.participantId]) map[split.participantId].owed += split.amount;
    }
  }

  for (const payment of payments) {
    if (map[payment.fromId]) map[payment.fromId].paid += payment.amount;
    if (map[payment.toId]) map[payment.toId].owed += payment.amount;
  }

  return Object.entries(map).map(([id, { name, paid, owed }]) => ({
    participantId: id,
    name,
    amount: parseFloat((paid - owed).toFixed(2)),
  }));
}

/**
 * The maximum a settlement payment from `fromId`→`toId` may record without
 * overshooting: the smaller of the payer's current debt and the recipient's
 * current credit. Recording more than this flips someone past zero, which makes
 * the next recompute suggest the SAME transfer in reverse. Returns 0 when the
 * debt between the two is already settled.
 */
export function settlementCap(
  balances: Balance[],
  fromId: string,
  toId: string,
): number {
  const from = balances.find((b) => b.participantId === fromId);
  const to = balances.find((b) => b.participantId === toId);
  const payerDebt = from ? Math.max(0, -from.amount) : 0;
  const recipientCredit = to ? Math.max(0, to.amount) : 0;
  return parseFloat(Math.min(payerDebt, recipientCredit).toFixed(2));
}

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
export function calculateSettlements(balances: Balance[]): Transaction[] {
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

    // If the top "creditor" has a non-positive balance, everyone is settled.
    if (creditor.amount < 0.01) break;
    // If no real debtor remains (balances don't sum to zero, e.g. rounding
    // residue), stop — there's nothing valid left to transfer.
    if (debtor.amount > -0.01) break;

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
