import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  SplitSquareVertical,
  Plus,
  Copy,
  Check,
  ArrowRight,
  Users,
  Receipt,
  TrendingUp,
  Loader2,
  Pencil,
  Trash2,
  Undo2,
  Redo2,
  Clock,
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvent';
import { formatCurrency } from '@/lib/utils';
import type { Expense, HistoryEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Expense Form (shared by Add + Edit dialogs) ──────────────────────────────

interface ExpenseFormProps {
  participants: { id: string; name: string }[];
  initial?: { title: string; amount: string; paidById: string; selectedIds: string[] };
  loading: boolean;
  error: string | null;
  onSubmit: (data: {
    title: string;
    amount: string;
    paidById: string;
    selectedIds: string[];
  }) => void;
  submitLabel: string;
}

function ExpenseForm({
  participants,
  initial,
  loading,
  error,
  onSubmit,
  submitLabel,
}: ExpenseFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [paidById, setPaidById] = useState(initial?.paidById ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initial?.selectedIds ?? participants.map((p) => p.id),
  );

  // Sync if initial changes (e.g. dialog re-opens with different expense)
  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setAmount(initial.amount);
      setPaidById(initial.paidById);
      setSelectedIds(initial.selectedIds);
    }
  }, [initial?.title, initial?.amount, initial?.paidById]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, amount, paidById, selectedIds });
  };

  const perPerson =
    amount && !isNaN(parseFloat(amount)) && selectedIds.length > 0
      ? formatCurrency(parseFloat(amount) / selectedIds.length)
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="exp-title">Description</Label>
        <Input
          id="exp-title"
          placeholder="e.g. Dinner, Taxi, Hotel…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-amount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            TND
          </span>
          <Input
            id="exp-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className="pl-12"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Paid by</Label>
        <Select value={paidById} onValueChange={setPaidById} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Select payer" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Split between</Label>
        <div className="rounded-md border p-3 space-y-2.5">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Checkbox
                id={`split-${p.id}`}
                checked={selectedIds.includes(p.id)}
                onCheckedChange={() => toggle(p.id)}
                disabled={loading}
              />
              <label htmlFor={`split-${p.id}`} className="text-sm cursor-pointer select-none flex-1">
                {p.name}
              </label>
              {selectedIds.includes(p.id) && perPerson && (
                <span className="text-xs text-muted-foreground tabular-nums">{perPerson}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {loading ? 'Saving…' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Add Expense Dialog ───────────────────────────────────────────────────────

interface AddExpenseDialogProps {
  participants: { id: string; name: string }[];
  onAdd: (data: {
    title: string;
    amount: number;
    paidById: string;
    participantIds: string[];
  }) => Promise<unknown>;
}

function AddExpenseDialog({ participants, onAdd }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (raw: {
    title: string;
    amount: string;
    paidById: string;
    selectedIds: string[];
  }) => {
    const parsed = parseFloat(raw.amount);
    if (!raw.title.trim()) return setError('Title is required.');
    if (isNaN(parsed) || parsed <= 0) return setError('Enter a valid amount.');
    if (!raw.paidById) return setError('Select who paid.');
    if (raw.selectedIds.length === 0) return setError('Select at least one participant.');

    setLoading(true);
    setError(null);
    try {
      await onAdd({
        title: raw.title.trim(),
        amount: parsed,
        paidById: raw.paidById,
        participantIds: raw.selectedIds,
      });
      setOpen(false);
      setFormKey((k) => k + 1); // reset form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={participants.length < 2}>
          <Plus className="h-4 w-4 mr-2" />
          Add expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Record a shared expense and split it equally.</DialogDescription>
        </DialogHeader>
        <ExpenseForm
          key={formKey}
          participants={participants}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          submitLabel="Add expense"
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Expense Dialog ──────────────────────────────────────────────────────

interface EditExpenseDialogProps {
  expense: Expense;
  participants: { id: string; name: string }[];
  onEdit: (
    expenseId: string,
    data: { title: string; amount: number; paidById: string; participantIds: string[] },
  ) => Promise<unknown>;
}

function EditExpenseDialog({ expense, participants, onEdit }: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = {
    title: expense.title,
    amount: expense.amount.toString(),
    paidById: expense.paidById,
    selectedIds: expense.splits.map((s) => s.participantId),
  };

  const handleSubmit = async (raw: {
    title: string;
    amount: string;
    paidById: string;
    selectedIds: string[];
  }) => {
    const parsed = parseFloat(raw.amount);
    if (!raw.title.trim()) return setError('Title is required.');
    if (isNaN(parsed) || parsed <= 0) return setError('Enter a valid amount.');
    if (!raw.paidById) return setError('Select who paid.');
    if (raw.selectedIds.length === 0) return setError('Select at least one participant.');

    setLoading(true);
    setError(null);
    try {
      await onEdit(expense.id, {
        title: raw.title.trim(),
        amount: parsed,
        paidById: raw.paidById,
        participantIds: raw.selectedIds,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
          <DialogDescription>Update the expense details.</DialogDescription>
        </DialogHeader>
        <ExpenseForm
          key={open ? 'open' : 'closed'}
          participants={participants}
          initial={initial}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── History Log ──────────────────────────────────────────────────────────────

function HistoryLog({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No actions recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((entry) => {
        const isUndone = !!entry.undoneAt;
        const snapshot = entry.data ?? entry.prevData;
        const actionLabel =
          entry.action === 'ADD' ? 'Added' : entry.action === 'EDIT' ? 'Edited' : 'Deleted';
        const actionColor =
          entry.action === 'ADD'
            ? 'text-green-600'
            : entry.action === 'DELETE'
            ? 'text-destructive'
            : 'text-blue-600';

        return (
          <li
            key={entry.id}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm border ${
              isUndone ? 'opacity-40 bg-muted/30' : 'bg-background'
            }`}
          >
            <span className={`font-medium shrink-0 w-14 ${actionColor}`}>{actionLabel}</span>
            <span className={`flex-1 truncate ${isUndone ? 'line-through' : ''}`}>
              {snapshot?.title ?? '—'}
            </span>
            {snapshot && (
              <span className="tabular-nums text-muted-foreground shrink-0">
                {formatCurrency(snapshot.amount)}
              </span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {relativeTime(entry.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    event,
    settlement,
    history,
    canUndo,
    canRedo,
    loading,
    error,
    addParticipant,
    addExpense,
    editExpense,
    deleteExpense,
    undo,
    redo,
  } = useEvent(slug!);

  const [newName, setNewName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [redoLoading, setRedoLoading] = useState(false);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddingParticipant(true);
    setParticipantError(null);
    try {
      await addParticipant(trimmed);
      setNewName('');
    } catch (err) {
      setParticipantError(err instanceof Error ? err.message : 'Failed to add participant.');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUndo = async () => {
    setUndoLoading(true);
    try { await undo(); } finally { setUndoLoading(false); }
  };

  const handleRedo = async () => {
    setRedoLoading(true);
    try { await redo(); } finally { setRedoLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
        <p className="text-lg font-semibold">Event not found</p>
        <p className="text-sm text-muted-foreground">{error ?? 'This link may be invalid.'}</p>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go home
        </Button>
      </div>
    );
  }

  const totalSpent = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  const hasSettlements = (settlement?.transactions?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity" title="Back to home">
              <SplitSquareVertical className="h-4 w-4 text-primary-foreground" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-base leading-tight truncate">{event.name}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}{' '}
                · {formatCurrency(totalSpent)} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Undo / Redo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={!canUndo || undoLoading}
              title="Undo (last expense action)"
            >
              {undoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={!canRedo || redoLoading}
              title="Redo"
            >
              {redoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Redo2 className="h-4 w-4" />
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" />Share</>
              )}
            </Button>

            <AddExpenseDialog participants={event.participants} onAdd={addExpense} />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Participants', value: event.participants.length },
            { icon: Receipt, label: 'Expenses', value: event.expenses.length },
            { icon: TrendingUp, label: 'Total spent', value: formatCurrency(totalSpent) },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="text-center">
              <CardContent className="pt-4 pb-3 px-3">
                <Icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Participants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
              </CardTitle>
              <CardDescription>Add everyone who's sharing costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No participants yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {event.participants.map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-sm py-1 px-3">
                      {p.name}
                    </Badge>
                  ))}
                </div>
              )}
              <Separator />
              <form onSubmit={handleAddParticipant} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={addingParticipant}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={addingParticipant || !newName.trim()}>
                  {addingParticipant ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {participantError && (
                <p className="text-sm text-destructive">{participantError}</p>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Expenses
              </CardTitle>
              <CardDescription>
                {event.expenses.length === 0
                  ? 'No expenses yet — add one above.'
                  : `${event.expenses.length} expense${event.expenses.length !== 1 ? 's' : ''} recorded.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {event.expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No expenses yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {event.expenses.map((expense, idx) => (
                    <li key={expense.id}>
                      {idx > 0 && <Separator className="mb-3" />}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{expense.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Paid by{' '}
                            <span className="font-medium text-foreground">
                              {expense.paidBy.name}
                            </span>
                            {expense.splits.length > 0 && (
                              <> · split {expense.splits.length} way{expense.splits.length !== 1 ? 's' : ''}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-semibold text-sm tabular-nums">
                            {formatCurrency(expense.amount)}
                          </span>
                          {/* Edit */}
                          <EditExpenseDialog
                            expense={expense}
                            participants={event.participants}
                            onEdit={editExpense}
                          />
                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{expense.title}</strong> ({formatCurrency(expense.amount)}) will be removed.
                                  You can undo this with the undo button.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteExpense(expense.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settlements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Settlements
            </CardTitle>
            <CardDescription>Minimum transactions needed to settle all debts.</CardDescription>
          </CardHeader>
          <CardContent>
            {!settlement || event.expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Add expenses to see who owes what.</p>
              </div>
            ) : !hasSettlements ? (
              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                <Check className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium">All settled up! Everyone is even.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {settlement.transactions.map((tx, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold">{tx.from[0].toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-sm">{tx.from}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {tx.to[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-sm flex-1">{tx.to}</span>
                      <span className="font-bold text-sm tabular-nums">
                        {formatCurrency(tx.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                {settlement.balances && settlement.balances.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Net balances
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {settlement.balances.map((b) => (
                          <div key={b.participantId} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2">
                            <span className="text-sm truncate mr-2">{b.name}</span>
                            <span className={`text-xs font-semibold tabular-nums shrink-0 ${
                              b.amount > 0 ? 'text-green-600' : b.amount < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {b.amount > 0 ? '+' : ''}{formatCurrency(b.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Log */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  History
                </CardTitle>
                <CardDescription className="mt-1">
                  Full log of expense actions. Use ↩ ↪ in the header to undo/redo.
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo || undoLoading}
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo || redoLoading}
                >
                  <Redo2 className="h-3.5 w-3.5 mr-1.5" />
                  Redo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <HistoryLog history={history} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
