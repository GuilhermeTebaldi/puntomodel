import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
import { ensureSchema, checkDb } from './db.js';
import { upload, uploadToCloudinary } from './upload.js';
import {
  addComment,
  addEvent,
  addNotification,
  addPayment,
  findUserByEmail,
  findUserById,
  findActivePasswordResetRequestByToken,
  createPasswordResetRequest,
  getLatestPasswordResetTokenByEmail,
  getModelByEmail,
  getModelById as getModelByIdRepo,
  listModels,
  listPasswordResetRequests,
  listRegistrationLeads,
  listUsers,
  markPasswordResetTokenSent,
  markNotificationsRead,
  rate as rateEvent,
  resetDatabase,
  upsertRegistrationLead,
  completeRegistrationLead,
  resolvePasswordResetRequest,
  updateUserPassword,
  updateModel,
  upsertModel,
  deleteModel,
  deleteUser,
  metrics as computeMetrics,
  createUser,
} from './repositories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const defaultCorsOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://puntomodel.vercel.app',
  'https://puntomodel.com',
  'https://www.puntomodel.com',
  'https://puntoescort.com',
  'https://www.puntoescort.com',
]);
const envCorsOrigins = []
  .concat(process.env.CORS_ORIGIN || '')
  .concat(process.env.FRONTEND_ORIGIN || '')
  .map((value) => value.split(','))
  .flat()
  .map((value) => value.trim())
  .filter(Boolean);
if (process.env.VERCEL_URL) {
  envCorsOrigins.push(`https://${process.env.VERCEL_URL}`);
}
const allowedCorsOrigins = new Set([...defaultCorsOrigins, ...envCorsOrigins]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedCorsOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS bloqueado para a origem: ${origin}`));
  },
};

const TRANSLATE_API_BASE =
  process.env.TRANSLATE_API_BASE_URL || 'https://libretranslate.de';
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY || '';
const TRANSLATE_API_BASES = Array.from(
  new Set([
    TRANSLATE_API_BASE,
    'https://translate.astian.org',
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
  ].filter(Boolean))
);
const BIO_TRANSLATION_TARGETS = ['pt', 'en', 'es', 'it', 'de', 'fr'];

const postTranslateJson = async (url, payload, signal) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PuntoModel/1.0 (+https://puntomodel.com)',
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const raw = await response.text();
    let detail = '';
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed.error === 'string') {
        detail = parsed.error.trim().slice(0, 160);
      }
    } catch {
      // ignore parse errors
    }
    const message = detail
      ? `translate_failed_${response.status}:${detail}`
      : `translate_failed_${response.status}`;
    throw new Error(message);
  }
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const buildTranslatePayload = (text, source, target) => {
  const payload = { q: text, source, target, format: 'text' };
  if (TRANSLATE_API_KEY) {
    payload.api_key = TRANSLATE_API_KEY;
  }
  return payload;
};

const translateWithProvider = async (baseUrl, text, source, target, signal) => {
  const data = await postTranslateJson(`${baseUrl}/translate`, buildTranslatePayload(text, source, target), signal);
  if (!data || typeof data.translatedText !== 'string') return null;
  const trimmed = data.translatedText.trim();
  return trimmed ? trimmed : null;
};

const translationCache = new Map();
const TRANSLATION_CACHE_MAX = 300;
const getTranslateCacheKey = (text, target) => `${target}|${text}`;

const translateWithMyMemory = async (text, source, target) => {
  const sourceLang = source && source !== 'auto' ? source : 'pt';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${sourceLang}|${target}`)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PuntoModel/1.0 (+https://puntomodel.com)' },
  });
  if (!response.ok) {
    throw new Error(`mymemory_${response.status}`);
  }
  const data = await response.json();
  if (!data || data.responseStatus !== 200) {
    const detail = typeof data?.responseDetails === 'string' ? data.responseDetails.trim().slice(0, 160) : '';
    throw new Error(detail ? `mymemory_failed:${detail}` : 'mymemory_failed');
  }
  const translatedText = data?.responseData?.translatedText;
  if (typeof translatedText !== 'string') return null;
  const trimmed = translatedText.trim();
  if (!trimmed || trimmed.startsWith('MYMEMORY WARNING')) {
    throw new Error('mymemory_quota');
  }
  return trimmed;
};

const translateWithFallbacks = async (text, source, target, { timeoutMs = 8000 } = {}) => {
  const cacheKey = getTranslateCacheKey(text, target);
  const cached = translationCache.get(cacheKey);
  if (cached) return { text: cached, error: null };

  let lastError = null;
  for (const baseUrl of TRANSLATE_API_BASES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const translated = await translateWithProvider(baseUrl, text, source, target, controller.signal);
      if (translated) {
        if (translationCache.size >= TRANSLATION_CACHE_MAX) {
          translationCache.clear();
        }
        translationCache.set(cacheKey, translated);
        return { text: translated, error: null };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'translate_failed';
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const translated = await translateWithMyMemory(text, source, target);
    if (translated) {
      if (translationCache.size >= TRANSLATION_CACHE_MAX) {
        translationCache.clear();
      }
      translationCache.set(cacheKey, translated);
      return { text: translated, error: null };
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : lastError;
  }

  return { text: null, error: lastError || 'translate_failed' };
};

const bioTranslationJobs = new Map();
const MAX_BIO_TRANSLATION_ATTEMPTS = 3;
const normalizeBioLanguage = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};
const hashBioText = (text) => createHash('sha1').update(text).digest('hex');
const normalizeBioTranslationEntry = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return { text: trimmed, status: 'done', attempts: 0, updatedAt: new Date().toISOString() };
  }
  if (value && typeof value === 'object') {
    const text = typeof value.text === 'string' ? value.text.trim() : '';
    const status = typeof value.status === 'string' && value.status.trim()
      ? value.status.trim()
      : text
      ? 'done'
      : 'pending';
    const attempts = Number.isFinite(value.attempts) ? Math.max(0, Number(value.attempts)) : 0;
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    const error = typeof value.error === 'string' ? value.error : null;
    return { text, status, attempts, updatedAt, error };
  }
  return null;
};
const normalizeBioTranslations = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  const normalized = {};
  for (const [key, entry] of entries) {
    const lang = key.trim().toLowerCase();
    if (!lang || !BIO_TRANSLATION_TARGETS.includes(lang)) continue;
    const normalizedEntry = normalizeBioTranslationEntry(entry);
    if (!normalizedEntry) continue;
    normalized[lang] = normalizedEntry;
  }
  return normalized;
};
const buildBioTranslationsSeed = (sourceText, sourceLang) => {
  const nowIso = new Date().toISOString();
  const translations = {};
  BIO_TRANSLATION_TARGETS.forEach((target) => {
    if (sourceLang && target === sourceLang) {
      translations[target] = { text: sourceText, status: 'done', attempts: 0, updatedAt: nowIso };
    } else {
      translations[target] = { text: '', status: 'pending', attempts: 0, updatedAt: nowIso };
    }
  });
  return translations;
};
const getBioTranslationEntry = (translations, target) => {
  const entry = normalizeBioTranslationEntry(translations?.[target]);
  if (entry) return entry;
  return { text: '', status: 'pending', attempts: 0, updatedAt: null };
};
const resetBioTranslationsForRetry = async (model, { force = false } = {}) => {
  const sourceText = typeof model?.bio === 'string' ? model.bio.trim() : '';
  if (!sourceText) return model;
  const sourceLang = normalizeBioLanguage(model.bioLanguage);
  const nowIso = new Date().toISOString();
  const normalized = normalizeBioTranslations(model.bioTranslations);
  const seed = buildBioTranslationsSeed(sourceText, sourceLang);
  const nextTranslations = { ...seed, ...normalized };

  BIO_TRANSLATION_TARGETS.forEach((target) => {
    if (sourceLang && target === sourceLang) {
      nextTranslations[target] = {
        text: sourceText,
        status: 'done',
        attempts: 0,
        updatedAt: nowIso,
        error: null,
      };
      return;
    }

    const entry = normalizeBioTranslationEntry(nextTranslations[target]) || {
      text: '',
      status: 'pending',
      attempts: 0,
      updatedAt: null,
      error: null,
    };
    const shouldReset = force || entry.status !== 'done' || !entry.text;
    nextTranslations[target] = shouldReset
      ? { text: '', status: 'pending', attempts: 0, updatedAt: nowIso, error: null }
      : { ...entry, updatedAt: entry.updatedAt || nowIso };
  });

  model.bioTranslations = nextTranslations;
  model.bioHash = hashBioText(sourceText);
  model.updatedAt = nowIso;
  const updated = await updateModel(model.id, model);
  return updated || model;
};
const hasAllBioTranslations = (model) => {
  const source = typeof model?.bio === 'string' ? model.bio.trim() : '';
  if (!source) return false;
  const translations = model?.bioTranslations || {};
  return BIO_TRANSLATION_TARGETS.every((target) => {
    const entry = getBioTranslationEntry(translations, target);
    return entry.status === 'done' && entry.text.length > 0;
  });
};
const markBioTranslation = async (model, target, entry) => {
  const nextTranslations = { ...(model.bioTranslations || {}) };
  nextTranslations[target] = entry;
  model.bioTranslations = nextTranslations;
  model.updatedAt = new Date().toISOString();
  await updateModel(model.id, model);
};
const ensureBioTranslationsInitialized = async (model, sourceText, sourceLang) => {
  const normalized = normalizeBioTranslations(model.bioTranslations);
  const hash = hashBioText(sourceText);
  if (!model.bioTranslations || model.bioHash !== hash || !Object.keys(normalized).length) {
    model.bioTranslations = buildBioTranslationsSeed(sourceText, sourceLang);
    model.bioHash = hash;
    model.updatedAt = new Date().toISOString();
    const updated = await updateModel(model.id, model);
    return updated || model;
  }
  model.bioTranslations = { ...buildBioTranslationsSeed(sourceText, sourceLang), ...normalized };
  return model;
};
const translateAndPersistBio = async (modelId, sourceText, sourceLang, target) => {
  await ensureDb();
  const model = await getModelByIdRepo(modelId);
  if (!model) return;
  const currentBio = typeof model.bio === 'string' ? model.bio.trim() : '';
  if (currentBio !== sourceText) return;
  const normalizedSourceLang = normalizeBioLanguage(sourceLang);
  const prepared = await ensureBioTranslationsInitialized(model, sourceText, normalizedSourceLang);
  const entry = getBioTranslationEntry(prepared.bioTranslations, target);
  if (entry.status === 'done' && entry.text) return;
  const retryLimit =
    entry.status === 'failed' && typeof entry.error === 'string' && entry.error.startsWith('translate_failed')
      ? MAX_BIO_TRANSLATION_ATTEMPTS + 2
      : MAX_BIO_TRANSLATION_ATTEMPTS;
  if (entry.attempts >= retryLimit) {
    if (entry.status !== 'failed') {
      await markBioTranslation(prepared, target, { ...entry, status: 'failed', updatedAt: new Date().toISOString() });
    }
    return;
  }
  await markBioTranslation(prepared, target, {
    ...entry,
    status: 'processing',
    attempts: entry.attempts + 1,
    updatedAt: new Date().toISOString(),
    error: null,
  });

  let translated = null;
  let translateError = null;
  if (normalizedSourceLang && target === normalizedSourceLang) {
    translated = sourceText;
  } else {
    const result = await translateWithFallbacks(sourceText, normalizedSourceLang || 'auto', target, { timeoutMs: 8000 });
    translated = result.text;
    translateError = result.error;
  }
  if (translated) {
    await markBioTranslation(prepared, target, {
      text: translated,
      status: 'done',
      attempts: entry.attempts + 1,
      updatedAt: new Date().toISOString(),
      error: null,
    });
  } else {
    await markBioTranslation(prepared, target, {
      ...entry,
      status: 'failed',
      attempts: entry.attempts + 1,
      updatedAt: new Date().toISOString(),
      error: translateError || 'translate_failed',
    });
  }
};
const scheduleBioTranslations = (modelId, bio, sourceLanguage) => {
  const sourceText = typeof bio === 'string' ? bio.trim() : '';
  if (!sourceText) return;
  const sourceLang = normalizeBioLanguage(sourceLanguage);
  const jobKey = `${modelId}:${hashBioText(sourceText)}`;
  if (bioTranslationJobs.has(jobKey)) return;
  const job = (async () => {
    for (const target of BIO_TRANSLATION_TARGETS) {
      await translateAndPersistBio(modelId, sourceText, sourceLang, target);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  })();
  bioTranslationJobs.set(jobKey, job);
  job.finally(() => {
    bioTranslationJobs.delete(jobKey);
  });
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.post('/api/translate', async (req, res) => {
  const payload = req.body || {};
  const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
  const target = typeof payload.target === 'string' ? payload.target.trim() : '';
  if (!rawText || !target) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  const safeText = rawText.length > 5000 ? rawText.slice(0, 5000) : rawText;
  const cacheKey = getTranslateCacheKey(safeText, target);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return res.json({ ok: true, translatedText: cached, detectedLanguage: null, cached: true });
  }

  try {
    const result = await translateWithFallbacks(safeText, 'auto', target);
    if (result.text) {
      return res.json({ ok: true, translatedText: result.text, detectedLanguage: null });
    }
  } catch (err) {
    // ignore translate errors
  }

  return res.json({ ok: true, translatedText: '', detectedLanguage: null });
});

app.post('/api/upload/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file_required' });
    }
    const result = await uploadToCloudinary(req.file);
    res.json({ url: result.secure_url });
  } catch (e) {
    res.status(500).json({ error: 'upload_failed' });
  }
});

const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'puntomodeloficial@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '16046421';

let schemaReady = null;
const ensureDb = async () => {
  if (!schemaReady) {
    schemaReady = ensureSchema();
  }
  await schemaReady;
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
const normalizePassword = (value) => (typeof value === 'string' ? value.trim() : '');
const isPasswordValid = (value) => value.length >= 6;
const normalizeResetIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : '';
const isResetIdentifierValid = (value) => {
  const trimmed = normalizeResetIdentifier(value);
  if (!trimmed) return false;
  if (trimmed.includes('@')) return trimmed.includes('.');
  return normalizePhoneDigits(trimmed).length >= 8;
};
const normalizeResetToken = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const sanitized = String(Math.trunc(value)).replace(/\D/g, '');
    return sanitized.length <= 3 ? sanitized.padStart(3, '0') : sanitized;
  }
  if (typeof value === 'string') {
    return value.trim().replace(/\D/g, '');
  }
  return '';
};
const isResetTokenValid = (value) => /^\d{3}$/.test(value);
const generateResetToken = (excluded = new Set()) => {
  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const candidate = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    if (!excluded.has(candidate)) return candidate;
  }
  return null;
};
const hasProvidedResetToken = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  return String(value).trim().length > 0;
};
const resolveResetRequestToken = ({ rawToken, previousToken }) => {
  const tokenInput = normalizeResetToken(rawToken);
  const provided = hasProvidedResetToken(rawToken);
  if (provided && !isResetTokenValid(tokenInput)) {
    return { token: '', error: 'Token inválido. Use 3 números.' };
  }

  const excluded = new Set();
  const normalizedPrevious = normalizeResetToken(previousToken);
  if (isResetTokenValid(normalizedPrevious)) {
    excluded.add(normalizedPrevious);
  }

  if (isResetTokenValid(tokenInput) && !excluded.has(tokenInput)) {
    return { token: tokenInput, error: '' };
  }

  const generated = generateResetToken(excluded);
  if (!generated) {
    return { token: '', error: 'Não foi possível gerar token.' };
  }
  return { token: generated, error: '' };
};
const phonesMatch = (left, right) => {
  const a = normalizePhoneDigits(left);
  const b = normalizePhoneDigits(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.endsWith(a)) return true;
  if (b.length >= 8 && a.endsWith(b)) return true;
  return false;
};
const resolveResetIdentity = async (rawIdentifier) => {
  const identifier = normalizeResetIdentifier(rawIdentifier);
  if (!identifier) {
    return { identifier: '', email: '', user: null, model: null };
  }
  const normalizedEmail = normalizeEmail(identifier);
  if (normalizedEmail.includes('@')) {
    const user = await findUserByEmail(normalizedEmail);
    return { identifier, email: normalizedEmail, user, model: null };
  }

  const models = await listModels();
  const matchedModel = models.find((model) => phonesMatch(identifier, model.phone || ''));
  if (!matchedModel?.email) {
    return { identifier, email: '', user: null, model: null };
  }
  const email = normalizeEmail(matchedModel.email);
  const user = await findUserByEmail(email);
  return { identifier, email, user, model: matchedModel };
};
const normalizePhoneE164 = (rawPhone, phoneCountryDial) => {
  if (rawPhone === null || rawPhone === undefined) return '';
  if (typeof rawPhone !== 'string') return null;
  const raw = rawPhone.trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const dialDigits = typeof phoneCountryDial === 'string' ? phoneCountryDial.replace(/\D/g, '') : '';
  let normalizedDigits = '';

  if (raw.startsWith('+')) {
    normalizedDigits = digits;
  } else if (raw.startsWith('00')) {
    normalizedDigits = digits.replace(/^00/, '');
  } else if (dialDigits) {
    normalizedDigits = digits.startsWith(dialDigits) ? digits : `${dialDigits}${digits}`;
  } else {
    return null;
  }

  if (!normalizedDigits) return null;
  if (normalizedDigits.length < 8 || normalizedDigits.length > 15) return null;
  return `+${normalizedDigits}`;
};
const normalizeBirthDate = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  let year = 0;
  let month = 0;
  let day = 0;
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else {
    return null;
  }
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const getAgeFromBirthDate = (value) => {
  const normalized = normalizeBirthDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map((part) => Number(part));
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};
// Identity documents are stored for admin-only verification (18+).
const normalizeIdentity = (identity, current = null) => {
  if (identity === undefined) return current ?? null;
  if (identity === null) return null;
  if (typeof identity !== 'object') return null;
  const number = typeof identity.number === 'string' ? identity.number.trim() : current?.number ?? '';
  const documentUrl = typeof identity.documentUrl === 'string' ? identity.documentUrl.trim() : current?.documentUrl ?? '';
  const faceUrl = typeof identity.faceUrl === 'string' ? identity.faceUrl.trim() : current?.faceUrl ?? '';
  const birthDate = normalizeBirthDate(identity.birthDate) ?? current?.birthDate ?? null;
  const verifiedAt = typeof identity.verifiedAt === 'string' ? identity.verifiedAt : current?.verifiedAt ?? null;
  if (!number || !documentUrl || !birthDate) return null;
  return {
    number,
    documentUrl,
    birthDate,
    faceUrl: faceUrl || null,
    verifiedAt,
  };
};
const getTodayKey = () => new Date().toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDateToMs = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isBillingActive = (model, now = Date.now()) => {
  const expiresAtMs = parseDateToMs(model?.billing?.expiresAt);
  return Boolean(expiresAtMs && expiresAtMs > now);
};

const syncBillingStatus = (model, now = Date.now()) => {
  if (!model?.billing) return;
  const expiresAtMs = parseDateToMs(model.billing.expiresAt);
  if (!expiresAtMs) {
    model.billing.status = model.billing.status || 'none';
    return;
  }
  model.billing.status = expiresAtMs > now ? 'active' : 'expired';
};

const refreshModelState = async (model) => {
  if (!model) return model;
  let changed = false;
  const now = Date.now();
  if (model.onlineUntil && now > Number(model.onlineUntil)) {
    if (model.isOnline !== false || model.onlineUntil) {
      model.isOnline = false;
      model.onlineUntil = null;
      changed = true;
    }
  }
  const prevStatus = model.billing?.status;
  syncBillingStatus(model, now);
  if (prevStatus && model.billing?.status !== prevStatus) {
    changed = true;
  }
  if (changed) {
    model.updatedAt = new Date().toISOString();
    const updated = await updateModel(model.id, model);
    return updated || model;
  }
  return model;
};

const ensureModelStats = (model) => {
  if (!model.stats) {
    model.stats = { views: {}, whatsapp: {}, ratings: { sum: 0, count: 0 } };
  }
  if (!model.stats.views) model.stats.views = {};
  if (!model.stats.whatsapp) model.stats.whatsapp = {};
  if (!model.stats.ratings) model.stats.ratings = { sum: 0, count: 0 };
  return model.stats;
};

const ensureModelComments = (model) => {
  if (!model.comments) model.comments = [];
  if (!model.commentIps) model.commentIps = {};
  return model.comments;
};

const ensureModelRatings = (model) => {
  if (!model.ratingIps) model.ratingIps = {};
  ensureModelStats(model);
  return model.ratingIps;
};

const ensureModelNotifications = (model) => {
  if (!model.notifications) model.notifications = [];
  return model.notifications;
};

const backfillNotifications = (model) => {
  const notifications = ensureModelNotifications(model);
  if (notifications.length > 0) return notifications;

  // Backfill from existing comments
  const comments = model.comments || [];
  comments.forEach((comment) => {
    notifications.push({
      id: nanoid(),
      type: 'comment',
      title: 'Novo comentario',
      message: `${comment.name} deixou um comentario no seu perfil.`,
      read: true,
      createdAt: comment.createdAt || new Date().toISOString(),
    });
  });

  // Backfill from aggregate ratings (no per-rating history available)
  const stats = ensureModelStats(model);
  const ratingCount = Number(stats.ratings?.count || 0);
  if (ratingCount > 0) {
    notifications.push({
      id: nanoid(),
      type: 'rating',
      title: 'Nova avaliacao',
      message: `Voce recebeu ${ratingCount} avaliacao${ratingCount > 1 ? 'es' : ''}.`,
      read: true,
      createdAt: new Date().toISOString(),
    });
  }

  model.notifications = notifications;
  return notifications;
};

const sumLastDays = (map, days) => {
  const today = new Date();
  let total = 0;
  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    total += Number(map?.[key] || 0);
  }
  return total;
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const sanitizeModelPublic = (model) => {
  if (!model) return model;
  const { identity, ...rest } = model;
  return rest;
};

const setNoCacheHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

app.get('/api/health', async (_req, res) => {
  const dbOk = await checkDb();
  res.json({ ok: true, db: dbOk });
});


app.post('/api/auth/register', async (req, res) => {
  await ensureDb();
  const { name, email, password, role } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password || !role) {
    return res.status(400).json({ ok: false, error: 'Preencha nome, e-mail, senha e perfil.' });
  }

  if (!['client', 'model'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'Perfil inválido.' });
  }

  const exists = await findUserByEmail(normalizedEmail);
  if (exists) {
    return res.status(409).json({ ok: false, error: 'Este e-mail já está cadastrado.' });
  }

  const newUser = {
    id: nanoid(),
    name: name.trim(),
    email: normalizedEmail,
    password: password.trim(),
    role,
    createdAt: new Date().toISOString(),
  };

  await createUser(newUser);

  res.json({ ok: true, user: sanitizeUser(newUser) });
});

app.post('/api/auth/login', async (req, res) => {
  await ensureDb();
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = (password || '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ ok: false, error: 'Informe e-mail e senha.' });
  }

  if (normalizedEmail === normalizeEmail(adminEmail) && normalizedPassword === adminPassword) {
    return res.json({ ok: true, user: sanitizeUser({
      id: 'admin',
      name: 'Admin',
      email: normalizeEmail(adminEmail),
      role: 'admin',
      createdAt: new Date().toISOString(),
    }) });
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user || user.password !== normalizedPassword) {
    return res.status(401).json({ ok: false, error: 'E-mail ou senha inválidos.' });
  }

  res.json({ ok: true, user: sanitizeUser(user) });
});

app.patch('/api/auth/password', async (req, res) => {
  await ensureDb();
  const payload = req.body || {};
  const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
  const currentPassword = normalizePassword(payload.currentPassword);
  const newPassword = normalizePassword(payload.newPassword);

  if (!currentPassword) {
    return res.status(400).json({ ok: false, error: 'Senha atual obrigatória.' });
  }

  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({ ok: false, error: 'Nova senha inválida.' });
  }

  if (!userId && !email) {
    return res.status(400).json({ ok: false, error: 'Usuário não encontrado.' });
  }

  const userById = userId ? await findUserById(userId) : null;
  const userByEmail = !userById && email ? await findUserByEmail(email) : null;
  const user = userById || userByEmail;

  if (!user) {
    return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
  }

  if (user.password !== currentPassword) {
    return res.status(401).json({ ok: false, error: 'Senha atual inválida.' });
  }

  const updated = await updateUserPassword(user.id, newPassword);
  if (!updated) {
    return res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }

  res.json({ ok: true, user: sanitizeUser(updated) });
});

app.patch('/api/admin/users/:id/password', async (req, res) => {
  await ensureDb();
  const user = await findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
  }
  const payload = req.body || {};
  const newPassword = normalizePassword(payload.newPassword);
  if (!isPasswordValid(newPassword)) {
    return res.status(400).json({ ok: false, error: 'Nova senha inválida.' });
  }
  const updated = await updateUserPassword(user.id, newPassword);
  if (!updated) {
    return res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }
  res.json({ ok: true, user: sanitizeUser(updated) });
});

app.post('/api/password-resets', async (req, res) => {
  try {
    await ensureDb();
    const payload = req.body || {};
    const rawIdentifier = payload.identifier ?? payload.email;
    const identifier = normalizeResetIdentifier(rawIdentifier);
    if (!isResetIdentifierValid(identifier)) {
      return res.status(400).json({ ok: false, error: 'Informe e-mail ou celular válido.' });
    }

    const identity = await resolveResetIdentity(identifier);
    const email = identity.email || (identifier.includes('@') ? normalizeEmail(identifier) : '');
    if (!email || !email.includes('@')) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    const previousToken = await getLatestPasswordResetTokenByEmail(email);
    const nextToken = resolveResetRequestToken({
      rawToken: payload.token,
      previousToken,
    });
    if (nextToken.error) {
      const status = nextToken.error.includes('Token inválido') ? 400 : 500;
      return res.status(status).json({ ok: false, error: nextToken.error });
    }

    const user = identity.user || await findUserByEmail(email);
    const created = await createPasswordResetRequest({
      email,
      userId: user?.id || null,
      token: nextToken.token,
    });
    if (!created) {
      return res.status(500).json({ ok: false, error: 'Não foi possível enviar a solicitação de recuperação.' });
    }
    res.json({ ok: true, request: created });
  } catch (error) {
    console.error('[password-reset:create]', error);
    res.status(500).json({ ok: false, error: 'Não foi possível enviar a solicitação de recuperação.' });
  }
});

app.post('/api/auth/password/reset-by-token', async (req, res) => {
  try {
    await ensureDb();
    const payload = req.body || {};
    const rawIdentifier = payload.identifier ?? payload.email;
    const identifier = normalizeResetIdentifier(rawIdentifier);
    const token = normalizeResetToken(payload.token);
    const newPassword = normalizePassword(payload.newPassword);

    if (!isResetIdentifierValid(identifier)) {
      return res.status(400).json({ ok: false, error: 'Informe e-mail ou celular válido.' });
    }
    if (!isResetTokenValid(token)) {
      return res.status(400).json({ ok: false, error: 'Token inválido. Use 3 números.' });
    }
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({ ok: false, error: 'Nova senha inválida.' });
    }

    const identity = await resolveResetIdentity(identifier);
    const email = identity.email || (identifier.includes('@') ? normalizeEmail(identifier) : '');
    if (!email || !email.includes('@')) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    let request = await findActivePasswordResetRequestByToken({ token, email, userId: null });
    if (!request && identity.user?.id) {
      request = await findActivePasswordResetRequestByToken({ token, email: '', userId: identity.user.id });
    }
    if (!request) {
      return res.status(401).json({ ok: false, error: 'Token inválido.' });
    }

    let user = identity.user;
    if (!user && request.userId) {
      user = await findUserById(request.userId);
    }
    if (!user) {
      user = await findUserByEmail(request.email || email);
    }
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    const updated = await updateUserPassword(user.id, newPassword);
    if (!updated) {
      return res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
    }

    await resolvePasswordResetRequest(request.id);
    res.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    console.error('[password-reset:finish]', error);
    res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }
});

app.get('/api/models', async (req, res) => {
  await ensureDb();
  const { featured, city, email, online } = req.query;
  const includeUnpaid = req.query.includeUnpaid === 'true';
  const emailFilter = email ? String(email).toLowerCase() : null;
  let models = await listModels({ email: emailFilter || undefined });
  models = await Promise.all(models.map((model) => refreshModelState(model)));

  if (!includeUnpaid) {
    models = models.filter((model) => isBillingActive(model));
  }

  if (featured === 'true') {
    models = models.filter((model) => model.featured);
  }

  if (online === 'true') {
    models = models.filter((model) => model.isOnline !== false);
  }

  if (city) {
    const query = String(city).toLowerCase();
    models = models.filter((model) => (model.location?.city || '').toLowerCase().includes(query));
  }

  if (email) {
    const query = String(email).toLowerCase();
    models = models.filter((model) => normalizeEmail(model.email) === query);
  }

  models.forEach((model) => {
    if (!hasAllBioTranslations(model)) {
      scheduleBioTranslations(model.id, model.bio, model.bioLanguage);
    }
  });

  res.json({ ok: true, models: models.map(sanitizeModelPublic) });
});

app.get('/api/models/:id', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const refreshed = await refreshModelState(model);
  if (!hasAllBioTranslations(refreshed)) {
    scheduleBioTranslations(refreshed.id, refreshed.bio, refreshed.bioLanguage);
  }
  res.json({ ok: true, model: sanitizeModelPublic(refreshed) });
});

app.get('/api/admin/users', async (_req, res) => {
  await ensureDb();
  const users = await listUsers();
  res.json({ ok: true, users: users.map(sanitizeUser) });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  await ensureDb();
  const deleted = await deleteUser(req.params.id);
  if (!deleted) {
    return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
  }
  res.json({ ok: true });
});

app.get('/api/admin/models', async (_req, res) => {
  await ensureDb();
  let models = await listModels();
  models = await Promise.all(models.map((model) => refreshModelState(model)));
  models.forEach((model) => {
    if (!hasAllBioTranslations(model)) {
      scheduleBioTranslations(model.id, model.bio, model.bioLanguage);
    }
  });
  res.json({ ok: true, models });
});

app.get('/api/admin/registrations', async (_req, res) => {
  await ensureDb();
  const leads = await listRegistrationLeads();
  res.json({ ok: true, leads });
});

app.get('/api/admin/password-resets', async (_req, res) => {
  try {
    await ensureDb();
    const requests = await listPasswordResetRequests();
    setNoCacheHeaders(res);
    res.json({ ok: true, requests });
  } catch (error) {
    console.error('[password-reset:list-admin]', error);
    res.status(500).json({ ok: false, error: 'Não foi possível carregar as solicitações de recuperação.' });
  }
});

app.patch('/api/admin/password-resets/:id/resolve', async (req, res) => {
  try {
    await ensureDb();
    const resolved = await resolvePasswordResetRequest(req.params.id);
    if (!resolved) {
      return res.status(404).json({ ok: false, error: 'Solicitação de recuperação não encontrada.' });
    }
    res.json({ ok: true, request: resolved });
  } catch (error) {
    console.error('[password-reset:resolve-admin]', error);
    res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }
});

app.patch('/api/admin/password-resets/:id/token-sent', async (req, res) => {
  try {
    await ensureDb();
    const updated = await markPasswordResetTokenSent(req.params.id);
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Solicitação de recuperação não encontrada.' });
    }
    res.json({ ok: true, request: updated });
  } catch (error) {
    console.error('[password-reset:token-sent-admin]', error);
    res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }
});

app.post('/api/admin/models/:id/translate', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const sourceText = typeof model.bio === 'string' ? model.bio.trim() : '';
  if (!sourceText) {
    return res.status(400).json({ ok: false, error: 'Bio vazia.' });
  }
  const payload = req.body || {};
  const force = payload.force === true;
  const updated = await resetBioTranslationsForRetry(model, { force });
  scheduleBioTranslations(updated.id, updated.bio, updated.bioLanguage);
  res.json({ ok: true, model: sanitizeModelPublic(updated) });
});

app.delete('/api/admin/models/:id', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  await deleteModel(model.id);
  res.json({ ok: true });
});

app.post('/api/registrations/start', async (req, res) => {
  await ensureDb();
  const payload = req.body || {};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const dial = typeof payload.phoneCountryDial === 'string' ? payload.phoneCountryDial : '';
  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'Nome e telefone são obrigatórios.' });
  }
  const normalizedPhone = normalizePhoneE164(phone, dial);
  if (!normalizedPhone) {
    return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido.' });
  }
  const lead = await upsertRegistrationLead({ name, phone, phoneNormalized: normalizedPhone });
  res.json({ ok: true, lead });
});

app.post('/api/registrations/complete', async (req, res) => {
  await ensureDb();
  const payload = req.body || {};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const dial = typeof payload.phoneCountryDial === 'string' ? payload.phoneCountryDial : '';
  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Telefone é obrigatório.' });
  }
  const normalizedPhone = normalizePhoneE164(phone, dial);
  if (!normalizedPhone) {
    return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido.' });
  }
  const lead = await completeRegistrationLead({ name, phone, phoneNormalized: normalizedPhone });
  res.json({ ok: true, lead });
});

app.post('/api/models', async (req, res) => {
  await ensureDb();
  const payload = req.body || {};

  if (!payload.name || !payload.email) {
    return res.status(400).json({ ok: false, error: 'Nome e e-mail são obrigatórios.' });
  }

  const normalizedModelEmail = normalizeEmail(payload.email);
  const normalizedPhone = normalizePhoneE164(payload.phone, payload.phoneCountryDial);
  if (normalizedPhone === null) {
    return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido.' });
  }
  const hasMap = payload.map && typeof payload.map.x === 'number' && typeof payload.map.y === 'number';
  const hasLocation = payload.location && typeof payload.location.lat === 'number' && typeof payload.location.lon === 'number';

  let mapPoint = payload.map ?? null;
  if (!hasMap && hasLocation) {
    const lat = payload.location.lat;
    const lon = payload.location.lon;
    const x = ((lon + 180) / 360) * 100;
    const y = (1 - (lat + 90) / 180) * 100;
    mapPoint = { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) };
  }

  const existingModel = await getModelByEmail(normalizedModelEmail);
  const normalizedIdentity = normalizeIdentity(payload.identity, existingModel?.identity ?? null);
  if (!normalizedIdentity) {
    return res.status(400).json({ ok: false, error: 'Identidade obrigatória.' });
  }
  if (!normalizedIdentity.faceUrl) {
    return res.status(400).json({ ok: false, error: 'Foto do rosto obrigatória.' });
  }
  const derivedAge = getAgeFromBirthDate(normalizedIdentity.birthDate);
  if (!derivedAge) {
    return res.status(400).json({ ok: false, error: 'Data de nascimento inválida.' });
  }
  if (derivedAge < 18) {
    return res.status(400).json({ ok: false, error: 'Menor de idade.' });
  }

  const rawAttributes = payload.attributes && typeof payload.attributes === 'object' ? payload.attributes : {};
  const normalizedAttributes = { ...rawAttributes };
  const hair = typeof rawAttributes.hair === 'string' ? rawAttributes.hair.trim() : '';
  const eyes = typeof rawAttributes.eyes === 'string' ? rawAttributes.eyes.trim() : '';
  const nationality = typeof rawAttributes.nationality === 'string' ? rawAttributes.nationality.trim() : '';
  const profileIdentity = typeof rawAttributes.profileIdentity === 'string' ? rawAttributes.profileIdentity.trim() : '';
  const audience = Array.isArray(rawAttributes.audience)
    ? rawAttributes.audience.filter((item) => typeof item === 'string' && item.trim())
    : [];

  if (hair) normalizedAttributes.hair = hair;
  if (eyes) normalizedAttributes.eyes = eyes;
  if (nationality) normalizedAttributes.nationality = nationality;
  if (profileIdentity) normalizedAttributes.profileIdentity = profileIdentity;
  if (audience.length) normalizedAttributes.audience = audience;

  if (!hair || !eyes || !nationality || !audience.length || !profileIdentity) {
    return res.status(400).json({ ok: false, error: 'Campos obrigatórios não preenchidos.' });
  }

  const bioText = typeof payload.bio === 'string' ? payload.bio.trim() : '';
  const bioLanguage = normalizeBioLanguage(payload.bioLanguage);
  const incomingBioTranslations = normalizeBioTranslations(payload.bioTranslations);
  let bioTranslations = {};
  if (bioText) {
    bioTranslations = buildBioTranslationsSeed(bioText, bioLanguage);
    if (Object.keys(incomingBioTranslations).length) {
      bioTranslations = { ...bioTranslations, ...incomingBioTranslations };
    }
  }
  const bioHash = bioText ? hashBioText(bioText) : null;

  const existingBilling = existingModel?.billing ?? null;
  const existingPayments = existingModel?.payments ?? [];

  const modelPayload = {
    name: payload.name.trim(),
    email: normalizedModelEmail,
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    age: derivedAge,
    phone: normalizedPhone,
    identity: normalizedIdentity,
    bio: payload.bio ?? '',
    bioTranslations,
    bioLanguage: bioLanguage || null,
    bioHash,
    services: Array.isArray(payload.services) ? payload.services : [],
    prices: Array.isArray(payload.prices) ? payload.prices : [],
    attributes: normalizedAttributes,
    location: payload.location ?? null,
    map: mapPoint,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
    avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl : existingModel?.avatarUrl ?? null,
    featured: Boolean(payload.featured),
    isOnline: typeof payload.isOnline === 'boolean' ? payload.isOnline : false,
    currency: typeof payload.currency === 'string' ? payload.currency : 'BRL',
    onlineUntil: payload.onlineUntil ?? null,
    stats: payload.stats ?? { views: {}, whatsapp: {}, ratings: { sum: 0, count: 0 } },
    comments: payload.comments ?? [],
    commentIps: payload.commentIps ?? {},
    ratingIps: payload.ratingIps ?? {},
    notifications: payload.notifications ?? [],
    billing: payload.billing ?? existingBilling,
    payments: payload.payments ?? existingPayments,
  };

  const nowIso = new Date().toISOString();
  const savedModel = await upsertModel({
    id: existingModel?.id ?? nanoid(),
    email: normalizedModelEmail,
    ...modelPayload,
    createdAt: existingModel?.createdAt ?? nowIso,
    updatedAt: nowIso,
  });

  scheduleBioTranslations(savedModel.id, savedModel.bio, savedModel.bioLanguage);

  res.json({ ok: true, model: sanitizeModelPublic(savedModel) });
});

app.patch('/api/models/:id', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }

  const payload = req.body || {};
  let normalizedPhone = model.phone ?? '';
  if (payload.phone !== undefined) {
    const parsedPhone = normalizePhoneE164(payload.phone, payload.phoneCountryDial);
    if (parsedPhone === null) {
      return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido.' });
    }
    normalizedPhone = parsedPhone;
  }
  const normalizedIdentity =
    payload.identity !== undefined ? normalizeIdentity(payload.identity, model.identity ?? null) : model.identity ?? null;
  if (payload.identity !== undefined && !normalizedIdentity) {
    return res.status(400).json({ ok: false, error: 'Identidade inválida.' });
  }
  let derivedAge = model.age ?? null;
  if (normalizedIdentity?.birthDate) {
    const ageFromBirthDate = getAgeFromBirthDate(normalizedIdentity.birthDate);
    if (!ageFromBirthDate) {
      return res.status(400).json({ ok: false, error: 'Data de nascimento inválida.' });
    }
    if (ageFromBirthDate < 18) {
      return res.status(400).json({ ok: false, error: 'Menor de idade.' });
    }
    derivedAge = ageFromBirthDate;
  }
  if (payload.age !== undefined) {
    const numericAge = Number(payload.age);
    if (!Number.isFinite(numericAge) || numericAge < 18) {
      return res.status(400).json({ ok: false, error: 'Menor de idade.' });
    }
    derivedAge = numericAge;
  }
  const avatarUrl =
    payload.avatarUrl !== undefined
      ? typeof payload.avatarUrl === 'string'
        ? payload.avatarUrl
        : null
      : model.avatarUrl ?? null;
  const nextBio = typeof payload.bio === 'string' ? payload.bio : model.bio ?? '';
  const nextBioText = typeof nextBio === 'string' ? nextBio.trim() : '';
  const currentBioText = typeof model.bio === 'string' ? model.bio.trim() : '';
  const bioChanged = typeof payload.bio === 'string' && nextBioText !== currentBioText;
  const incomingBioTranslations = normalizeBioTranslations(payload.bioTranslations);
  const nextBioLanguage =
    payload.bioLanguage === null
      ? null
      : typeof payload.bioLanguage === 'string'
      ? normalizeBioLanguage(payload.bioLanguage)
      : model.bioLanguage ?? null;
  let nextBioTranslations = normalizeBioTranslations(model.bioTranslations);
  if (payload.bioTranslations === null || bioChanged) {
    nextBioTranslations = nextBioText ? buildBioTranslationsSeed(nextBioText, nextBioLanguage) : {};
    if (Object.keys(incomingBioTranslations).length) {
      nextBioTranslations = { ...nextBioTranslations, ...incomingBioTranslations };
    }
  } else if (Object.keys(incomingBioTranslations).length) {
    nextBioTranslations = { ...nextBioTranslations, ...incomingBioTranslations };
  }
  const nextBioHash = nextBioText ? hashBioText(nextBioText) : null;

  const updates = {
    name: typeof payload.name === 'string' ? payload.name.trim() : model.name,
    age: derivedAge,
    phone: normalizedPhone,
    identity: normalizedIdentity,
    bio: nextBio,
    bioTranslations: nextBioTranslations,
    bioLanguage: nextBioLanguage,
    bioHash: nextBioHash,
    services: Array.isArray(payload.services) ? payload.services : model.services ?? [],
    prices: Array.isArray(payload.prices) ? payload.prices : model.prices ?? [],
    attributes: payload.attributes ?? model.attributes ?? {},
    location: payload.location ?? model.location ?? null,
    map: payload.map ?? model.map ?? null,
    photos: Array.isArray(payload.photos) ? payload.photos : model.photos ?? [],
    avatarUrl,
    featured: typeof payload.featured === 'boolean' ? payload.featured : Boolean(model.featured),
    isOnline: typeof payload.isOnline === 'boolean' ? payload.isOnline : Boolean(model.isOnline),
    currency: typeof payload.currency === 'string' ? payload.currency : model.currency ?? 'BRL',
    onlineUntil: payload.onlineUntil ?? model.onlineUntil ?? null,
    stats: payload.stats ?? model.stats ?? { views: {}, whatsapp: {}, ratings: { sum: 0, count: 0 } },
    comments: payload.comments ?? model.comments ?? [],
    commentIps: payload.commentIps ?? model.commentIps ?? {},
    ratingIps: payload.ratingIps ?? model.ratingIps ?? {},
    notifications: payload.notifications ?? model.notifications ?? [],
    billing: payload.billing ?? model.billing ?? null,
    payments: payload.payments ?? model.payments ?? [],
    userId: typeof payload.userId === 'string' ? payload.userId : model.userId ?? null,
  };

  const updatedModel = { ...model, ...updates, updatedAt: new Date().toISOString() };
  const savedModel = await updateModel(model.id, updatedModel);

  if (bioChanged || payload.bioTranslations === null) {
    scheduleBioTranslations(savedModel.id, savedModel.bio, savedModel.bioLanguage);
  }

  res.json({ ok: true, model: sanitizeModelPublic(savedModel) });
});

app.post('/api/models/:id/payments', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }

  const { amount, currency, method, planId, paidByUserId, paidByEmail } = req.body || {};
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ ok: false, error: 'Valor inválido.' });
  }
  if (!currency || typeof currency !== 'string') {
    return res.status(400).json({ ok: false, error: 'Moeda inválida.' });
  }
  if (!['pix', 'card'].includes(method)) {
    return res.status(400).json({ ok: false, error: 'Método inválido.' });
  }

  const now = Date.now();
  const paidAt = new Date(now).toISOString();
  const currentExpiry = parseDateToMs(model.billing?.expiresAt) || 0;
  const base = Math.max(now, currentExpiry);
  const expiresAt = new Date(base + 30 * DAY_MS).toISOString();
  const payment = {
    id: nanoid(),
    modelId: model.id,
    planId: typeof planId === 'string' ? planId : 'diamond',
    amount: normalizedAmount,
    currency,
    method,
    status: 'paid',
    paidByUserId: typeof paidByUserId === 'string' ? paidByUserId : null,
    paidByEmail: typeof paidByEmail === 'string' ? paidByEmail : null,
    createdAt: paidAt,
  };

  model.payments = Array.isArray(model.payments) ? model.payments : [];
  model.payments.unshift(payment);
  model.billing = {
    status: 'active',
    paidAt,
    expiresAt,
    amount: normalizedAmount,
    currency,
    planId: payment.planId,
    lastPaymentId: payment.id,
    paidByUserId: payment.paidByUserId,
    paidByEmail: payment.paidByEmail,
  };
  model.updatedAt = new Date().toISOString();
  const savedModel = await updateModel(model.id, model);
  await addPayment(model.id, payment);

  res.json({ ok: true, model: sanitizeModelPublic(savedModel) });
});

app.post('/api/models/:id/events', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const { type } = req.body || {};
  if (!['view', 'whatsapp'].includes(type)) {
    return res.status(400).json({ ok: false, error: 'Tipo inválido.' });
  }
  const stats = ensureModelStats(model);
  const key = getTodayKey();
  if (type === 'view') {
    stats.views[key] = (stats.views[key] || 0) + 1;
  }
  if (type === 'whatsapp') {
    stats.whatsapp[key] = (stats.whatsapp[key] || 0) + 1;
  }
  model.stats = stats;
  model.updatedAt = new Date().toISOString();
  await updateModel(model.id, model);
  await addEvent(model.id, type);
  res.json({ ok: true });
});

app.post('/api/models/:id/rate', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const value = Number(req.body?.value);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    return res.status(400).json({ ok: false, error: 'Nota inválida.' });
  }
  const raterName = typeof req.body?.raterName === 'string' ? req.body.raterName.trim().slice(0, 80) : '';
  const raterEmailRaw = typeof req.body?.raterEmail === 'string' ? req.body.raterEmail : '';
  const raterEmail = raterEmailRaw ? normalizeEmail(raterEmailRaw).slice(0, 120) : '';
  const raterId = typeof req.body?.raterId === 'string' ? req.body.raterId.trim().slice(0, 60) : null;
  const raterLabel = raterName || raterEmail || '';
  const ip = (req.ip || '').replace('::ffff:', '') || 'unknown';
  const ratingIps = ensureModelRatings(model);
  if (ratingIps[ip]) {
    return res.status(429).json({ ok: false, error: 'Este dispositivo já avaliou.' });
  }
  const stats = ensureModelStats(model);
  stats.ratings.sum += value;
  stats.ratings.count += 1;
  ratingIps[ip] = true;
  model.ratingIps = ratingIps;
  model.stats = stats;
  const notifications = ensureModelNotifications(model);
  const ratingNotification = {
    id: nanoid(),
    type: 'rating',
    title: 'Nova avaliacao',
    message: raterLabel
      ? `${raterLabel} avaliou com ${value} estrela${value > 1 ? 's' : ''}.`
      : `Voce recebeu ${value} estrela${value > 1 ? 's' : ''}.`,
    read: false,
    createdAt: new Date().toISOString(),
    userId: raterId || null,
    userName: raterName || null,
    userEmail: raterEmail || null,
  };
  notifications.unshift(ratingNotification);
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await updateModel(model.id, model);
  await rateEvent(model.id, value);
  await addNotification(model.id, ratingNotification);
  res.json({ ok: true });
});

app.get('/api/models/:id/metrics', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const metrics = computeMetrics(model);

  res.json({ ok: true, metrics });
});

app.get('/api/models/:id/comments', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  ensureModelComments(model);
  res.json({ ok: true, comments: model.comments });
});

app.post('/api/models/:id/comments', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }

  const { name, message } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 50) : '';
  const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 400) : '';

  if (!cleanName || !cleanMessage) {
    return res.status(400).json({ ok: false, error: 'Informe nome e comentario.' });
  }

  ensureModelComments(model);
  const ip = (req.ip || '').replace('::ffff:', '') || 'unknown';
  if (model.commentIps?.[ip]) {
    return res.status(429).json({ ok: false, error: 'Este dispositivo já comentou.' });
  }

  const newComment = {
    id: nanoid(),
    name: cleanName,
    message: cleanMessage,
    createdAt: new Date().toISOString(),
  };

  model.comments.unshift(newComment);
  model.commentIps[ip] = true;
  const notifications = ensureModelNotifications(model);
  const commentNotification = {
    id: nanoid(),
    type: 'comment',
    title: 'Novo comentario',
    message: `${cleanName} deixou um comentario no seu perfil.`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(commentNotification);
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await updateModel(model.id, model);
  await addComment(model.id, newComment);
  await addNotification(model.id, commentNotification);

  res.json({ ok: true, comment: newComment });
});

app.get('/api/models/:id/notifications', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const hadNotifications = Array.isArray(model.notifications) && model.notifications.length > 0;
  const notifications = backfillNotifications(model);
  if (!hadNotifications && notifications.length > 0) {
    model.updatedAt = new Date().toISOString();
    await updateModel(model.id, model);
    await Promise.all(notifications.map((notification) => addNotification(model.id, notification)));
  }
  res.json({ ok: true, notifications });
});

app.post('/api/models/:id/notifications/read-all', async (req, res) => {
  await ensureDb();
  const model = await getModelByIdRepo(req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const notifications = ensureModelNotifications(model);
  notifications.forEach((notification) => {
    notification.read = true;
  });
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await updateModel(model.id, model);
  await markNotificationsRead(model.id);
  res.json({ ok: true });
});

app.post('/api/admin/reset', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Operação não permitida.' });
  }

  await ensureDb();
  await resetDatabase();
  res.json({ ok: true });
});

app.get('/api/stats', async (_req, res) => {
  await ensureDb();
  const users = await listUsers();
  const models = await listModels();
  const totalModels = models.length;
  const totalUsers = users.length;
  const totalRatings = models.reduce((sum, model) => {
    const count = Number(model?.stats?.ratings?.count || 0);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);
  const totalImages = models.reduce((sum, model) => {
    const count = Array.isArray(model?.photos) ? model.photos.length : 0;
    return sum + count;
  }, 0);

  res.json({
    ok: true,
    stats: [
      { value: `+${totalUsers}`, label: 'de usuários' },
      { value: `+${totalModels}`, label: 'acompanhantes' },
      { value: `+${totalImages}`, label: 'de imagens' },
      { value: `+${totalRatings}`, label: 'avaliações' },
    ],
  });
});

const PORT = process.env.PORT || 5174;

ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API pronta em http://localhost:${PORT}`);
  });
});
