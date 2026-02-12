import { AuthUser, getCurrentUser } from './auth';

export type SavedModelEntry = {
  id: string;
  savedAt: string;
};

const STORAGE_KEY = 'punto_saved_models';

const isBrowser = () => typeof window !== 'undefined';

const resolveUser = (user?: AuthUser | null) => {
  if (user === undefined) return getCurrentUser();
  return user;
};

const getStorageKey = (user?: AuthUser | null) => {
  const activeUser = resolveUser(user);
  return activeUser?.id ? `${STORAGE_KEY}:${activeUser.id}` : STORAGE_KEY;
};

export const isSavedModelsStorageKey = (key: string | null) => {
  if (!key) return false;
  return key === STORAGE_KEY || key.startsWith(`${STORAGE_KEY}:`);
};

const sanitizeEntries = (value: unknown): SavedModelEntry[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: SavedModelEntry[] = [];
  value.forEach((item) => {
    let id: string | null = null;
    let savedAt: string | null = null;
    if (typeof item === 'string') {
      id = item;
    } else if (item && typeof item === 'object') {
      const candidate = item as { id?: unknown; savedAt?: unknown };
      if (typeof candidate.id === 'string') {
        id = candidate.id;
      }
      if (typeof candidate.savedAt === 'string') {
        savedAt = candidate.savedAt;
      }
    }
    if (!id || seen.has(id)) return;
    seen.add(id);
    entries.push({ id, savedAt: savedAt || new Date().toISOString() });
  });
  return entries;
};

const readEntries = (user?: AuthUser | null): SavedModelEntry[] => {
  if (!isBrowser()) return [];
  const activeUser = resolveUser(user);
  const key = getStorageKey(activeUser);
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      return sanitizeEntries(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (activeUser?.id) {
    const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!legacyRaw) return [];
    try {
      const legacyEntries = sanitizeEntries(JSON.parse(legacyRaw));
      if (legacyEntries.length) {
        window.localStorage.setItem(key, JSON.stringify(legacyEntries));
        return legacyEntries;
      }
    } catch {
      return [];
    }
  }
  return [];
};

const writeEntries = (entries: SavedModelEntry[], user?: AuthUser | null) => {
  if (!isBrowser()) return;
  const key = getStorageKey(user);
  window.localStorage.setItem(key, JSON.stringify(entries));
  window.dispatchEvent(new Event('punto_saved_models'));
};

export const getSavedModels = (user?: AuthUser | null) => readEntries(user);

export const getSavedModelIds = (user?: AuthUser | null) => readEntries(user).map((entry) => entry.id);

export const isModelSaved = (id: string, user?: AuthUser | null) => readEntries(user).some((entry) => entry.id === id);

export const toggleSavedModel = (id: string, user?: AuthUser | null) => {
  const entries = readEntries(user);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    entries.splice(index, 1);
    writeEntries(entries, user);
    return { saved: false, entries };
  }
  const next = [{ id, savedAt: new Date().toISOString() }, ...entries];
  writeEntries(next, user);
  return { saved: true, entries: next };
};

export const pruneSavedModels = (validIds: string[], user?: AuthUser | null) => {
  const entries = readEntries(user);
  if (!entries.length) return entries;
  const validSet = new Set(validIds);
  const next = entries.filter((entry) => validSet.has(entry.id));
  if (next.length !== entries.length) {
    writeEntries(next, user);
  }
  return next;
};
