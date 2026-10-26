import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { DatabaseConfig } from './config.js';

export const migrationDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
export interface Migration { readonly version: string; readonly checksum: string; readonly sql: string }

export function readMigrations(directory = migrationDirectory): readonly Migration[] {
  const names = readdirSync(directory).sort();
  if (!names.length || names.some((name, index) => !new RegExp(`^${String(index + 1).padStart(4, '0')}_[a-z0-9_]+\\.sql$`).test(name))) throw new Error('Invalid migration inventory');
  return names.map((name) => {
    const sql = readFileSync(`${directory}/${name}`, 'utf8');
    return { version: name.slice(0, 4), sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}

export function schemaMatches(rows: readonly { version: string; checksum: string }[], expected: readonly Migration[]): boolean {
  return rows.length === expected.length && rows.every((row, index) => row.version === expected[index].version && row.checksum === expected[index].checksum);
}

/** Explicit owner-only command; never called by server startup. One session holds the advisory lock. */
export async function migrate(config: DatabaseConfig, directory = migrationDirectory): Promise<number> {
  const expected = readMigrations(directory);
  const client = new pg.Client({ connectionString: config.connectionString, ssl: config.ssl, connectionTimeoutMillis: config.timeoutMs, statement_timeout: 30000, query_timeout: 35000, application_name: 'bazar-migrator' });
  let connected = false;
  try {
    await client.connect(); connected = true;
    await client.query("SET lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_lock(743201)');
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA IF NOT EXISTS bazar_meta');
    await client.query('REVOKE ALL ON SCHEMA bazar_meta FROM PUBLIC');
    await client.query("CREATE TABLE IF NOT EXISTS bazar_meta.schema_migrations (version text PRIMARY KEY CHECK (version ~ '^[0-9]{4}$'), checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL DEFAULT now())");
    await client.query('REVOKE ALL ON bazar_meta.schema_migrations FROM PUBLIC');
    await client.query('COMMIT');
    const applied = (await client.query<{ version: string; checksum: string }>('SELECT version, checksum FROM bazar_meta.schema_migrations ORDER BY version')).rows;
    if (applied.length > expected.length || !applied.every((row, index) => row.version === expected[index].version && row.checksum === expected[index].checksum)) throw new Error('Migration history mismatch');
    let count = 0;
    for (const migration of expected.slice(applied.length)) {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query('INSERT INTO bazar_meta.schema_migrations(version, checksum) VALUES ($1, $2)', [migration.version, migration.checksum]);
      await client.query('COMMIT'); count++;
    }
    return count;
  } catch {
    if (connected) await client.query('ROLLBACK').catch(() => {});
    // Do not print pg errors: they may contain connection details or SQL/PII.
    throw new Error('Database migration failed; inspect the reviewed migration inventory and database permissions.');
  } finally {
    // Closing the dedicated session also releases its advisory lock, including failed runs.
    await client.end().catch(() => {});
  }
}
