import { apiFetch } from './api';

const INCLUDE_UNPAID_MODELS = true;

const withIncludeUnpaid = (url: string) => {
  if (!INCLUDE_UNPAID_MODELS) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}includeUnpaid=true`;
};

export interface ModelPrice {
  label: string;
  value: number;
}

export interface ModelAttributes {
  height?: string;
  weight?: string;
  eyes?: string;
  hair?: string;
  feet?: string;
  nationality?: string;
  audience?: string[];
  profileIdentity?: string;
}

export interface ModelIdentity {
  number: string;
  documentUrl: string;
  birthDate?: string | null;
  faceUrl?: string | null;
  verifiedAt?: string | null;
}

export interface ModelLocation {
  city?: string;
  state?: string;
  lat?: number;
  lon?: number;
}

export interface ModelMapPoint {
  x?: number;
  y?: number;
}

export type ModelBillingStatus = 'active' | 'expired' | 'none';

export interface ModelBilling {
  status?: ModelBillingStatus;
  paidAt?: string;
  expiresAt?: string;
  amount?: number;
  currency?: string;
  planId?: string;
  lastPaymentId?: string;
  paidByUserId?: string | null;
  paidByEmail?: string | null;
}

export interface ModelPayment {
  id: string;
  modelId: string;
  planId?: string;
  amount: number;
  currency: string;
  method: 'pix' | 'card';
  status: 'paid' | 'failed' | 'pending';
  paidByUserId?: string | null;
  paidByEmail?: string | null;
  createdAt: string;
}

export interface ModelProfileData {
  id: string;
  userId?: string;
  name: string;
  email: string;
  age?: number | null;
  phone?: string;
  identity?: ModelIdentity | null;
  bio?: string;
  bioTranslations?: Record<string, string | { text?: string; status?: string; updatedAt?: string; attempts?: number; error?: string }>;
  bioLanguage?: string;
  services: string[];
  prices: ModelPrice[];
  attributes?: ModelAttributes;
  location?: ModelLocation | null;
  map?: ModelMapPoint | null;
  photos: string[];
  avatarUrl?: string | null;
  featured?: boolean;
  isOnline?: boolean;
  onlineUntil?: number | null;
  currency?: string;
  billing?: ModelBilling | null;
  payments?: ModelPayment[];
  stats?: {
    views?: Record<string, number>;
    whatsapp?: Record<string, number>;
    ratings?: { sum: number; count: number };
  };
  comments?: Array<{
    id: string;
    name: string;
    message: string;
    createdAt: string;
  }>;
}

export type ModelProfilePayload = Omit<ModelProfileData, 'id'> & {
  phoneCountryDial?: string;
};

const parseDateToMs = (value?: string | number | null) => {
  if (!value) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isBillingActive = (billing?: ModelBilling | null) => {
  const expiresAt = parseDateToMs(billing?.expiresAt);
  return Boolean(expiresAt && expiresAt > Date.now());
};

export const fetchFeaturedModels = async () => {
  const response = await apiFetch(withIncludeUnpaid('/api/models?featured=true&online=true'));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar modelos.');
  }
  return data.models as ModelProfileData[];
};

export const fetchModels = async () => {
  const response = await apiFetch(withIncludeUnpaid('/api/models?online=true'));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar modelos.');
  }
  return data.models as ModelProfileData[];
};

export const fetchModelsByCity = async (city: string) => {
  const response = await apiFetch(withIncludeUnpaid(`/api/models?city=${encodeURIComponent(city)}&online=true`));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar modelos.');
  }
  return data.models as ModelProfileData[];
};

export const fetchModelsAll = async () => {
  const response = await apiFetch(withIncludeUnpaid('/api/models'));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar modelos.');
  }
  return data.models as ModelProfileData[];
};

export const fetchModelsByCityAll = async (city: string) => {
  const response = await apiFetch(withIncludeUnpaid(`/api/models?city=${encodeURIComponent(city)}`));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar modelos.');
  }
  return data.models as ModelProfileData[];
};

export const fetchModelByEmail = async (email: string) => {
  const response = await apiFetch(`/api/models?email=${encodeURIComponent(email)}&includeUnpaid=true`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar perfil.');
  }
  const models = data.models as ModelProfileData[];
  return models[0] || null;
};

export const fetchModelById = async (id: string) => {
  const response = await apiFetch(`/api/models/${id}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar perfil.');
  }
  return data.model as ModelProfileData;
};

export const createModelProfile = async (payload: ModelProfilePayload) => {
  const response = await apiFetch('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível salvar perfil.');
  }
  return data.model as ModelProfileData;
};

export const updateModelProfile = async (
  id: string,
  payload: Partial<Omit<ModelProfileData, 'id' | 'email'>> & { phoneCountryDial?: string }
) => {
  const response = await apiFetch(`/api/models/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível atualizar perfil.');
  }
  return data.model as ModelProfileData;
};

export const fetchStats = async () => {
  const response = await apiFetch('/api/stats');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar estatísticas.');
  }
  return data.stats as Array<{ value: string; label: string }>;
};

export const createModelPayment = async (
  id: string,
  payload: { amount: number; currency: string; method: 'pix' | 'card'; planId?: string; paidByUserId?: string | null; paidByEmail?: string | null }
) => {
  const response = await apiFetch(`/api/models/${id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível confirmar pagamento.');
  }
  return data.model as ModelProfileData;
};

export const trackModelEvent = async (id: string, type: 'view' | 'whatsapp') => {
  const response = await apiFetch(`/api/models/${id}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.error || 'Não foi possível registrar evento.');
  }
};

export const rateModel = async (
  id: string,
  value: number,
  rater?: { id?: string; name?: string; email?: string }
) => {
  const response = await apiFetch(`/api/models/${id}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value,
      raterId: rater?.id,
      raterName: rater?.name,
      raterEmail: rater?.email,
    }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.error || 'Não foi possível avaliar.');
  }
};

export const fetchModelMetrics = async (id: string) => {
  const response = await apiFetch(`/api/models/${id}/metrics`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar métricas.');
  }
  return data.metrics as {
    viewsToday: number;
    whatsappToday: number;
    ratingAvg: number;
    ratingCount: number;
    estimatedEarningsMonth: number;
  };
};

export const fetchModelComments = async (id: string) => {
  const response = await apiFetch(`/api/models/${id}/comments`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar comentários.');
  }
  return data.comments as Array<{ id: string; name: string; message: string; createdAt: string }>;
};

export const createModelComment = async (id: string, payload: { name: string; message: string }) => {
  const response = await apiFetch(`/api/models/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível enviar comentário.');
  }
  return data.comment as { id: string; name: string; message: string; createdAt: string };
};

export const fetchModelNotifications = async (id: string) => {
  const response = await apiFetch(`/api/models/${id}/notifications`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível carregar notificações.');
  }
  return data.notifications as Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
};

export const markModelNotificationsRead = async (id: string) => {
  const response = await apiFetch(`/api/models/${id}/notifications/read-all`, {
    method: 'POST',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.error || 'Não foi possível atualizar notificações.');
  }
};
