import { apiFetch } from './api';
import { LanguageCode, locales } from '../translations';

const translationCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

const translateViaBackend = async (text: string, target: string, signal?: AbortSignal) => {
  const response = await apiFetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target }),
    signal,
  });
  if (!response.ok) {
    throw new Error('translate_failed');
  }
  const data = (await response.json()) as { translatedText?: string; detectedLanguage?: string };
  return data;
};

export const translateText = async (text: string, target: string, signal?: AbortSignal) => {
  const normalized = text.trim();
  if (!normalized) return null;
  const cacheKey = `${target}|${normalized}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;
  const inflight = inFlight.get(cacheKey);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const backend = await translateViaBackend(normalized, target, signal);
      if (typeof backend?.translatedText === 'string') {
        const trimmed = backend.translatedText.trim();
        if (trimmed) {
          translationCache.set(cacheKey, trimmed);
          return trimmed;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
    return null;
  })();

  inFlight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inFlight.delete(cacheKey);
  }
};

export const getTranslationTarget = (language: LanguageCode) => {
  const locale = locales[language];
  if (!locale) return 'en';
  return locale.split('-')[0]?.toLowerCase() || 'en';
};

const getSupportedTranslationTargets = () => {
  const targets = new Set<string>();
  (Object.keys(locales) as LanguageCode[]).forEach((lang) => {
    targets.add(getTranslationTarget(lang));
  });
  return Array.from(targets);
};

export const buildBioTranslations = async (text: string, sourceLanguage?: string) => {
  const normalized = text.trim();
  if (!normalized) return {};
  const targets = getSupportedTranslationTargets();
  const results: Record<string, string> = {};
  await Promise.allSettled(
    targets.map(async (target) => {
      if (sourceLanguage && target === sourceLanguage) {
        results[target] = normalized;
        return;
      }
      const translated = await translateText(normalized, target);
      if (translated) {
        results[target] = translated;
      }
    })
  );
  return results;
};
