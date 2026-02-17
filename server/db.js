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

  await query(`
    CREATE TABLE IF NOT EXISTS registration_leads (
      id text PRIMARY KEY,
      name text NOT NULL,
      phone text NOT NULL,
      phone_normalized text UNIQUE NOT NULL,
      status text NOT NULL DEFAULT 'started',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id text PRIMARY KEY,
      email text NOT NULL,
      user_id text NULL REFERENCES users(id) ON DELETE SET NULL,
      token text NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      token_sent_at timestamptz NULL,
      resolved_at timestamptz NULL
    );
  `);

  // Backward-compatible migrations for environments where table already exists.
  await query(`ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS token text NULL;`);
  await query(`ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS token_sent_at timestamptz NULL;`);

  await query(`CREATE INDEX IF NOT EXISTS payments_model_id_idx ON payments(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS events_model_id_idx ON events(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS comments_model_id_idx ON comments(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS notifications_model_id_idx ON notifications(model_id);`);
  await query(`CREATE INDEX IF NOT EXISTS registration_leads_status_idx ON registration_leads(status);`);
  await query(`CREATE INDEX IF NOT EXISTS registration_leads_updated_idx ON registration_leads(updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS password_reset_requests_status_idx ON password_reset_requests(status);`);
  await query(`CREATE INDEX IF NOT EXISTS password_reset_requests_updated_idx ON password_reset_requests(updated_at DESC);`);
};

export const checkDb = async () => {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
