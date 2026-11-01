import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/cn';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = mode === 'register' ? register(email, password, name) : login(email, password);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">Forex Backtester</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Trading research workspace</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Build, test and analyse strategies on historical market data — without look-ahead bias.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-overlay">
          <div className="mb-4 flex rounded-md border border-line p-0.5">
            {(['register', 'login'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-medium capitalize',
                  mode === m ? 'bg-overlay text-ink' : 'text-ink-muted',
                )}
              >
                {m === 'register' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
                  placeholder="Optional"
                  autoComplete="nickname"
                />
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              {mode === 'register' && (
                <span className="mt-1 block text-[11px] text-ink-subtle">At least 8 characters, with a letter and a number.</span>
              )}
            </label>

            {error && <p className="text-sm text-bear">{error}</p>}

            <button type="submit" className="h-10 w-full rounded-md bg-accent text-sm font-medium text-accent-ink hover:brightness-110">
              {mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-subtle">
            Accounts on this prototype are stored only on this device. There is no cloud sync yet. Do not reuse a password
            from another service.
          </p>
        </div>
      </div>
    </div>
  );
}
