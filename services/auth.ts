import { apiFetch } from './api';

export type UserRole = 'client' | 'model' | 'admin';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface PendingModelProfile {
  name: string;
  email: string;
  password?: string;
}

const PENDING_MODEL_KEY = 'punto_pending_model';
const CURRENT_USER_KEY = 'punto_current_user';

const isBrowser = () => typeof window !== 'undefined';

export const registerUser = async (payload: RegisterPayload) => {
  try {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.error || 'Não foi possível cadastrar.' } as const;
    }

    return { ok: true, user: data.user as AuthUser } as const;
  } catch {
    return { ok: false, error: 'Servidor indisponível no momento.' } as const;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.error || 'Não foi possível autenticar.' } as const;
    }

    return { ok: true, user: data.user as AuthUser } as const;
  } catch {
    return { ok: false, error: 'Servidor indisponível no momento.' } as const;
  }
};

export const setCurrentUser = (user: AuthUser | null) => {
  if (!isBrowser()) return;
  if (!user) {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getCurrentUser = (): AuthUser | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.id && parsed?.email) return parsed;
  } catch {
    // ignore
  }
  return null;
};

export const clearCurrentUser = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
};

export const savePendingModelProfile = (profile: PendingModelProfile) => {
  if (!isBrowser()) return;
  const { name, email } = profile;
  window.localStorage.setItem(PENDING_MODEL_KEY, JSON.stringify({ name, email }));
};

export const getPendingModelProfile = (): PendingModelProfile | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(PENDING_MODEL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingModelProfile;
    if (parsed?.name && parsed?.email) return parsed;
  } catch {
    // ignore
  }
  return null;
};

export const clearPendingModelProfile = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PENDING_MODEL_KEY);
};
