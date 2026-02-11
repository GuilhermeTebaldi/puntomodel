import { apiFetch } from './api';

type TranslationResponse = { translatedText?: string };
type DetectResponseItem = { language?: string; confidence?: number };

const MIRRORS = [
  'https://translate.argosopentech.com',
  'https://libretranslate.de',
  'https://translate.api.skitzen.com',
  'https://translate.mentality.rip',
  'https://translate.fortytwo-it.com',
  'https://trans.zillyhuhn.com',
  'https://translate.cutie.dating',
];

const translationCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

const postJson = async <T>(
  url: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw new Error('translate_failed');
  }
  return response.json() as Promise<T>;
};

const detectLanguage = async (baseUrl: string, text: string, signal?: AbortSignal) => {
  const data = await postJson<DetectResponseItem[]>(`${baseUrl}/detect`, { q: text }, signal);
  if (!Array.isArray(data) || !data.length) return null;
  const best = data[0];
  return typeof best?.language === 'string' && best.language ? best.language : null;
};

const translateWithProvider = async (
  baseUrl: string,
  text: string,
  source: string,
  target: string,
  signal?: AbortSignal
) => {
  const data = await postJson<TranslationResponse>(
    `${baseUrl}/translate`,
    { q: text, source, target },
    signal
  );
  if (typeof data?.translatedText !== 'string') return null;
  const trimmed = data.translatedText.trim();
  return trimmed ? trimmed : null;
};

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
      if (backend?.detectedLanguage && backend.detectedLanguage === target) {
        return null;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
    for (const baseUrl of MIRRORS) {
      try {
        const detected = await detectLanguage(baseUrl, normalized, signal);
        if (detected && detected === target) {
          return null;
        }
        const source = detected || 'auto';
        const translated = await translateWithProvider(baseUrl, normalized, source, target, signal);
        if (translated) {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
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
