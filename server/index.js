import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], models: [] });

const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'puntomodeloficial@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '16046421';

const ensureDb = async () => {
  await db.read();
  db.data ||= { users: [], models: [] };

  let changed = false;
  const now = Date.now();
  db.data.models.forEach((model) => {
    if (model.onlineUntil && now > Number(model.onlineUntil)) {
      if (model.isOnline !== false || model.onlineUntil) {
        model.isOnline = false;
        model.onlineUntil = null;
        model.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    const prevStatus = model.billing?.status;
    syncBillingStatus(model, now);
    if (prevStatus && model.billing?.status !== prevStatus) {
      model.updatedAt = new Date().toISOString();
      changed = true;
    }
  });

  if (changed) {
    await db.write();
  }
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
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

  const exists = db.data.users.find((user) => normalizeEmail(user.email) === normalizedEmail);
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

  db.data.users.push(newUser);
  await db.write();

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

  const user = db.data.users.find(
    (stored) => normalizeEmail(stored.email) === normalizedEmail && stored.password === normalizedPassword
  );

  if (!user) {
    return res.status(401).json({ ok: false, error: 'E-mail ou senha inválidos.' });
  }

  res.json({ ok: true, user: sanitizeUser(user) });
});

app.get('/api/models', async (req, res) => {
  await ensureDb();
  const { featured, city, email, online } = req.query;
  const includeUnpaid = req.query.includeUnpaid === 'true';
  let models = [...db.data.models];

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

  res.json({ ok: true, models });
});

app.get('/api/models/:id', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  res.json({ ok: true, model });
});

app.get('/api/admin/users', async (_req, res) => {
  await ensureDb();
  res.json({ ok: true, users: db.data.users.map(sanitizeUser) });
});

app.get('/api/admin/models', async (_req, res) => {
  await ensureDb();
  res.json({ ok: true, models: db.data.models });
});

app.post('/api/models', async (req, res) => {
  await ensureDb();
  const payload = req.body || {};

  if (!payload.name || !payload.email) {
    return res.status(400).json({ ok: false, error: 'Nome e e-mail são obrigatórios.' });
  }

  const normalizedModelEmail = normalizeEmail(payload.email);
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

  const existingModel = db.data.models.find(
    (model) => normalizeEmail(model.email) === normalizedModelEmail
  );

  const existingBilling = existingModel?.billing ?? null;
  const existingPayments = existingModel?.payments ?? [];

  const modelPayload = {
    name: payload.name.trim(),
    email: normalizedModelEmail,
    age: payload.age ?? null,
    phone: payload.phone ?? '',
    bio: payload.bio ?? '',
    services: Array.isArray(payload.services) ? payload.services : [],
    prices: Array.isArray(payload.prices) ? payload.prices : [],
    attributes: payload.attributes ?? {},
    location: payload.location ?? null,
    map: mapPoint,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
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

  let savedModel = null;
  if (existingModel) {
    Object.assign(existingModel, modelPayload, { updatedAt: new Date().toISOString() });
    savedModel = existingModel;
  } else {
    savedModel = {
      id: nanoid(),
      ...modelPayload,
      createdAt: new Date().toISOString(),
    };
    db.data.models.push(savedModel);
  }
  await db.write();

  res.json({ ok: true, model: savedModel });
});

app.patch('/api/models/:id', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }

  const payload = req.body || {};
  const updates = {
    name: typeof payload.name === 'string' ? payload.name.trim() : model.name,
    age: payload.age ?? model.age ?? null,
    phone: typeof payload.phone === 'string' ? payload.phone : model.phone ?? '',
    bio: typeof payload.bio === 'string' ? payload.bio : model.bio ?? '',
    services: Array.isArray(payload.services) ? payload.services : model.services ?? [],
    prices: Array.isArray(payload.prices) ? payload.prices : model.prices ?? [],
    attributes: payload.attributes ?? model.attributes ?? {},
    location: payload.location ?? model.location ?? null,
    map: payload.map ?? model.map ?? null,
    photos: Array.isArray(payload.photos) ? payload.photos : model.photos ?? [],
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
  };

  Object.assign(model, updates, { updatedAt: new Date().toISOString() });
  await db.write();

  res.json({ ok: true, model });
});

app.post('/api/models/:id/payments', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
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
  await db.write();

  res.json({ ok: true, model });
});

app.post('/api/models/:id/events', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
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
  await db.write();
  res.json({ ok: true });
});

app.post('/api/models/:id/rate', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const value = Number(req.body?.value);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    return res.status(400).json({ ok: false, error: 'Nota inválida.' });
  }
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
  notifications.unshift({
    id: nanoid(),
    type: 'rating',
    title: 'Nova avaliacao',
    message: `Voce recebeu ${value} estrela${value > 1 ? 's' : ''}.`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await db.write();
  res.json({ ok: true });
});

app.get('/api/models/:id/metrics', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const stats = ensureModelStats(model);
  const todayKey = getTodayKey();
  const viewsToday = Number(stats.views?.[todayKey] || 0);
  const whatsappToday = Number(stats.whatsapp?.[todayKey] || 0);
  const ratingCount = Number(stats.ratings?.count || 0);
  const ratingAvg = ratingCount ? Number((stats.ratings.sum / ratingCount).toFixed(2)) : 0;
  const whatsapp30 = sumLastDays(stats.whatsapp, 30);
  const estimatedEarningsMonth = whatsapp30 * 50;

  res.json({
    ok: true,
    metrics: {
      viewsToday,
      whatsappToday,
      ratingAvg,
      ratingCount,
      estimatedEarningsMonth,
    },
  });
});

app.get('/api/models/:id/comments', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  ensureModelComments(model);
  res.json({ ok: true, comments: model.comments });
});

app.post('/api/models/:id/comments', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
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
  notifications.unshift({
    id: nanoid(),
    type: 'comment',
    title: 'Novo comentario',
    message: `${cleanName} deixou um comentario no seu perfil.`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await db.write();

  res.json({ ok: true, comment: newComment });
});

app.get('/api/models/:id/notifications', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const notifications = backfillNotifications(model);
  await db.write();
  res.json({ ok: true, notifications });
});

app.post('/api/models/:id/notifications/read-all', async (req, res) => {
  await ensureDb();
  const model = db.data.models.find((item) => item.id === req.params.id);
  if (!model) {
    return res.status(404).json({ ok: false, error: 'Perfil não encontrado.' });
  }
  const notifications = ensureModelNotifications(model);
  notifications.forEach((notification) => {
    notification.read = true;
  });
  model.notifications = notifications;
  model.updatedAt = new Date().toISOString();
  await db.write();
  res.json({ ok: true });
});

app.post('/api/admin/reset', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Operação não permitida.' });
  }

  await ensureDb();
  db.data.users = [];
  db.data.models = [];
  await db.write();
  res.json({ ok: true });
});

app.get('/api/stats', async (_req, res) => {
  await ensureDb();
  const totalModels = db.data.models.length;
  const totalUsers = db.data.users.length;

  res.json({
    ok: true,
    stats: [
      { value: `+${totalUsers}`, label: 'de usuários' },
      { value: `+${totalModels}`, label: 'acompanhantes' },
      { value: '+0', label: 'de vídeos' },
      { value: '+0', label: 'avaliações' },
    ],
  });
});

const PORT = process.env.PORT || 5174;

ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API pronta em http://localhost:${PORT}`);
  });
});
