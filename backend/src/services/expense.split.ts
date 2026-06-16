// ─── Expense split (pure, no I/O) ─────────────────────────────────────────────

/**
 * Splits `amount` across participants so the shares sum EXACTLY to `amount`
 * (at 2-decimal / cent precision). Any leftover cents from an uneven division
 * are handed out one-each to the first participants. This prevents rounding
 * residue (e.g. 10.00 / 3 = 3.33×3 = 9.99) from accumulating into phantom
 * balances that have no real counterpart in the settlement.
 */
export function splitShares(amount: number, participantIds: string[]) {
  const n = participantIds.length;
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n; // 0..n-1 leftover cents
  return participantIds.map((participantId, i) => ({
    participantId,
    amount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}
