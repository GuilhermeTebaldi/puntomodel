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
const REMEMBERED_CREDENTIALS_KEY = 'punto_remembered_credentials';

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

type ChangePasswordPayload = {
  userId?: string;
  email?: string;
  currentPassword: string;
  newPassword: string;
};

export type PasswordResetRequest = {
  id: string;
  email: string;
  userId?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  try {
    const response = await apiFetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.error || 'Não foi possível atualizar.' } as const;
    }

    const nextEmail = (payload.email || '').trim().toLowerCase();
    if (nextEmail) {
      const remembered = getRememberedCredentials();
      if (remembered?.email && remembered.email.trim().toLowerCase() === nextEmail) {
        saveRememberedCredentials({
          email: remembered.email,
          password: payload.newPassword,
        });
      }
    }

    return { ok: true, user: data.user as AuthUser } as const;
  } catch {
    return { ok: false, error: 'Servidor indisponível no momento.' } as const;
  }
};

export const requestPasswordReset = async (email: string) => {
  try {
    const response = await apiFetch('/api/password-resets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.error || 'Não foi possível enviar a solicitação de recuperação.' } as const;
    }
    return { ok: true, request: data.request as PasswordResetRequest } as const;
  } catch {
    return { ok: false, error: 'Servidor indisponível no momento.' } as const;
  }
};

export const setCurrentUser = (user: AuthUser | null) => {
  if (!isBrowser()) return;
  if (!user) {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    window.dispatchEvent(new Event('punto_saved_models'));
    return;
  }
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('punto_saved_models'));
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
  window.dispatchEvent(new Event('punto_saved_models'));
};

export type RememberedCredentials = {
  email: string;
  password: string;
};

export const saveRememberedCredentials = (credentials: RememberedCredentials) => {
  if (!isBrowser()) return;
  const email = (credentials.email || '').trim();
  const password = credentials.password ?? '';
  if (!email || !password) return;
  window.localStorage.setItem(REMEMBERED_CREDENTIALS_KEY, JSON.stringify({ email, password }));
};

export const getRememberedCredentials = (): RememberedCredentials | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RememberedCredentials;
    if (parsed?.email && parsed?.password) return parsed;
  } catch {
    // ignore
  }
  return null;
};

export const clearRememberedCredentials = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY);
};

export const savePendingModelProfile = (profile: PendingModelProfile) => {
  if (!isBrowser()) return;
  const { name, email, password } = profile;
  const payload: PendingModelProfile = { name, email };
  if (password) {
    payload.password = password;
  }
  window.localStorage.setItem(PENDING_MODEL_KEY, JSON.stringify(payload));
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
