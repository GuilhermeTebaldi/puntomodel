import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import Logo from './Logo';
import { changePassword, requestPasswordReset } from '../services/auth';
import { useI18n } from '../translations/i18n';

interface PasswordRecoveryPageProps {
  initialEmail?: string;
  currentUserId?: string;
  currentUserEmail?: string;
  onBackToSite: () => void;
  onOpenLogin: () => void;
}

const PasswordRecoveryPage: React.FC<PasswordRecoveryPageProps> = ({
  initialEmail,
  currentUserId,
  currentUserEmail,
  onBackToSite,
  onOpenLogin,
}) => {
  const { t, translateError } = useI18n();
  const emailSeed = (currentUserEmail || initialEmail || '').trim();
  const [requestEmail, setRequestEmail] = useState(emailSeed);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestMessageType, setRequestMessageType] = useState<'success' | 'error' | null>(null);

  const [changeEmail, setChangeEmail] = useState(emailSeed);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeMessage, setChangeMessage] = useState('');
  const [changeMessageType, setChangeMessageType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const nextSeed = (currentUserEmail || initialEmail || '').trim();
    if (!nextSeed) return;
    setRequestEmail((prev) => prev || nextSeed);
    setChangeEmail((prev) => prev || nextSeed);
  }, [currentUserEmail, initialEmail]);

  const isEmailValid = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const handleSendRequest = async () => {
    setRequestMessage('');
    setRequestMessageType(null);
    const email = requestEmail.trim();
    if (!isEmailValid(email)) {
      setRequestMessage(t('errors.emailRequired'));
      setRequestMessageType('error');
      return;
    }

    setRequesting(true);
    const result = await requestPasswordReset(email);
    setRequesting(false);

    if (!result.ok) {
      setRequestMessage(translateError(result.error));
      setRequestMessageType('error');
      return;
    }

    setRequestMessage(t('passwordRecovery.requestSuccess'));
    setRequestMessageType('success');
  };

  const handleChangePassword = async () => {
    setChangeMessage('');
    setChangeMessageType(null);
    const email = changeEmail.trim();
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!isEmailValid(email)) {
      setChangeMessage(t('errors.emailRequired'));
      setChangeMessageType('error');
      return;
    }

    if (!current || !next || !confirm) {
      setChangeMessage(t('errors.passwordRequired'));
      setChangeMessageType('error');
      return;
    }

    if (next.length < 6) {
      setChangeMessage(t('errors.passwordTooShort'));
      setChangeMessageType('error');
      return;
    }

    if (next !== confirm) {
      setChangeMessage(t('errors.passwordMismatch'));
      setChangeMessageType('error');
      return;
    }

    setChangingPassword(true);
    const result = await changePassword({
      userId: currentUserId,
      email,
      currentPassword: current,
      newPassword: next,
    });
    setChangingPassword(false);

    if (!result.ok) {
      setChangeMessage(translateError(result.error));
      setChangeMessageType('error');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangeMessage(t('passwordRecovery.changeSuccess'));
    setChangeMessageType('success');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <button onClick={onBackToSite} className="text-sm font-bold text-[#e3262e]">
            {t('common.backToSite')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">{t('passwordRecovery.title')}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('passwordRecovery.subtitle')}</p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#e3262e] hover:underline"
          >
            <ArrowLeft size={14} />
            {t('passwordRecovery.backToLogin')}
          </button>
        </section>

        <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-[#e3262e]" />
            <h2 className="text-lg font-black text-gray-900">{t('passwordRecovery.requestTitle')}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">{t('passwordRecovery.requestHint')}</p>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
            {t('login.emailLabel')}
          </label>
          <input
            type="email"
            value={requestEmail}
            onChange={(event) => setRequestEmail(event.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
            placeholder={t('login.emailPlaceholder')}
          />
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={requesting}
              className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
            >
              {requesting ? t('common.sending') : t('passwordRecovery.requestButton')}
            </button>
          </div>
          {requestMessage && (
            <p className={`mt-3 text-xs font-semibold ${requestMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {requestMessage}
            </p>
          )}
        </section>

        <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={16} className="text-[#e3262e]" />
            <h2 className="text-lg font-black text-gray-900">{t('passwordRecovery.changeTitle')}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">{t('passwordRecovery.changeHint')}</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {t('login.emailLabel')}
              </label>
              <input
                type="email"
                value={changeEmail}
                onChange={(event) => setChangeEmail(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {t('passwordRecovery.currentPasswordLabel')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {t('passwordRecovery.newPasswordLabel')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {t('passwordRecovery.confirmPasswordLabel')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
            >
              {changingPassword ? t('common.saving') : t('passwordRecovery.changeButton')}
            </button>
          </div>
          {changeMessage && (
            <p className={`mt-3 text-xs font-semibold ${changeMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {changeMessage}
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default PasswordRecoveryPage;
