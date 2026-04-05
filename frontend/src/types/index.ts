export interface Participant {
  id: string;
  name: string;
  eventId: string;
}

export interface ExpenseSplit {
  id: string;
  amount: number;
  participantId: string;
  participant: Participant;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  paidBy: Participant;
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface EventData {
  id: string;
  name: string;
  slug: string;
  participants: Participant[];
  expenses: Expense[];
}

export interface Balance {
  participantId: string;
  name: string;
  amount: number; // positive = owed money, negative = owes money
}

export interface Transaction {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

export interface Settlement {
  balances: Balance[];
  transactions: Transaction[];
}

export type HistoryAction = 'ADD' | 'EDIT' | 'DELETE';

export interface ExpenseSnapshot {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  eventId: string;
}

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  expenseId: string;
  data: ExpenseSnapshot | null;
  prevData: ExpenseSnapshot | null;
  undoneAt: string | null;
  createdAt: string;
}
