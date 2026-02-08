export type SavedModelEntry = {
  id: string;
  savedAt: string;
};

const STORAGE_KEY = 'punto_saved_models';

const isBrowser = () => typeof window !== 'undefined';

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

const readEntries = (): SavedModelEntry[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return sanitizeEntries(JSON.parse(raw));
  } catch {
    return [];
  }
};

const writeEntries = (entries: SavedModelEntry[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('punto_saved_models'));
};

export const getSavedModels = () => readEntries();

export const getSavedModelIds = () => readEntries().map((entry) => entry.id);

export const isModelSaved = (id: string) => readEntries().some((entry) => entry.id === id);

export const toggleSavedModel = (id: string) => {
  const entries = readEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    entries.splice(index, 1);
    writeEntries(entries);
    return { saved: false, entries };
  }
  const next = [{ id, savedAt: new Date().toISOString() }, ...entries];
  writeEntries(next);
  return { saved: true, entries: next };
};
