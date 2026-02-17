import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import Logo from './Logo';
import {
  requestPasswordReset,
  resetPasswordWithToken,
  saveRememberedCredentials,
  verifyPasswordResetToken,
} from '../services/auth';
import { useI18n } from '../translations/i18n';

interface PasswordRecoveryPageProps {
  initialEmail?: string;
  currentUserId?: string;
  currentUserEmail?: string;
  onBackToSite: () => void;
  onOpenLogin: () => void;
}

type RecoveryScreen = 'request' | 'token' | 'change';

const PasswordRecoveryPage: React.FC<PasswordRecoveryPageProps> = ({
  initialEmail,
  currentUserEmail,
  onBackToSite,
  onOpenLogin,
}) => {
  const { t, translateError } = useI18n();
  const identifierSeed = (currentUserEmail || initialEmail || '').trim();

  const [screen, setScreen] = useState<RecoveryScreen>('request');
  const [requestIdentifier, setRequestIdentifier] = useState(identifierSeed);
  const [requestToken, setRequestToken] = useState('');
  const [validatedReset, setValidatedReset] = useState<{ identifier: string; token: string } | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [requestMessage, setRequestMessage] = useState('');
  const [requestMessageType, setRequestMessageType] = useState<'success' | 'error' | null>(null);
  const [tokenMessage, setTokenMessage] = useState('');
  const [tokenMessageType, setTokenMessageType] = useState<'success' | 'error' | null>(null);
  const [changeMessage, setChangeMessage] = useState('');
  const [changeMessageType, setChangeMessageType] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const nextSeed = (currentUserEmail || initialEmail || '').trim();
    if (!nextSeed) return;
    setRequestIdentifier((prev) => prev || nextSeed);
  }, [currentUserEmail, initialEmail]);

  const isEmailValid = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const isIdentifierValid = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.includes('@')) {
      return isEmailValid(trimmed);
    }
    return trimmed.replace(/\D/g, '').length >= 8;
  };

  const isTokenValid = (value: string) => /^\d{3}$/.test(value.trim());

  const resetMessages = () => {
    setRequestMessage('');
    setRequestMessageType(null);
    setTokenMessage('');
    setTokenMessageType(null);
    setChangeMessage('');
    setChangeMessageType(null);
  };

  const handleIdentifierChange = (value: string) => {
    setRequestIdentifier(value);
    setRequestToken('');
    setValidatedReset(null);
    setNewPassword('');
    setConfirmPassword('');
    resetMessages();
    if (screen !== 'request') {
      setScreen('request');
    }
  };

  const handleRequestPasswordReset = async () => {
    resetMessages();
    const identifier = requestIdentifier.trim();
    if (!isIdentifierValid(identifier)) {
      setRequestMessage(t('errors.identifierRequired'));
      setRequestMessageType('error');
      return;
    }

    setRequesting(true);
    const result = await requestPasswordReset(identifier);
    setRequesting(false);

    if (!result.ok) {
      setRequestMessage(translateError(result.error));
      setRequestMessageType('error');
      return;
    }

    setRequestToken('');
    setValidatedReset(null);
    setTokenMessage(t('passwordRecovery.requestSuccess'));
    setTokenMessageType('success');
    setScreen('token');
  };

  const handleValidateToken = async () => {
    setTokenMessage('');
    setTokenMessageType(null);
    const identifier = requestIdentifier.trim();
    const token = requestToken.trim();

    if (!isIdentifierValid(identifier)) {
      setTokenMessage(t('errors.identifierRequired'));
      setTokenMessageType('error');
      return;
    }
    if (!isTokenValid(token)) {
      setTokenMessage(t('errors.tokenInvalid'));
      setTokenMessageType('error');
      return;
    }

    setVerifyingToken(true);
    const result = await verifyPasswordResetToken({ identifier, token });
    setVerifyingToken(false);

    if (!result.ok) {
      setTokenMessage(translateError(result.error));
      setTokenMessageType('error');
      return;
    }

    setValidatedReset({ identifier, token });
    setChangeMessage('');
    setChangeMessageType(null);
    setScreen('change');
  };

  const handleChangePassword = async () => {
    setChangeMessage('');
    setChangeMessageType(null);
    if (!validatedReset) {
      setChangeMessage(t('passwordRecovery.changeLockedHint'));
      setChangeMessageType('error');
      return;
    }

    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!next || !confirm) {
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
    const result = await resetPasswordWithToken({
      identifier: validatedReset.identifier,
      token: validatedReset.token,
      newPassword: next,
    });
    setChangingPassword(false);

    if (!result.ok) {
      setChangeMessage(translateError(result.error));
      setChangeMessageType('error');
      return;
    }

    const rememberedEmail = (result.user?.email || '').trim().toLowerCase();
    const fallbackEmail = validatedReset.identifier.includes('@') ? validatedReset.identifier.trim().toLowerCase() : '';
    const loginEmail = rememberedEmail || fallbackEmail;
    if (loginEmail) {
      saveRememberedCredentials({
        email: loginEmail,
        password: next,
      });
    }

    setNewPassword('');
    setConfirmPassword('');
    setChangeMessage(t('passwordRecovery.changeSuccess'));
    setChangeMessageType('success');
    onOpenLogin();
  };

  const activeIndex = useMemo(() => {
    if (screen === 'request') return 1;
    if (screen === 'token') return 2;
    return 3;
  }, [screen]);

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

        <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${activeIndex >= 1 ? 'bg-[#e3262e]' : 'bg-gray-200'}`} />
            <span className={`h-2.5 w-2.5 rounded-full ${activeIndex >= 2 ? 'bg-[#e3262e]' : 'bg-gray-200'}`} />
            <span className={`h-2.5 w-2.5 rounded-full ${activeIndex >= 3 ? 'bg-[#e3262e]' : 'bg-gray-200'}`} />
          </div>

          {screen === 'request' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={16} className="text-[#e3262e]" />
                <h2 className="text-lg font-black text-gray-900">{t('passwordRecovery.requestTitle')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">{t('passwordRecovery.requestHint')}</p>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleRequestPasswordReset();
                }}
              >
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    {t('login.emailLabel')}
                  </label>
                  <input
                    type="text"
                    value={requestIdentifier}
                    onChange={(event) => handleIdentifierChange(event.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                    placeholder={t('login.emailPlaceholder')}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={requesting}
                    className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                  >
                    {requesting ? t('common.sending') : t('passwordRecovery.requestButton')}
                  </button>
                </div>
              </form>
              {requestMessage && (
                <p className={`mt-3 text-xs font-semibold ${requestMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {requestMessage}
                </p>
              )}
            </div>
          )}

          {screen === 'token' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-[#e3262e]" />
                <h2 className="text-lg font-black text-gray-900">{t('passwordRecovery.stepTokenTab')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">{t('passwordRecovery.tokenHint')}</p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleValidateToken();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      {t('login.emailLabel')}
                    </label>
                    <input
                      type="text"
                      value={requestIdentifier}
                      readOnly
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      {t('passwordRecovery.tokenLabel')}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={requestToken}
                      onChange={(event) => setRequestToken(event.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none text-sm tracking-[0.4em]"
                      placeholder={t('passwordRecovery.tokenPlaceholder')}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScreen('request')}
                    className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingToken}
                    className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                  >
                    {verifyingToken ? t('common.saving') : t('common.continue')}
                  </button>
                </div>
              </form>
              {tokenMessage && (
                <p className={`mt-3 text-xs font-semibold ${tokenMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tokenMessage}
                </p>
              )}
            </div>
          )}

          {screen === 'change' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-[#e3262e]" />
                <h2 className="text-lg font-black text-gray-900">{t('passwordRecovery.changeTitle')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">{t('passwordRecovery.changeHint')}</p>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleChangePassword();
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      {t('login.emailLabel')}
                    </label>
                    <input
                      type="text"
                      value={validatedReset?.identifier || requestIdentifier}
                      readOnly
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      {t('passwordRecovery.tokenLabel')}
                    </label>
                    <input
                      type="text"
                      value={validatedReset?.token || requestToken}
                      readOnly
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm text-gray-600 tracking-[0.4em]"
                    />
                  </div>
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
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScreen('token')}
                    className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
                  >
                    {changingPassword ? t('common.saving') : t('passwordRecovery.changeButton')}
                  </button>
                </div>
              </form>
              {changeMessage && (
                <p className={`mt-3 text-xs font-semibold ${changeMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {changeMessage}
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PasswordRecoveryPage;
