
import React, { useEffect, useState } from 'react';
import { X, Mail, Lock, Facebook, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';
import {
  clearRememberedCredentials,
  getRememberedCredentials,
  loginUser,
  saveRememberedCredentials,
  setCurrentUser,
} from '../services/auth';
import { useI18n } from '../translations/i18n';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister, onLoginSuccess }) => {
  const { t, translateError } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIdentifier('');
      setPassword('');
      setShowPassword(false);
      setRememberCredentials(true);
      setError('');
      return;
    }
    const remembered = getRememberedCredentials();
    if (remembered) {
      setIdentifier(remembered.email);
      setPassword(remembered.password);
      setRememberCredentials(true);
    } else {
      setIdentifier('');
      setPassword('');
      setRememberCredentials(true);
    }
    setShowPassword(false);
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await loginUser(identifier, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (rememberCredentials) {
      saveRememberedCredentials({ email: identifier.trim(), password: password.trim() });
    } else {
      clearRememberedCredentials();
    }
    setError('');
    setCurrentUser(result.user);
    onLoginSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('login.title')}</h2>
          <p className="text-gray-500 text-center text-sm mb-8">{t('login.subtitle')}</p>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase ml-4 mb-1 block">{t('login.emailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder={t('login.emailPlaceholder')}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase ml-4 mb-1 block">{t('login.passwordLabel')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-11 pr-16 sm:pr-40 focus:outline-none focus:ring-2 focus:ring-[#e3262e]/20 focus:border-[#e3262e] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 inline-flex items-center gap-2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span className="hidden sm:inline">
                    {showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={rememberCredentials}
                  onChange={(event) => setRememberCredentials(event.target.checked)}
                  className="accent-[#e3262e]"
                />
                {t('login.rememberCredentials')}
              </label>
              <button className="text-xs font-bold text-[#e3262e] hover:underline">{t('login.forgot')}</button>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold">{translateError(error)}</p>
            )}

            <button
              disabled={submitting}
              className="w-full bg-[#e3262e] text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <span className="relative px-4 bg-white text-xs text-gray-400 uppercase font-bold">{t('login.orContinue')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 border border-gray-100 py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              <span className="text-sm font-bold text-gray-700">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 border border-gray-100 py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              <Facebook className="text-blue-600" size={18} fill="currentColor" />
              <span className="text-sm font-bold text-gray-700">Facebook</span>
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            {t('login.noAccount')}{' '}
            <button 
              onClick={onSwitchToRegister}
              className="text-[#e3262e] font-bold hover:underline"
            >
              {t('login.registerFree')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
