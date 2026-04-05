import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplitSquareVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const event = await api.events.create(trimmed);
      navigate(`/event/${event.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
          <SplitSquareVertical className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">SplitEase</span>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create a new event</CardTitle>
          <CardDescription>
            Share the link with your group — no sign-up needed.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Event name</Label>
              <Input
                id="event-name"
                placeholder="e.g. Barcelona trip, Office dinner…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating…' : 'Create event'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        No account required · Share via link · Free forever
      </p>
    </div>
  );
}
