import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalUser {
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

interface AuthState {
  user: LocalUser | null;
  onboardingDone: boolean;
  register: (email: string, password: string, displayName: string) => { ok: true } | { ok: false; error: string };
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

function hashPassword(password: string): string {
  let h = 2166136261;
  for (let i = 0; i < password.length; i++) {
    h ^= password.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `local_${(h >>> 0).toString(16)}`;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Include at least one letter and one number.';
  return null;
}

function validateEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address.';
  return null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      onboardingDone: false,

      register: (email, password, displayName) => {
        const emailErr = validateEmail(email);
        if (emailErr) return { ok: false, error: emailErr };
        const passErr = validatePassword(password);
        if (passErr) return { ok: false, error: passErr };
        const name = displayName.trim() || email.trim().split('@')[0];
        set({
          user: {
            email: email.trim().toLowerCase(),
            displayName: name,
            passwordHash: hashPassword(password),
            createdAt: Date.now(),
          },
          onboardingDone: false,
        });
        return { ok: true };
      },

      login: (email, password) => {
        const user = get().user;
        if (!user) return { ok: false, error: 'No account on this device yet. Create one first.' };
        if (user.email !== email.trim().toLowerCase())
          return { ok: false, error: 'Email does not match the account on this device.' };
        if (user.passwordHash !== hashPassword(password)) return { ok: false, error: 'Incorrect password.' };
        return { ok: true };
      },

      logout: () => set({ user: null }),
      completeOnboarding: () => set({ onboardingDone: true }),
      skipOnboarding: () => set({ onboardingDone: true }),
    }),
    { name: 'fb-auth' },
  ),
);
