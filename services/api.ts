const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://puntomodel.onrender.com/api';

const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiUrl(path), init);
