import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import Logo from './Logo';
import { useI18n } from '../translations/i18n';
import { getTranslationTarget } from '../services/translate';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AdminModel {
  id: string;
  name: string;
  email: string;
  age?: number | null;
  phone?: string;
  bio?: string;
  bioLanguage?: string | null;
  bioHash?: string | null;
  bioTranslations?: Record<
    string,
    string | { text?: string; status?: string; updatedAt?: string; attempts?: number; error?: string }
  >;
  identity?: {
    number?: string;
    documentUrl?: string;
    faceUrl?: string;
    birthDate?: string;
  } | null;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminRegistrationLead {
  id: string;
  name: string;
  phone: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

interface AdminPasswordResetRequest {
  id: string;
  email: string;
  userId?: string | null;
  token?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  tokenSentAt?: string | null;
  resolvedAt?: string | null;
}

const readJsonSafe = async <T,>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const getBioTranslationEntry = (
  value?: string | { text?: string; status?: string; updatedAt?: string; attempts?: number; error?: string } | null
) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return { text: trimmed, status: trimmed ? 'done' : 'pending', updatedAt: null, attempts: 0, error: null };
  }
  if (value && typeof value === 'object') {
    const text = typeof value.text === 'string' ? value.text.trim() : '';
    const status = typeof value.status === 'string' && value.status.trim()
      ? value.status.trim()
      : text
      ? 'done'
      : 'pending';
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    const attempts = Number.isFinite(value.attempts) ? Math.max(0, Number(value.attempts)) : 0;
    const error = typeof value.error === 'string' ? value.error : null;
    return { text, status, updatedAt, attempts, error };
  }
  return { text: '', status: 'pending', updatedAt: null, attempts: 0, error: null };
};

const AUTO_REFRESH_MS = 8000;

const toTimeMs = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortPasswordResetRequests = (items: AdminPasswordResetRequest[]) => {
  return [...items].sort((left, right) => {
    const leftResolved = left.status === 'resolved';
    const rightResolved = right.status === 'resolved';
    if (leftResolved !== rightResolved) {
      return leftResolved ? 1 : -1;
    }

    const leftTime = leftResolved
      ? toTimeMs(left.resolvedAt) || toTimeMs(left.updatedAt) || toTimeMs(left.createdAt)
      : toTimeMs(left.createdAt) || toTimeMs(left.updatedAt);
    const rightTime = rightResolved
      ? toTimeMs(right.resolvedAt) || toTimeMs(right.updatedAt) || toTimeMs(right.createdAt)
      : toTimeMs(right.createdAt) || toTimeMs(right.updatedAt);

    return rightTime - leftTime;
  });
};

const AdminPage: React.FC = () => {
  const { t, translateError, locale, languageOptions } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [registrationLeads, setRegistrationLeads] = useState<AdminRegistrationLead[]>([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState<AdminPasswordResetRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'models' | 'translations' | 'registrations' | 'passwordResets'>('users');
  const [error, setError] = useState('');
  const [passwordResetLoadError, setPasswordResetLoadError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingPasswordUser, setEditingPasswordUser] = useState<AdminUser | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirmInput, setPasswordConfirmInput] = useState('');
  const [updatingPasswordUserId, setUpdatingPasswordUserId] = useState<string | null>(null);
  const [sendingPasswordResetTokenId, setSendingPasswordResetTokenId] = useState<string | null>(null);
  const [copiedPasswordResetId, setCopiedPasswordResetId] = useState<string | null>(null);
  const [resolvingPasswordResetId, setResolvingPasswordResetId] = useState<string | null>(null);
  const [passwordEditError, setPasswordEditError] = useState('');
  const [passwordEditSuccess, setPasswordEditSuccess] = useState('');
  const [selectedModel, setSelectedModel] = useState<AdminModel | null>(null);
  const [selectedTranslationModel, setSelectedTranslationModel] = useState<AdminModel | null>(null);
  const [refreshingTranslations, setRefreshingTranslations] = useState(false);
  const [translatingModelId, setTranslatingModelId] = useState<string | null>(null);
  const [logoPulse, setLogoPulse] = useState(false);
  const logoPulseTimeout = useRef<number | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasLoaded = useRef(false);
  const translationTargets = useMemo(
    () =>
      languageOptions.map((option) => ({
        code: option.code,
        label: option.label,
        target: getTranslationTarget(option.code),
      })),
    [languageOptions]
  );

  const tabOptions = useMemo(
    () => [
      { id: 'users' as const, label: t('adminPage.usersTab') },
      { id: 'models' as const, label: t('adminPage.modelsTab') },
      { id: 'registrations' as const, label: t('adminPage.registrationsTab') },
      { id: 'passwordResets' as const, label: t('adminPage.passwordResetsTab') },
      { id: 'translations' as const, label: t('adminPage.translationsTab') },
    ],
    [t]
  );

  const activeTabLabel = tabOptions.find((option) => option.id === tab)?.label ?? '';

  const syncModelsState = (nextModels: AdminModel[]) => {
    setModels(nextModels);
    setSelectedModel((prev) => (prev ? nextModels.find((item) => item.id === prev.id) || null : null));
    setSelectedTranslationModel((prev) =>
      prev ? nextModels.find((item) => item.id === prev.id) || null : null
    );
  };

  const triggerLogoPulse = () => {
    setLogoPulse(true);
    if (logoPulseTimeout.current) {
      window.clearTimeout(logoPulseTimeout.current);
    }
    logoPulseTimeout.current = window.setTimeout(() => {
      setLogoPulse(false);
    }, 900);
  };

  const loadPasswordResets = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/admin/password-resets?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await readJsonSafe<{ requests?: AdminPasswordResetRequest[]; error?: string }>(response);
      if (!response.ok) {
        setPasswordResetLoadError(translateError(data?.error || t('errors.loadData')));
        return false;
      }
      setPasswordResetRequests(sortPasswordResetRequests(data?.requests || []));
      setPasswordResetLoadError('');
      return true;
    } catch {
      setPasswordResetLoadError(t('errors.loadData'));
      return false;
    }
  }, [t, translateError]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [usersRes, modelsRes] = await Promise.all([
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/models'),
        ]);
        const usersData = await readJsonSafe<{ users?: AdminUser[]; error?: string }>(usersRes);
        const modelsData = await readJsonSafe<{ models?: AdminModel[]; error?: string }>(modelsRes);

        if (!usersRes.ok) throw new Error(usersData?.error || t('errors.loadUsers'));
        if (!modelsRes.ok) throw new Error(modelsData?.error || t('errors.loadModels'));

        if (!mounted) return;
        setUsers(usersData?.users || []);
        syncModelsState(modelsData?.models || []);
        if (hasLoaded.current) {
          triggerLogoPulse();
        } else {
          hasLoaded.current = true;
        }
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? translateError(err.message) : t('errors.loadData'));
      }

      if (!mounted) return;
      try {
        const registrationsRes = await apiFetch('/api/admin/registrations');
        const registrationsData = await readJsonSafe<{ leads?: AdminRegistrationLead[]; error?: string }>(registrationsRes);
        if (!mounted) return;
        if (registrationsRes.ok) {
          setRegistrationLeads(registrationsData?.leads || []);
        }
        await loadPasswordResets();
      } catch {
        if (!mounted) return;
        await loadPasswordResets();
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [loadPasswordResets, t, translateError]);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      if (!active || typeof document !== 'undefined' && document.hidden) return;
      try {
        const [usersRes, modelsRes] = await Promise.all([
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/models'),
        ]);
        const usersData = await readJsonSafe<{ users?: AdminUser[] }>(usersRes);
        const modelsData = await readJsonSafe<{ models?: AdminModel[] }>(modelsRes);

        if (!active) return;
        let didUpdate = false;
        if (usersRes.ok && usersData?.users) {
          setUsers(usersData.users);
          didUpdate = true;
        }
        if (modelsRes.ok && modelsData?.models) {
          syncModelsState(modelsData.models);
          didUpdate = true;
        }
        if (didUpdate) triggerLogoPulse();
      } catch {
        // silent refresh
      }

      if (!active) return;
      try {
        const registrationsRes = await apiFetch('/api/admin/registrations');
        const registrationsData = await readJsonSafe<{ leads?: AdminRegistrationLead[] }>(registrationsRes);
        if (!active) return;
        if (registrationsRes.ok && registrationsData?.leads) {
          setRegistrationLeads(registrationsData.leads);
          triggerLogoPulse();
        }
        const loadedPasswordResets = await loadPasswordResets();
        if (!active) return;
        if (loadedPasswordResets) {
          triggerLogoPulse();
        }
      } catch {
        if (!active) return;
        await loadPasswordResets();
      }
    };

    const interval = setInterval(tick, AUTO_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadPasswordResets]);

  useEffect(() => {
    return () => {
      if (logoPulseTimeout.current) {
        window.clearTimeout(logoPulseTimeout.current);
      }
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const updateModelInState = (updated: AdminModel) => {
    setModels((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedTranslationModel((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const refreshModels = async () => {
    setRefreshingTranslations(true);
    setError('');
    try {
      const modelsRes = await apiFetch('/api/admin/models');
      const modelsData = await readJsonSafe<{ models?: AdminModel[]; error?: string }>(modelsRes);
      if (!modelsRes.ok) throw new Error(modelsData?.error || t('errors.loadModels'));
      setModels(modelsData?.models || []);
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.loadData'));
    } finally {
      setRefreshingTranslations(false);
    }
  };

  const handleTranslateNow = async (model: AdminModel, force = false) => {
    setTranslatingModelId(model.id);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/models/${model.id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await readJsonSafe<{ model?: AdminModel; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.updateFailed'));
      if (data?.model) {
        updateModelInState(data.model);
      }
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
    } finally {
      setTranslatingModelId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `${t('adminPage.confirmDeleteUser')}\n${user.name} (${user.email})`
    );
    if (!confirmed) return;
    setDeletingUserId(user.id);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await readJsonSafe<{ error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.deleteFailed'));
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.deleteFailed'));
    } finally {
      setDeletingUserId(null);
    }
  };

  const openPasswordEditor = (user: AdminUser) => {
    setEditingPasswordUser(user);
    setPasswordInput('');
    setPasswordConfirmInput('');
    setPasswordEditError('');
    setPasswordEditSuccess('');
  };

  const closePasswordEditor = () => {
    setEditingPasswordUser(null);
    setPasswordInput('');
    setPasswordConfirmInput('');
    setPasswordEditError('');
    setPasswordEditSuccess('');
  };

  const handleUpdateUserPassword = async () => {
    if (!editingPasswordUser) return;
    const newPassword = passwordInput.trim();
    const confirmPassword = passwordConfirmInput.trim();

    if (!newPassword || !confirmPassword) {
      setPasswordEditError(t('errors.passwordRequired'));
      setPasswordEditSuccess('');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordEditError(t('errors.passwordTooShort'));
      setPasswordEditSuccess('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordEditError(t('errors.passwordMismatch'));
      setPasswordEditSuccess('');
      return;
    }

    setUpdatingPasswordUserId(editingPasswordUser.id);
    setPasswordEditError('');
    setPasswordEditSuccess('');
    try {
      const response = await apiFetch(`/api/admin/users/${editingPasswordUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await readJsonSafe<{ error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.updateFailed'));
      setPasswordEditSuccess(t('adminPage.passwordUpdated'));
      setPasswordInput('');
      setPasswordConfirmInput('');
    } catch (err) {
      setPasswordEditError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
    } finally {
      setUpdatingPasswordUserId(null);
    }
  };

  const findUserForPasswordReset = (request: AdminPasswordResetRequest) => {
    if (request.userId) {
      const byId = users.find((user) => user.id === request.userId);
      if (byId) return byId;
    }
    const targetEmail = request.email.trim().toLowerCase();
    return users.find((user) => user.email.trim().toLowerCase() === targetEmail) || null;
  };

  const findModelForPasswordReset = (request: AdminPasswordResetRequest) => {
    const targetEmail = request.email.trim().toLowerCase();
    return models.find((model) => model.email.trim().toLowerCase() === targetEmail) || null;
  };

  const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    if (typeof document === 'undefined') throw new Error('clipboard_unavailable');
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error('copy_failed');
    }
  };

  const buildPasswordResetMessage = (request: AdminPasswordResetRequest, model: AdminModel | null) => {
    const name = (model?.name || t('adminPage.passwordResetsDefaultName')).trim();
    const token = (request.token || '').trim();
    return t('adminPage.passwordResetsWhatsappMessage', { name, token });
  };

  const normalizePhoneForWhatsApp = (value?: string | null) => (value || '').replace(/\D/g, '');

  const handleOpenPasswordResetWhatsApp = (request: AdminPasswordResetRequest) => {
    const linkedModel = findModelForPasswordReset(request);
    const phoneDigits = normalizePhoneForWhatsApp(linkedModel?.phone);
    if (!phoneDigits) {
      setError(t('adminPage.passwordResetsPhoneMissing'));
      return;
    }
    const message = buildPasswordResetMessage(request, linkedModel);
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPasswordResetMessage = async (request: AdminPasswordResetRequest) => {
    const token = (request.token || '').trim();
    if (!token) {
      setError(t('adminPage.passwordResetsMissingToken'));
      return;
    }
    const linkedModel = findModelForPasswordReset(request);
    setError('');
    try {
      const message = buildPasswordResetMessage(request, linkedModel);
      await copyTextToClipboard(message);
      setCopiedPasswordResetId(request.id);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopiedPasswordResetId((prev) => (prev === request.id ? null : prev));
      }, 2200);
    } catch {
      setError(t('adminPage.passwordResetsCopyFailed'));
    }
  };

  const handleSendPasswordResetToken = async (request: AdminPasswordResetRequest) => {
    const alreadySent = request.status === 'token_sent' || Boolean(request.tokenSentAt);
    if (request.status === 'resolved' || alreadySent) return;
    setSendingPasswordResetTokenId(request.id);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/password-resets/${request.id}/token-sent`, {
        method: 'PATCH',
      });
      const data = await readJsonSafe<{ request?: AdminPasswordResetRequest; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.updateFailed'));
      if (data?.request) {
        setPasswordResetRequests((prev) =>
          sortPasswordResetRequests(prev.map((item) => (item.id === data.request?.id ? data.request : item)))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
    } finally {
      setSendingPasswordResetTokenId(null);
    }
  };

  const handleResolvePasswordReset = async (request: AdminPasswordResetRequest) => {
    if (request.status === 'resolved') return;
    setResolvingPasswordResetId(request.id);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/password-resets/${request.id}/resolve`, {
        method: 'PATCH',
      });
      const data = await readJsonSafe<{ request?: AdminPasswordResetRequest; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.updateFailed'));
      if (data?.request) {
        setPasswordResetRequests((prev) =>
          sortPasswordResetRequests(prev.map((item) => (item.id === data.request?.id ? data.request : item)))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.updateFailed'));
    } finally {
      setResolvingPasswordResetId(null);
    }
  };

  const handleDeleteModel = async (model: AdminModel) => {
    const confirmed = window.confirm(
      `${t('adminPage.confirmDeleteModel')}\n${model.name} (${model.email})`
    );
    if (!confirmed) return;
    setDeletingModelId(model.id);
    setError('');
    try {
      const response = await apiFetch(`/api/admin/models/${model.id}`, { method: 'DELETE' });
      const data = await readJsonSafe<{ error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.deleteFailed'));
      setModels((prev) => prev.filter((item) => item.id !== model.id));
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.deleteFailed'));
    } finally {
      setDeletingModelId(null);
    }
  };

  const handleBackToSite = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const closeModelDetails = () => setSelectedModel(null);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale);
  };

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return null;
    const isoMatch = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoMatch) return null;
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age -= 1;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className={logoPulse ? 'admin-logo-pulse' : ''}>
            <Logo />
          </div>
          <button onClick={handleBackToSite} className="text-sm font-bold text-[#e3262e]">
            {t('common.backToSite')}
          </button>
        </div>
      </header>

      <main className="w-full px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">{t('adminPage.title')}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{activeTabLabel}</span>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={t('adminPage.menuLabel')}
                aria-expanded={menuOpen}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white flex flex-col items-center justify-center gap-1 text-gray-700 hover:border-gray-300"
              >
                <span className="block h-0.5 w-5 bg-gray-700" />
                <span className="block h-0.5 w-5 bg-gray-700" />
                <span className="block h-0.5 w-5 bg-gray-700" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-lg p-2 z-20">
                  {tabOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setTab(option.id);
                        setMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold ${
                        tab === option.id ? 'bg-[#e3262e] text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-white border border-red-100 text-red-500 text-sm font-semibold px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {tab === 'users' ? (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">{t('adminPage.table.name')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.email')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.role')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.createdAt')}</th>
                  <th className="text-right px-4 py-3">{t('adminPage.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-400 text-center">{t('adminPage.emptyUsers')}</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-gray-600">{user.role}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString(locale) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openPasswordEditor(user)}
                          className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800"
                        >
                          {t('adminPage.passwordEdit')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {deletingUserId === user.id ? t('adminPage.deleting') : t('adminPage.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'models' ? (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">{t('adminPage.table.name')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.email')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.age')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.phone')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.identityNumber')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.identityDoc')}</th>
                  <th className="text-left px-4 py-3">{t('adminPage.table.featured')}</th>
                  <th className="text-right px-4 py-3">{t('adminPage.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-gray-400 text-center">{t('adminPage.emptyModels')}</td>
                  </tr>
                )}
                {models.map((model) => (
                  <tr key={model.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{model.name}</td>
                    <td className="px-4 py-3 text-gray-600">{model.email}</td>
                    <td className="px-4 py-3 text-gray-600">{model.age ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{model.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{model.identity?.number || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {model.identity?.documentUrl ? (
                        <a
                          href={model.identity.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#e3262e]"
                        >
                          <img
                            src={model.identity.documentUrl}
                            alt={t('adminPage.identityPreview')}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          />
                          {t('adminPage.viewDocument')}
                        </a>
                      ) : (
                        <span className="text-gray-400">{t('adminPage.identityMissing')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{model.featured ? t('adminPage.featuredYes') : t('adminPage.featuredNo')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setSelectedModel(model)}
                          className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800"
                        >
                          {t('adminPage.viewDetails')}
                        </button>
                      <button
                        onClick={() => handleDeleteModel(model)}
                        disabled={deletingModelId === model.id}
                        className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingModelId === model.id ? t('adminPage.deleting') : t('adminPage.delete')}
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'passwordResets' ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">{t('adminPage.passwordResetsTitle')}</h2>
              <p className="text-xs text-gray-500">{t('adminPage.passwordResetsHint')}</p>
            </div>
            {passwordResetLoadError && (
              <p className="text-xs font-semibold text-red-500">{passwordResetLoadError}</p>
            )}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">{t('adminPage.table.email')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.token')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.phone')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.status')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.createdAt')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.sentAt')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.resolvedAt')}</th>
                    <th className="text-right px-4 py-3">{t('adminPage.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {passwordResetRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-gray-400 text-center">
                        {t('adminPage.passwordResetsEmpty')}
                      </td>
                    </tr>
                  )}
                  {passwordResetRequests.map((request) => {
                    const isResolved = request.status === 'resolved';
                    const tokenSent = request.status === 'token_sent' || Boolean(request.tokenSentAt);
                    const linkedUser = findUserForPasswordReset(request);
                    const linkedModel = findModelForPasswordReset(request);
                    return (
                      <tr key={request.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-700 font-semibold">{request.email}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono">{request.token || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{linkedModel?.phone || '-'}</td>
                        <td className="px-4 py-3">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                              ✓ {t('adminPage.statusComplete')}
                            </span>
                          ) : tokenSent ? (
                            <span className="inline-flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-widest">
                              • {t('adminPage.statusTokenSent')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest">
                              ✕ {t('adminPage.statusPending')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {request.createdAt ? new Date(request.createdAt).toLocaleString(locale) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {request.tokenSentAt ? new Date(request.tokenSentAt).toLocaleString(locale) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {request.resolvedAt ? new Date(request.resolvedAt).toLocaleString(locale) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {linkedUser && (
                              <button
                                onClick={() => openPasswordEditor(linkedUser)}
                                className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800"
                              >
                                {t('adminPage.passwordEdit')}
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenPasswordResetWhatsApp(request)}
                              disabled={!linkedModel?.phone || !request.token}
                              className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {t('adminPage.passwordResetsOpenWhatsapp')}
                            </button>
                            <button
                              onClick={() => handleCopyPasswordResetMessage(request)}
                              disabled={!request.token}
                              className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {copiedPasswordResetId === request.id
                                ? t('adminPage.passwordResetsCopied')
                                : t('adminPage.passwordResetsCopyMessage')}
                            </button>
                            {!isResolved && (
                              <button
                                onClick={() => handleSendPasswordResetToken(request)}
                                disabled={tokenSent || sendingPasswordResetTokenId === request.id}
                                className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {sendingPasswordResetTokenId === request.id
                                  ? t('common.saving')
                                  : tokenSent
                                  ? t('adminPage.passwordResetsSent')
                                  : t('adminPage.passwordResetsSendToken')}
                              </button>
                            )}
                            {!isResolved && (
                              <button
                                onClick={() => handleResolvePasswordReset(request)}
                                disabled={resolvingPasswordResetId === request.id}
                                className="text-xs font-bold uppercase tracking-widest text-[#e3262e] hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {resolvingPasswordResetId === request.id
                                  ? t('common.saving')
                                  : t('adminPage.passwordResetsResolve')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'registrations' ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">{t('adminPage.registrationsTitle')}</h2>
              <p className="text-xs text-gray-500">{t('adminPage.registrationsHint')}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">{t('adminPage.table.name')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.phone')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.status')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.createdAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationLeads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-gray-400 text-center">
                        {t('adminPage.registrationsEmpty')}
                      </td>
                    </tr>
                  )}
                  {registrationLeads.map((lead) => {
                    const isCompleted = Boolean(lead.completedAt) || lead.status === 'completed';
                    return (
                      <tr key={lead.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-semibold text-gray-800">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                        <td className="px-4 py-3">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                              ✓ {t('adminPage.statusComplete')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest">
                              ✕ {t('adminPage.statusPending')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleString(locale) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">{t('adminPage.translationsTitle')}</h2>
                <p className="text-xs text-gray-500">{t('adminPage.translationsHint')}</p>
              </div>
              <button
                onClick={refreshModels}
                disabled={refreshingTranslations}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-gray-500 border border-gray-200 disabled:opacity-60"
              >
                {refreshingTranslations ? t('adminPage.translationsRefreshing') : t('adminPage.translationsRefresh')}
              </button>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">{t('adminPage.table.name')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.table.email')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.translationsOriginalLanguage')}</th>
                    <th className="text-left px-4 py-3">{t('adminPage.translationsStatus')}</th>
                    <th className="text-right px-4 py-3">{t('adminPage.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {models.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-gray-400 text-center">{t('adminPage.translationsEmpty')}</td>
                    </tr>
                  )}
                  {models.map((model) => (
                    <tr key={`translation-${model.id}`} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold text-gray-800">{model.name}</td>
                      <td className="px-4 py-3 text-gray-600">{model.email}</td>
                      <td className="px-4 py-3 text-gray-600">{model.bioLanguage || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {translationTargets.map((option) => {
                            const entry = getBioTranslationEntry(model.bioTranslations?.[option.target]);
                            const status = entry.status;
                            const ready = status === 'done';
                            const failed = status === 'failed';
                            const processing = status === 'processing';
                            return (
                              <span
                                key={`${model.id}-${option.target}`}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${
                                  ready
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : failed
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : processing
                                    ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-400'
                                }`}
                                title={`${option.label} · ${t(`adminPage.translationStatus.${status}`)}`}
                              >
                                <img
                                  src={`https://flagcdn.com/w20/${option.code}.png`}
                                  alt={option.code.toUpperCase()}
                                  className="w-4 h-3 rounded-[2px]"
                                />
                                {ready ? '✓' : failed ? '!' : processing ? '…' : '…'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedTranslationModel(model)}
                          className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-gray-800"
                        >
                          {t('adminPage.translationsView')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {editingPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closePasswordEditor}
            />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('adminPage.passwordModalTitle')}</p>
                  <h2 className="text-xl font-black text-gray-900">{editingPasswordUser.name}</h2>
                  <p className="text-sm text-gray-500">{editingPasswordUser.email}</p>
                </div>
                <button
                  onClick={closePasswordEditor}
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="px-6 py-6 space-y-4">
                <p className="text-xs text-gray-500">{t('adminPage.passwordModalHint')}</p>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    {t('adminPage.newPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    {t('adminPage.confirmPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    value={passwordConfirmInput}
                    onChange={(event) => setPasswordConfirmInput(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>
                {passwordEditError && (
                  <p className="text-xs font-semibold text-red-500">{passwordEditError}</p>
                )}
                {passwordEditSuccess && (
                  <p className="text-xs font-semibold text-emerald-600">{passwordEditSuccess}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateUserPassword}
                    disabled={updatingPasswordUserId === editingPasswordUser.id}
                    className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                  >
                    {updatingPasswordUserId === editingPasswordUser.id ? t('common.saving') : t('common.save')}
                  </button>
                  <button
                    onClick={closePasswordEditor}
                    className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModelDetails}
            />
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('adminPage.documentsTitle')}</p>
                  <h2 className="text-xl font-black text-gray-900">{selectedModel.name}</h2>
                  <p className="text-sm text-gray-500">{selectedModel.email}</p>
                </div>
                <button
                  onClick={closeModelDetails}
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                >
                  {t('common.close')}
                </button>
              </div>

              <div className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.table.phone')}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedModel.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.table.age')}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedModel.age ?? calculateAge(selectedModel.identity?.birthDate) ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.table.identityNumber')}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedModel.identity?.number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.identityBirthDate')}</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(selectedModel.identity?.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.table.createdAt')}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedModel.createdAt ? new Date(selectedModel.createdAt).toLocaleString(locale) : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                      {t('adminPage.identityPreview')}
                    </p>
                    {selectedModel.identity?.documentUrl ? (
                      <div className="space-y-3">
                        <img
                          src={selectedModel.identity.documentUrl}
                          alt={t('adminPage.identityPreview')}
                          className="w-full h-48 object-cover rounded-2xl border border-gray-100"
                        />
                        <a
                          href={selectedModel.identity.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#e3262e]"
                        >
                          {t('adminPage.viewDocument')}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">{t('adminPage.identityMissing')}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                      {t('adminPage.facePhoto')}
                    </p>
                    {selectedModel.identity?.faceUrl ? (
                      <div className="space-y-3">
                        <img
                          src={selectedModel.identity.faceUrl}
                          alt={t('adminPage.facePhoto')}
                          className="w-full h-48 object-cover rounded-2xl border border-gray-100"
                        />
                        <a
                          href={selectedModel.identity.faceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#e3262e]"
                        >
                          {t('adminPage.viewDocument')}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">{t('adminPage.identityMissing')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedTranslationModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSelectedTranslationModel(null)}
            />
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('adminPage.translationsTitle')}</p>
                  <h2 className="text-xl font-black text-gray-900">{selectedTranslationModel.name}</h2>
                  <p className="text-sm text-gray-500">{selectedTranslationModel.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTranslateNow(selectedTranslationModel)}
                    disabled={translatingModelId === selectedTranslationModel.id}
                    className="px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#e3262e] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {translatingModelId === selectedTranslationModel.id
                      ? t('adminPage.translationsTriggering')
                      : t('adminPage.translationsTrigger')}
                  </button>
                  <button
                    onClick={() => setSelectedTranslationModel(null)}
                    className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.translationsOriginalLanguage')}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedTranslationModel.bioLanguage || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('adminPage.translationsUpdated')}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedTranslationModel.updatedAt ? new Date(selectedTranslationModel.updatedAt).toLocaleString(locale) : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t('adminPage.translationsOriginalText')}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedTranslationModel.bio || '-'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {translationTargets.map((option) => {
                    const entry = getBioTranslationEntry(selectedTranslationModel.bioTranslations?.[option.target]);
                    return (
                      <div key={`translation-detail-${option.target}`} className="border border-gray-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={`https://flagcdn.com/w20/${option.code}.png`}
                            alt={option.code.toUpperCase()}
                            className="w-5 h-4 rounded-[2px]"
                          />
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{option.label}</p>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            {t(`adminPage.translationStatus.${entry.status}`)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {t('adminPage.translationsAttempts', { count: entry.attempts })} ·{' '}
                          {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString(locale) : '-'}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {entry.text || t('adminPage.translationsEmptyText')}
                        </p>
                        {entry.error && (
                          <p className="text-xs text-red-500 mt-2">{entry.error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
