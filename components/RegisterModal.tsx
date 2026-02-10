
import React, { useEffect, useState } from 'react';
import { X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';
import { clearRememberedCredentials, getRememberedCredentials, savePendingModelProfile, saveRememberedCredentials } from '../services/auth';
import { useI18n } from '../translations/i18n';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onModelRegisterSuccess: (profile: { name: string; email: string; password: string }) => void;
  onRegisterSuccess?: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin, onModelRegisterSuccess, onRegisterSuccess }) => {
  const { t, translateError } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFullName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setRememberCredentials(true);
      setError('');
      return;
    }
    const remembered = getRememberedCredentials();
    if (remembered) {
      setEmail(remembered.email);
      setPassword(remembered.password);
      setRememberCredentials(true);
    } else {
      setEmail('');
      setPassword('');
      setRememberCredentials(true);
    }
    setShowPassword(false);
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinalize = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError(t('errors.nameEmailRequired'));
      return;
    }

    setSubmitting(true);
    const profile = { name: trimmedName, email: trimmedEmail, password: trimmedPassword };
    if (rememberCredentials) {
      saveRememberedCredentials({ email: trimmedEmail, password: trimmedPassword });
    } else {
      clearRememberedCredentials();
    }
    const pendingProfile = rememberCredentials
      ? { name: profile.name, email: profile.email, password: profile.password }
      : { name: profile.name, email: profile.email };
    savePendingModelProfile(pendingProfile);
    setSubmitting(false);
    setError('');
    onModelRegisterSuccess(profile);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t('register.title')}
            </h2>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleFinalize(); }}>
              <input 
                type="text" 
                placeholder={t('register.namePlaceholder')}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all"
              />
              <input 
                type="email" 
                placeholder={t('register.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-6 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all"
              />
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('register.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-6 pr-16 sm:pr-40 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  title={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 inline-flex items-center gap-2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span className="hidden sm:inline">
                    {showPassword ? t('register.hidePassword') : t('register.showPassword')}
                  </span>
                </button>
              </div>

              <div className="flex items-start gap-3 py-1">
                <input
                  type="checkbox"
                  id="remember-register"
                  checked={rememberCredentials}
                  onChange={(event) => setRememberCredentials(event.target.checked)}
                  className="mt-1 accent-[#e3262e]"
                />
                <label htmlFor="remember-register" className="text-xs text-gray-500 leading-relaxed">
                  {t('register.rememberCredentials')}
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-semibold">{translateError(error)}</p>
              )}
              
              <div className="flex items-start gap-3 py-2">
                <input type="checkbox" id="terms" className="mt-1 accent-[#e3262e]" />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                  {t('register.termsPrefix')}{' '}
                  <a href="#" className="text-[#e3262e] font-bold underline">{t('register.termsUse')}</a>{' '}
                  {t('register.termsAnd')}{' '}
                  <a href="#" className="text-[#e3262e] font-bold underline">{t('register.termsPrivacy')}</a>.
                </label>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-[#e3262e] text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? t('register.submitting') : t('register.submit')}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            {t('register.haveAccount')}{' '}
            <button 
              onClick={onSwitchToLogin}
              className="text-[#e3262e] font-bold hover:underline"
            >
              {t('register.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
