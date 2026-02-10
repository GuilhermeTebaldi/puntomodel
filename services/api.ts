const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://puntomodel.onrender.com/api';

const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Evita duplicação quando os chamadores já passam "/api/..." e a base já termina com "/api"
  if (normalizedPath === '/api') normalizedPath = '';
  else if (normalizedPath.startsWith('/api/')) normalizedPath = normalizedPath.slice(4);
  return `${normalizedBaseUrl}${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiUrl(path), init);
