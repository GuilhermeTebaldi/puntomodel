import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import Logo from './Logo';
import { requestPasswordReset, resetPasswordWithToken, verifyPasswordResetToken } from '../services/auth';
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
  currentUserEmail,
  onBackToSite,
  onOpenLogin,
}) => {
  const { t, translateError } = useI18n();
  const identifierSeed = (currentUserEmail || initialEmail || '').trim();
  const [requestIdentifier, setRequestIdentifier] = useState(identifierSeed);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestMessageType, setRequestMessageType] = useState<'success' | 'error' | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const [requestToken, setRequestToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');
  const [tokenMessageType, setTokenMessageType] = useState<'success' | 'error' | null>(null);
  const [validatedReset, setValidatedReset] = useState<{ identifier: string; token: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
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

  const resetVerificationState = () => {
    setRequestSent(false);
    setRequestToken('');
    setTokenMessage('');
    setTokenMessageType(null);
    setValidatedReset(null);
    setNewPassword('');
    setConfirmPassword('');
    setChangeMessage('');
    setChangeMessageType(null);
  };

  const handleIdentifierChange = (value: string) => {
    setRequestIdentifier(value);
    setRequestMessage('');
    setRequestMessageType(null);
    resetVerificationState();
  };

  const handleRequestPasswordReset = async () => {
    setRequestMessage('');
    setRequestMessageType(null);
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

    setRequestSent(true);
    setRequestToken('');
    setTokenMessage('');
    setTokenMessageType(null);
    setValidatedReset(null);
    setRequestMessage(t('passwordRecovery.requestSuccess'));
    setRequestMessageType('success');
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
    setTokenMessage(t('passwordRecovery.tokenVerified'));
    setTokenMessageType('success');
  };

  const handleChangePassword = async () => {
    setChangeMessage('');
    setChangeMessageType(null);
    const unlock = validatedReset;
    if (!unlock) {
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
      identifier: unlock.identifier,
      token: unlock.token,
      newPassword: next,
    });
    setChangingPassword(false);

    if (!result.ok) {
      setChangeMessage(translateError(result.error));
      setChangeMessageType('error');
      return;
    }

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
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={requesting}
                className="px-4 py-2 rounded-full bg-[#e3262e] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-70"
              >
                {requesting ? t('common.sending') : t('passwordRecovery.requestButton')}
              </button>
              {requestSent && (
                <button
                  type="button"
                  onClick={resetVerificationState}
                  className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest"
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </form>
          {requestMessage && (
            <p className={`mt-3 text-xs font-semibold ${requestMessageType === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {requestMessage}
            </p>
          )}
        </section>

        {requestSent && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
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
              <div className="mt-4">
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
          </section>
        )}

        {validatedReset && (
          <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
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
                    value={validatedReset.identifier}
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
                    value={validatedReset.token}
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
              <div className="mt-4">
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
          </section>
        )}
      </main>
    </div>
  );
};

export default PasswordRecoveryPage;
