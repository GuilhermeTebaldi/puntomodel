import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao configurado.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const query = (text, params) => pool.query(text, params);

export const ensureSchema = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS models (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id text PRIMARY KEY,
      model_id text NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY,
      model_id text NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id text PRIMARY KEY,
      model_id text NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id text PRIMARY KEY,
      model_id text NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz NULL
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS payments_model_id_idx ON payments(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS events_model_id_idx ON events(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS comments_model_id_idx ON comments(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS notifications_model_id_idx ON notifications(model_id);`);
};

export const checkDb = async () => {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
