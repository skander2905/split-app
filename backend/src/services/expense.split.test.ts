import { describe, it, expect } from 'vitest';
import { splitShares } from './expense.split';
import { computeBalances, calculateSettlements } from './settlement.algorithm';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const sumCents = (shares: { amount: number }[]) =>
  shares.reduce((acc, s) => acc + Math.round(s.amount * 100), 0);

describe('splitShares — exact, residue-free division', () => {
  it('splits an evenly-divisible amount equally', () => {
    const shares = splitShares(12, ids(3));
    expect(shares.map((s) => s.amount)).toEqual([4, 4, 4]);
  });

  it('distributes leftover cents to the first participants (10 / 3)', () => {
    const shares = splitShares(10, ids(3));
    expect(shares.map((s) => s.amount)).toEqual([3.34, 3.33, 3.33]);
    expect(sumCents(shares)).toBe(1000); // sums to EXACTLY 10.00
  });

  it('handles a single participant', () => {
    expect(splitShares(9.99, ids(1))).toEqual([{ participantId: 'p0', amount: 9.99 }]);
  });

  it('shares never differ by more than one cent', () => {
    const shares = splitShares(100, ids(7));
    const cents = shares.map((s) => Math.round(s.amount * 100));
    expect(Math.max(...cents) - Math.min(...cents)).toBeLessThanOrEqual(1);
  });

  it('always sums to the original amount (randomized, 20000 cases)', () => {
    const rand = rng(0x5119173);
    for (let i = 0; i < 20000; i++) {
      const n = 1 + Math.floor(rand() * 15); // 1..15 people
      const amount = parseFloat((rand() * 1000).toFixed(2)); // 0.00 .. 1000.00
      const shares = splitShares(amount, ids(n));
      expect(sumCents(shares)).toBe(Math.round(amount * 100));
      expect(shares).toHaveLength(n);
    }
  });
});

describe('exact splits eliminate phantom balances', () => {
  it('balances always net to zero, so everyone is fully settleable (4000 events)', () => {
    const rand = rng(0x9a11);
    for (let run = 0; run < 4000; run++) {
      const n = 2 + Math.floor(rand() * 7);
      const participants = ids(n).map((id) => ({ id, name: id }));
      const pids = participants.map((p) => p.id);

      const expenses = [];
      const m = 1 + Math.floor(rand() * 12);
      for (let e = 0; e < m; e++) {
        const amount = parseFloat((1 + rand() * 499).toFixed(2));
        const payer = pids[Math.floor(rand() * n)];
        const subset = pids.filter(() => rand() < 0.6);
        const splitIds = subset.length ? subset : [pids[Math.floor(rand() * n)]];
        expenses.push({ paidById: payer, amount, splits: splitShares(amount, splitIds) });
      }

      const balances = computeBalances(participants, expenses, []);

      // With exact splits the whole group nets to zero (no rounding residue).
      const total = balances.reduce((a, b) => a + b.amount, 0);
      expect(Math.abs(total)).toBeLessThan(0.005);

      // …and the suggested transactions therefore clear everyone completely.
      const txs = calculateSettlements(balances);
      const net = new Map(balances.map((b) => [b.participantId, b.amount]));
      for (const t of txs) {
        net.set(t.fromId, (net.get(t.fromId) ?? 0) + t.amount);
        net.set(t.toId, (net.get(t.toId) ?? 0) - t.amount);
      }
      for (const r of net.values()) expect(Math.abs(r)).toBeLessThan(0.01);
    }
  });
});
