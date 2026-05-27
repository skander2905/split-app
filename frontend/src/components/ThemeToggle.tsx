import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 sm:h-10 sm:w-10"
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
