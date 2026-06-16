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

export interface Payment {
  id: string;
  eventId: string;
  fromId: string;
  toId: string;
  amount: number;
  createdAt: string;
}

export interface Settlement {
  balances: Balance[];
  transactions: Transaction[];
  payments: Payment[];
}

export type HistoryAction = 'ADD' | 'EDIT' | 'DELETE' | 'REMOVE_PARTICIPANT';

export interface ExpenseSnapshot {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  eventId: string;
}

export interface ParticipantSnapshot {
  id: string;
  name: string;
}

export type HistorySnapshot = ExpenseSnapshot | ParticipantSnapshot;

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  expenseId: string | null;
  data: HistorySnapshot | null;
  prevData: HistorySnapshot | null;
  undoneAt: string | null;
  createdAt: string;
}
