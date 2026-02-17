import { nanoid } from 'nanoid';
import { query } from '../db.js';

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const stripModelData = (model) => {
  if (!model) return {};
  const { id, email, createdAt, updatedAt, ...data } = model;
  delete data.id;
  delete data.email;
  delete data.createdAt;
  delete data.updatedAt;
  return data;
};

const rowToUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password_hash,
  role: row.role,
  createdAt: toIso(row.created_at),
});

const rowToModel = (row) => {
  const data = { ...(row.data || {}) };
  delete data.id;
  delete data.email;
  delete data.createdAt;
  delete data.updatedAt;
  return {
    id: row.id,
    email: row.email,
    ...data,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
};

const rowToRegistrationLead = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  phoneNormalized: row.phone_normalized,
  status: row.status,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  completedAt: toIso(row.completed_at),
});

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

const getTodayKey = () => new Date().toISOString().slice(0, 10);

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

const ensureModelStats = (model) => {
  if (!model.stats) {
    model.stats = { views: {}, whatsapp: {}, ratings: { sum: 0, count: 0 } };
  }
  if (!model.stats.views) model.stats.views = {};
  if (!model.stats.whatsapp) model.stats.whatsapp = {};
  if (!model.stats.ratings) model.stats.ratings = { sum: 0, count: 0 };
  return model.stats;
};

export const metrics = (model) => {
  const stats = ensureModelStats(model);
  const todayKey = getTodayKey();
  const viewsToday = Number(stats.views?.[todayKey] || 0);
  const whatsappToday = Number(stats.whatsapp?.[todayKey] || 0);
  const ratingCount = Number(stats.ratings?.count || 0);
  const ratingAvg = ratingCount ? Number((stats.ratings.sum / ratingCount).toFixed(2)) : 0;
  const whatsapp30 = sumLastDays(stats.whatsapp, 30);
  const estimatedEarningsMonth = whatsapp30 * 50;

  return {
    viewsToday,
    whatsappToday,
    ratingAvg,
    ratingCount,
    estimatedEarningsMonth,
  };
};

export const createUser = async ({ id, name, email, password, role, createdAt }) => {
  const created = createdAt || new Date().toISOString();
  await query(
    `INSERT INTO users (id, email, password_hash, name, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, email, password, name, role, created]
  );
  return { id, name, email, password, role, createdAt: created };
};

export const findUserByEmail = async (email) => {
  const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return rows[0] ? rowToUser(rows[0]) : null;
};

export const findUserById = async (id) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
};

export const listUsers = async () => {
  const { rows } = await query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(rowToUser);
};

export const updateUserPassword = async (id, password) => {
  const { rows } = await query(
    'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING *',
    [id, password]
  );
  return rows[0] ? rowToUser(rows[0]) : null;
};

export const deleteUser = async (id) => {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
};

export const getModelByEmail = async (email) => {
  const { rows } = await query('SELECT * FROM models WHERE email = $1 LIMIT 1', [email]);
  return rows[0] ? rowToModel(rows[0]) : null;
};

export const getModelById = async (id) => {
  const { rows } = await query('SELECT * FROM models WHERE id = $1 LIMIT 1', [id]);
  return rows[0] ? rowToModel(rows[0]) : null;
};

export const listModels = async ({ email } = {}) => {
  if (email) {
    const { rows } = await query('SELECT * FROM models WHERE email = $1', [email]);
    return rows.map(rowToModel);
  }
  const { rows } = await query('SELECT * FROM models');
  return rows.map(rowToModel);
};

export const upsertModel = async (model) => {
  const data = stripModelData(model);
  const createdAt = model.createdAt || new Date().toISOString();
  const updatedAt = model.updatedAt || new Date().toISOString();
  const { rows } = await query(
    `INSERT INTO models (id, email, data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email)
     DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [model.id, model.email, data, createdAt, updatedAt]
  );
  return rows[0] ? rowToModel(rows[0]) : null;
};

export const updateModel = async (id, model) => {
  const data = stripModelData(model);
  const updatedAt = model.updatedAt || new Date().toISOString();
  const { rows } = await query(
    `UPDATE models SET email = $2, data = $3, updated_at = $4 WHERE id = $1 RETURNING *`,
    [id, model.email, data, updatedAt]
  );
  return rows[0] ? rowToModel(rows[0]) : null;
};

export const deleteModel = async (id) => {
  await query('DELETE FROM models WHERE id = $1', [id]);
};

export const addPayment = async (modelId, payment) => {
  const id = payment.id || nanoid();
  const createdAt = payment.createdAt || new Date().toISOString();
  const data = { ...payment, id };
  await query(
    `INSERT INTO payments (id, model_id, data, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, modelId, data, createdAt]
  );
  return id;
};

export const addEvent = async (modelId, type) => {
  const id = nanoid();
  const createdAt = new Date().toISOString();
  await query(
    `INSERT INTO events (id, model_id, type, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, modelId, type, createdAt]
  );
  return id;
};

export const rate = async (modelId, value) => {
  const id = nanoid();
  const createdAt = new Date().toISOString();
  await query(
    `INSERT INTO events (id, model_id, type, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, modelId, `rating:${value}`, createdAt]
  );
  return id;
};

export const addComment = async (modelId, comment) => {
  const id = comment.id || nanoid();
  const createdAt = comment.createdAt || new Date().toISOString();
  const data = { ...comment, id };
  await query(
    `INSERT INTO comments (id, model_id, data, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, modelId, data, createdAt]
  );
  return id;
};

export const addNotification = async (modelId, notification) => {
  const id = notification.id || nanoid();
  const createdAt = notification.createdAt || new Date().toISOString();
  const readAt = notification.read ? createdAt : null;
  const data = { ...notification, id };
  await query(
    `INSERT INTO notifications (id, model_id, data, created_at, read_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [id, modelId, data, createdAt, readAt]
  );
  return id;
};

export const markNotificationsRead = async (modelId) => {
  const readAt = new Date().toISOString();
  await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, $2) WHERE model_id = $1`,
    [modelId, readAt]
  );
};

export const upsertRegistrationLead = async ({ name, phone, phoneNormalized }) => {
  const id = nanoid();
  const now = new Date().toISOString();
  const { rows } = await query(
    `INSERT INTO registration_leads (id, name, phone, phone_normalized, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'started', $5, $5)
     ON CONFLICT (phone_normalized)
     DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [id, name, phone, phoneNormalized, now]
  );
  return rows[0] ? rowToRegistrationLead(rows[0]) : null;
};

export const completeRegistrationLead = async ({ name, phone, phoneNormalized }) => {
  const id = nanoid();
  const now = new Date().toISOString();
  const { rows } = await query(
    `INSERT INTO registration_leads (id, name, phone, phone_normalized, status, created_at, updated_at, completed_at)
     VALUES ($1, $2, $3, $4, 'completed', $5, $5, $5)
     ON CONFLICT (phone_normalized)
     DO UPDATE SET
       status = 'completed',
       completed_at = COALESCE(registration_leads.completed_at, EXCLUDED.completed_at),
       updated_at = EXCLUDED.updated_at,
       name = COALESCE(registration_leads.name, EXCLUDED.name),
       phone = COALESCE(registration_leads.phone, EXCLUDED.phone)
     RETURNING *`,
    [id, name || '', phone || phoneNormalized, phoneNormalized, now]
  );
  return rows[0] ? rowToRegistrationLead(rows[0]) : null;
};

export const listRegistrationLeads = async () => {
  const { rows } = await query('SELECT * FROM registration_leads ORDER BY updated_at DESC');
  return rows.map(rowToRegistrationLead);
};

export const resetDatabase = async () => {
  await query('TRUNCATE TABLE notifications, comments, events, payments, models, users RESTART IDENTITY');
};

export { isBillingActive };
