import { describe, it, expect } from 'vitest';
import {
  calculateSettlements,
  computeBalances,
  settlementCap,
  type ExpenseInput,
  type ParticipantInput,
  type PaymentInput,
} from './settlement.algorithm';

// Seedable PRNG (mulberry32) for reproducible randomized runs.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Equal split, exactly as expense.service does it: round(amount / k, 2) each. */
function equalSplits(amount: number, ids: string[]) {
  const share = Math.round((amount / ids.length) * 100) / 100;
  return ids.map((participantId) => ({ participantId, amount: share }));
}

/**
 * Simulate a user clicking "Settle" on the first suggested transaction, over and
 * over, until nothing is suggested. `clamp` mirrors the server-side guard.
 * Returns whether it converged and the payments recorded.
 */
function settleEverything(
  participants: ParticipantInput[],
  expenses: ExpenseInput[],
  { clamp }: { clamp: boolean },
  maxIterations = 500,
) {
  const payments: PaymentInput[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const balances = computeBalances(participants, expenses, payments);
    const txs = calculateSettlements(balances);
    if (txs.length === 0) return { converged: true, iterations: i, payments };

    const t = txs[0];
    let amount = t.amount;
    if (clamp) amount = Math.min(amount, settlementCap(balances, t.fromId, t.toId));
    if (amount < 0.01) return { converged: false, iterations: i, payments }; // stuck
    payments.push({ fromId: t.fromId, toId: t.toId, amount });
  }
  return { converged: false, iterations: maxIterations, payments };
}

// ─── Reproduce the reported bug ───────────────────────────────────────────────

describe('settlement payments — the reversed-settlement bug', () => {
  // Bob paid 20 for a dinner split between Alice & Bob → Alice owes Bob 10.
  const participants: ParticipantInput[] = [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
  ];
  const expenses: ExpenseInput[] = [
    { paidById: 'bob', amount: 20, splits: equalSplits(20, ['alice', 'bob']) },
  ];

  it('suggests Alice → Bob 10 before any payment', () => {
    const balances = computeBalances(participants, expenses, []);
    const txs = calculateSettlements(balances);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ fromId: 'alice', toId: 'bob', amount: 10 });
  });

  it('is fully settled after one correct payment', () => {
    const payments: PaymentInput[] = [{ fromId: 'alice', toId: 'bob', amount: 10 }];
    const txs = calculateSettlements(computeBalances(participants, expenses, payments));
    expect(txs).toEqual([]);
  });

  it('REVERSES the debt if the same payment is recorded twice (the bug)', () => {
    // A stale page or double-submit records Alice→Bob 10 a second time.
    const payments: PaymentInput[] = [
      { fromId: 'alice', toId: 'bob', amount: 10 },
      { fromId: 'alice', toId: 'bob', amount: 10 },
    ];
    const txs = calculateSettlements(computeBalances(participants, expenses, payments));
    // Now the algorithm suggests paying it BACK — exactly what was observed.
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ fromId: 'bob', toId: 'alice', amount: 10 });
  });

  it('settlementCap blocks the overshooting second payment', () => {
    // After the first correct payment everyone is even…
    const afterFirst = computeBalances(participants, expenses, [
      { fromId: 'alice', toId: 'bob', amount: 10 },
    ]);
    // …so the cap for another Alice→Bob payment is 0 → the server would reject it.
    expect(settlementCap(afterFirst, 'alice', 'bob')).toBe(0);
  });

  it('settlementCap clamps a stale, too-large amount to the real outstanding debt', () => {
    const balances = computeBalances(participants, expenses, []);
    // UI offered 10; even if a stale client sent 25, the cap is the true debt.
    expect(settlementCap(balances, 'alice', 'bob')).toBe(10);
    expect(Math.min(25, settlementCap(balances, 'alice', 'bob'))).toBe(10);
  });
});

// ─── Randomized full-flow convergence ────────────────────────────────────────

describe('settlement flow — randomized convergence (clamped settles)', () => {
  it('always settles to zero suggestions without oscillating (3000 random events)', () => {
    const rand = rng(0x5e771e);
    const RUNS = 3000;

    for (let run = 0; run < RUNS; run++) {
      const n = 2 + Math.floor(rand() * 7); // 2..8 participants
      const participants: ParticipantInput[] = Array.from({ length: n }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
      }));
      const ids = participants.map((p) => p.id);

      const m = 1 + Math.floor(rand() * 10); // 1..10 expenses
      const expenses: ExpenseInput[] = [];
      for (let e = 0; e < m; e++) {
        const amount = parseFloat((1 + rand() * 499).toFixed(2)); // 1.00 .. 500.00
        const payer = ids[Math.floor(rand() * n)];
        // Random non-empty subset to split between.
        const subset = ids.filter(() => rand() < 0.6);
        const splitIds = subset.length ? subset : [ids[Math.floor(rand() * n)]];
        expenses.push({ paidById: payer, amount, splits: equalSplits(amount, splitIds) });
      }

      const result = settleEverything(participants, expenses, { clamp: true }, 50);
      expect(result.converged, `did not converge for run ${run}`).toBe(true);

      // No suggested transaction may reverse a payment we already recorded.
      const seen = new Set(result.payments.map((p) => `${p.fromId}->${p.toId}`));
      for (const p of result.payments) {
        expect(seen.has(`${p.toId}->${p.fromId}`), `reversal in run ${run}`).toBe(false);
      }
    }
  });
});
