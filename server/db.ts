import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'marauder',
  user: process.env.DB_USER || 'marauder',
  password: process.env.DB_PASSWORD || 'marauder_secret',
});

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS clauses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT NOT NULL CHECK (length(text) > 0),
        "order" INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status VARCHAR(20) NOT NULL DEFAULT 'signed',
        created_at TIMESTAMPTZ DEFAULT now(),
        signature1 TEXT NOT NULL,
        signature2 TEXT NOT NULL,
        clauses_snapshot JSONB NOT NULL
      );
    `);
    console.log('✅ Database tables initialized');
  } finally {
    client.release();
  }
}

// ─── Clauses ──────────────────────────────────────────────────────────────────

export async function getClauses() {
  const res = await pool.query(
    `SELECT id, title, text, "order" FROM clauses ORDER BY "order" ASC, created_at ASC`
  );
  return res.rows;
}

export async function createClause(title: string, text: string, order: number) {
  const res = await pool.query(
    `INSERT INTO clauses (title, text, "order") VALUES ($1, $2, $3) RETURNING id, title, text, "order"`,
    [title, text, order]
  );
  return res.rows[0];
}

export async function updateClause(id: string, title: string, text: string) {
  const res = await pool.query(
    `UPDATE clauses SET title = $1, text = $2 WHERE id = $3 RETURNING id, title, text, "order"`,
    [title, text, id]
  );
  return res.rows[0];
}

export async function deleteClause(id: string) {
  await pool.query(`DELETE FROM clauses WHERE id = $1`, [id]);
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function createContract(
  signature1: string,
  signature2: string,
  clausesSnapshot: object[]
) {
  const res = await pool.query(
    `INSERT INTO contracts (status, signature1, signature2, clauses_snapshot)
     VALUES ('signed', $1, $2, $3)
     RETURNING id, status, created_at`,
    [signature1, signature2, JSON.stringify(clausesSnapshot)]
  );
  return res.rows[0];
}

export async function getContractById(id: string) {
  const res = await pool.query(
    `SELECT id, status, created_at, signature1, signature2, clauses_snapshot
     FROM contracts WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function getLatestContract() {
  const res = await pool.query(
    `SELECT id, status, created_at, signature1, signature2, clauses_snapshot
     FROM contracts ORDER BY created_at DESC LIMIT 1`
  );
  return res.rows[0] || null;
}

export async function deleteAllContracts() {
  await pool.query(`DELETE FROM contracts`);
}

