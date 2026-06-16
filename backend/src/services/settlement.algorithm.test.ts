import { describe, it, expect } from 'vitest';
import {
  calculateSettlements,
  type Balance,
  type Transaction,
} from './settlement.algorithm';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Build Balance[] from a list of amounts (ids/names auto-generated). */
function mkBalances(amounts: number[]): Balance[] {
  return amounts.map((amount, i) => ({
    participantId: `p${i}`,
    name: `P${i}`,
    amount,
  }));
}

/**
 * Replay the transactions onto the starting balances and return each person's
 * residual balance. A correct settlement drives every residual to ~0 when the
 * input sums to zero.
 *   - debtor (negative) PAYS  → balance rises toward 0  (+amount)
 *   - creditor (positive) RECEIVES → balance falls toward 0 (−amount)
 */
function residualsAfter(balances: Balance[], txs: Transaction[]): Map<string, number> {
  const net = new Map(balances.map((b) => [b.participantId, b.amount]));
  for (const t of txs) {
    net.set(t.fromId, (net.get(t.fromId) ?? 0) + t.amount);
    net.set(t.toId, (net.get(t.toId) ?? 0) - t.amount);
  }
  return net;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Assert every structural invariant that must hold for ANY input. */
function assertStructuralInvariants(balances: Balance[], txs: Transaction[]) {
  const nonZero = balances.filter((b) => Math.abs(b.amount) >= 0.01).length;

  // Greedy min-cash-flow settles ≥1 person per transaction → ≤ n−1 transactions.
  expect(txs.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));

  for (const t of txs) {
    // Every transfer is a strictly positive amount.
    expect(t.amount).toBeGreaterThan(0);
    // Nobody pays themselves.
    expect(t.fromId).not.toBe(t.toId);
    // Payer must be a real debtor; receiver a real creditor.
    const from = balances.find((b) => b.participantId === t.fromId);
    const to = balances.find((b) => b.participantId === t.toId);
    expect(from && from.amount).toBeLessThan(0);
    expect(to && to.amount).toBeGreaterThan(0);
  }
}

/** For zero-sum inputs, the settlement must fully clear everyone. */
function assertFullySettled(balances: Balance[], txs: Transaction[]) {
  const residuals = [...residualsAfter(balances, txs).values()];
  for (const r of residuals) {
    expect(Math.abs(r)).toBeLessThan(0.01);
  }
}

// Seedable PRNG (mulberry32) → reproducible randomized runs.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Hand-crafted cases ─────────────────────────────────────────────────────

describe('calculateSettlements — basic & edge cases', () => {
  it('returns no transactions for an empty group', () => {
    expect(calculateSettlements([])).toEqual([]);
  });

  it('returns no transactions for a single person', () => {
    expect(calculateSettlements(mkBalances([0]))).toEqual([]);
    expect(calculateSettlements(mkBalances([5]))).toEqual([]); // can't settle alone
  });

  it('returns no transactions when everyone is already even', () => {
    expect(calculateSettlements(mkBalances([0, 0, 0, 0]))).toEqual([]);
  });

  it('settles a simple two-person debt with one transaction', () => {
    const b = mkBalances([-10, 10]); // P0 owes P1
    const txs = calculateSettlements(b);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ fromId: 'p0', toId: 'p1', amount: 10 });
    assertStructuralInvariants(b, txs);
    assertFullySettled(b, txs);
  });

  it('matches the documented Alice/Bob/Carol example (2 transactions)', () => {
    // Alice −30, Bob +10, Carol +20
    const b = mkBalances([-30, 10, 20]);
    const txs = calculateSettlements(b);
    expect(txs).toHaveLength(2);
    assertStructuralInvariants(b, txs);
    assertFullySettled(b, txs);
  });

  it('ignores sub-cent rounding dust', () => {
    expect(calculateSettlements(mkBalances([0.004, -0.004]))).toEqual([]);
  });

  it('handles a three-way uneven split with cent residue', () => {
    // 10.00 split 3 ways: payer +6.67, others −3.33 / −3.34 (sums to 0)
    const b = mkBalances([6.67, -3.33, -3.34]);
    const txs = calculateSettlements(b);
    assertStructuralInvariants(b, txs);
    assertFullySettled(b, txs);
  });

  it('handles one debtor owing several creditors', () => {
    const b = mkBalances([-60, 20, 15, 25]);
    const txs = calculateSettlements(b);
    expect(txs.length).toBeLessThanOrEqual(3);
    assertStructuralInvariants(b, txs);
    assertFullySettled(b, txs);
  });

  it('handles several debtors owing one creditor', () => {
    const b = mkBalances([90, -30, -25, -35]);
    const txs = calculateSettlements(b);
    assertStructuralInvariants(b, txs);
    assertFullySettled(b, txs);
  });

  it('does not mutate the input balances array', () => {
    const b = mkBalances([-30, 10, 20]);
    const snapshot = JSON.stringify(b);
    calculateSettlements(b);
    expect(JSON.stringify(b)).toBe(snapshot);
  });

  it('moves exactly the total debt (sum of transfers == sum of positives)', () => {
    const amounts = [-50, -10, 25, 35];
    const b = mkBalances(amounts);
    const txs = calculateSettlements(b);
    const transferred = sum(txs.map((t) => t.amount));
    const totalCredit = sum(amounts.filter((a) => a > 0));
    expect(Math.abs(transferred - totalCredit)).toBeLessThan(0.01);
  });
});

// ─── Randomized property tests ────────────────────────────────────────────────

describe('calculateSettlements — randomized property tests', () => {
  it('always fully settles zero-sum groups & respects all invariants (5000 cases)', () => {
    const rand = rng(0xC0FFEE);
    const RUNS = 5000;

    for (let run = 0; run < RUNS; run++) {
      const n = 2 + Math.floor(rand() * 11); // 2..12 participants

      // Random balances in whole cents, last person absorbs the remainder so
      // the group sums to EXACTLY zero (as real fully-split expenses always do).
      const cents: number[] = [];
      let acc = 0;
      for (let i = 0; i < n - 1; i++) {
        const c = Math.floor(rand() * 200001) - 100000; // −1000.00 .. +1000.00
        cents.push(c);
        acc += c;
      }
      cents.push(-acc);

      const amounts = cents.map((c) => parseFloat((c / 100).toFixed(2)));
      const b = mkBalances(amounts);
      const txs = calculateSettlements(b);

      assertStructuralInvariants(b, txs);
      assertFullySettled(b, txs);
    }
  });

  it('never crashes and stays bounded on non-zero-sum inputs (2000 cases)', () => {
    const rand = rng(0xBADBEEF);
    const RUNS = 2000;

    for (let run = 0; run < RUNS; run++) {
      const n = 1 + Math.floor(rand() * 12); // 1..12
      const amounts = Array.from({ length: n }, () =>
        parseFloat(((Math.floor(rand() * 200001) - 100000) / 100).toFixed(2)),
      );
      const b = mkBalances(amounts);
      const txs = calculateSettlements(b);

      // No full-settlement guarantee here (sum may be nonzero), but the
      // structural rules must still hold and it must terminate.
      assertStructuralInvariants(b, txs);
    }
  });
});
