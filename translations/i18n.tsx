import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  LanguageCode,
  PriceId,
  fallbackLanguage,
  getList,
  getPriceId,
  getPriceLabel,
  getTranslation,
  languageOptions,
  locales,
  translateErrorMessage,
  translateEyeLabel,
  translateHairLabel,
  translatePriceLabel,
  translateServiceLabel,
  translateStatLabel,
  translateStatValue,
} from './index';

const STORAGE_KEY = 'punto_lang_flag';
const SOURCE_KEY = 'punto_lang_source';

type LanguageSource = 'auto' | 'manual';

type I18nContextValue = {
  language: LanguageCode;
  locale: string;
  languageSource: LanguageSource;
  setLanguage: (lang: LanguageCode) => void;
  setLanguageAuto: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  list: (key: string) => string[];
  translateError: (message: string) => string;
  translateService: (label: string) => string;
  translateHair: (label: string) => string;
  translateEyes: (label: string) => string;
  translatePriceLabel: (label: string) => string;
  translateStatLabel: (label: string) => string;
  translateStatValue: (value: string) => string;
  getPriceLabel: (id: PriceId) => string;
  getPriceId: (label: string) => PriceId | null;
  languageOptions: typeof languageOptions;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const isLanguageCode = (value: string | null): value is LanguageCode => {
  if (!value) return false;
  return value === 'br' || value === 'us' || value === 'es' || value === 'it' || value === 'de' || value === 'fr';
};

const isLanguageSource = (value: string | null): value is LanguageSource => {
  return value === 'auto' || value === 'manual';
};

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return fallbackLanguage;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return isLanguageCode(saved) ? saved : fallbackLanguage;
};

const getInitialSource = (): LanguageSource => {
  if (typeof window === 'undefined') return 'auto';
  const saved = window.localStorage.getItem(SOURCE_KEY);
  return isLanguageSource(saved) ? saved : 'auto';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);
  const [languageSource, setLanguageSource] = useState<LanguageSource>(getInitialSource);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SOURCE_KEY, languageSource);
  }, [languageSource]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    setLanguageSource('manual');
  }, []);

  const setLanguageAuto = useCallback((lang: LanguageCode) => {
    setLanguageState((prev) => (prev === lang ? prev : lang));
    setLanguageSource((prev) => (prev === 'manual' ? prev : 'auto'));
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => getTranslation(language, key, params),
    [language]
  );

  const list = useCallback((key: string) => getList(language, key), [language]);

  const translateError = useCallback(
    (message: string) => translateErrorMessage(message, language),
    [language]
  );

  const translateService = useCallback(
    (label: string) => translateServiceLabel(label, language),
    [language]
  );

  const translateHair = useCallback(
    (label: string) => translateHairLabel(label, language),
    [language]
  );

  const translateEyes = useCallback(
    (label: string) => translateEyeLabel(label, language),
    [language]
  );

  const translatePrice = useCallback(
    (label: string) => translatePriceLabel(label, language),
    [language]
  );

  const translateStat = useCallback(
    (label: string) => translateStatLabel(label, language),
    [language]
  );

  const translateStatVal = useCallback(
    (value: string) => translateStatValue(value, language),
    [language]
  );

  const getPriceLabelLocalized = useCallback((id: PriceId) => getPriceLabel(id, language), [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale: locales[language] ?? locales[fallbackLanguage],
      languageSource,
      setLanguage,
      setLanguageAuto,
      t,
      list,
      translateError,
      translateService,
      translateHair,
      translateEyes,
      translatePriceLabel: translatePrice,
      translateStatLabel: translateStat,
      translateStatValue: translateStatVal,
      getPriceLabel: getPriceLabelLocalized,
      getPriceId,
      languageOptions,
    }),
    [
      language,
      languageSource,
      setLanguage,
      setLanguageAuto,
      t,
      list,
      translateError,
      translateService,
      translateHair,
      translateEyes,
      translatePrice,
      translateStat,
      translateStatVal,
      getPriceLabelLocalized,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
