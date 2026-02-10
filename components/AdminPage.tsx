import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import Logo from './Logo';
import { useI18n } from '../translations/i18n';

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
  identity?: {
    number?: string;
    documentUrl?: string;
    faceUrl?: string;
    birthDate?: string;
  } | null;
  featured?: boolean;
  createdAt?: string;
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

const AdminPage: React.FC = () => {
  const { t, translateError, locale } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [tab, setTab] = useState<'users' | 'models'>('users');
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AdminModel | null>(null);

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
        setModels(modelsData?.models || []);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? translateError(err.message) : t('errors.loadData'));
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [t, translateError]);

  const handleReset = async () => {
    const confirmed = window.confirm(t('adminPage.confirmReset'));
    if (!confirmed) return;
    setResetting(true);
    try {
      const response = await apiFetch('/api/admin/reset', { method: 'POST' });
      const data = await readJsonSafe<{ error?: string }>(response);
      if (!response.ok) throw new Error(data?.error || t('errors.resetFailed'));
      setUsers([]);
      setModels([]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : t('errors.resetError'));
    } finally {
      setResetting(false);
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
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <button onClick={handleBackToSite} className="text-sm font-bold text-[#e3262e]">
            {t('common.backToSite')}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">{t('adminPage.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-900 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resetting ? t('adminPage.resetting') : t('adminPage.resetDb')}
            </button>
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                tab === 'users' ? 'bg-[#e3262e] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t('adminPage.usersTab')}
            </button>
            <button
              onClick={() => setTab('models')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                tab === 'models' ? 'bg-[#e3262e] text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t('adminPage.modelsTab')}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-white border border-red-100 text-red-500 text-sm font-semibold px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {tab === 'users' ? (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
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
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingUserId === user.id}
                        className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingUserId === user.id ? t('adminPage.deleting') : t('adminPage.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
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
      </main>
    </div>
  );
};

export default AdminPage;
