const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedBaseUrl) return normalizedPath;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiUrl(path), init);
