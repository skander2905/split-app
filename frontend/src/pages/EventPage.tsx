import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvent';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Add Expense Dialog ───────────────────────────────────────────────────────

interface AddExpenseDialogProps {
  slug: string;
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
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select all participants when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(participants.map((p) => p.id));
      setTitle('');
      setAmount('');
      setPaidById('');
      setError(null);
    }
  }, [open, participants]);

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!title.trim()) return setError('Title is required.');
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Enter a valid amount.');
    if (!paidById) return setError('Select who paid.');
    if (selectedIds.length === 0) return setError('Select at least one participant.');

    setLoading(true);
    setError(null);

    try {
      await onAdd({
        title: title.trim(),
        amount: parsedAmount,
        paidById,
        participantIds: selectedIds,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = participants.length < 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled} title={isDisabled ? 'Add at least 2 participants first' : undefined}>
          <Plus className="h-4 w-4 mr-2" />
          Add expense
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Record a shared expense and split it equally.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title */}
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

          {/* Amount */}
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

          {/* Paid by */}
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

          {/* Split between */}
          <div className="space-y-2">
            <Label>Split between</Label>
            <div className="rounded-md border p-3 space-y-2.5">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`split-${p.id}`}
                    checked={selectedIds.includes(p.id)}
                    onCheckedChange={() => toggleParticipant(p.id)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={`split-${p.id}`}
                    className="text-sm cursor-pointer select-none flex-1"
                  >
                    {p.name}
                  </label>
                  {selectedIds.includes(p.id) && selectedIds.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {amount && !isNaN(parseFloat(amount))
                        ? formatCurrency(parseFloat(amount) / selectedIds.length)
                        : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { event, settlement, loading, error, addParticipant, addExpense } = useEvent(slug!);

  const [newName, setNewName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // ── Loading / error states ──
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
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <SplitSquareVertical className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-base leading-tight truncate">{event.name}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''} ·{' '}
                {formatCurrency(totalSpent)} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </>
              )}
            </Button>

            <AddExpenseDialog
              slug={slug!}
              participants={event.participants}
              onAdd={addExpense}
            />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Users,
              label: 'Participants',
              value: event.participants.length,
            },
            {
              icon: Receipt,
              label: 'Expenses',
              value: event.expenses.length,
            },
            {
              icon: TrendingUp,
              label: 'Total spent',
              value: formatCurrency(totalSpent),
            },
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

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Participants ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
              </CardTitle>
              <CardDescription>Add everyone who's sharing costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* List */}
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

              {/* Add form */}
              <form onSubmit={handleAddParticipant} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={addingParticipant}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingParticipant || !newName.trim()}
                >
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

          {/* ── Expenses ── */}
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{expense.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Paid by{' '}
                            <span className="font-medium text-foreground">
                              {expense.paidBy.name}
                            </span>
                            {expense.splits.length > 0 && (
                              <>
                                {' '}· split {expense.splits.length} way
                                {expense.splits.length !== 1 ? 's' : ''}
                              </>
                            )}
                          </p>
                        </div>
                        <span className="font-semibold text-sm tabular-nums shrink-0">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Settlements ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Settlements
            </CardTitle>
            <CardDescription>
              Minimum transactions needed to settle all debts.
            </CardDescription>
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
                {/* Transactions */}
                <ul className="space-y-2">
                  {settlement.transactions.map((tx, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3"
                    >
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

                {/* Per-person balances */}
                {settlement.balances && settlement.balances.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Net balances
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {settlement.balances.map((b) => (
                          <div
                            key={b.participantId}
                            className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2"
                          >
                            <span className="text-sm truncate mr-2">{b.name}</span>
                            <span
                              className={`text-xs font-semibold tabular-nums shrink-0 ${
                                b.amount > 0
                                  ? 'text-green-600'
                                  : b.amount < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {b.amount > 0 ? '+' : ''}
                              {formatCurrency(b.amount)}
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
      </main>
    </div>
  );
}
