import pg from 'pg';
import type { DatabaseConfig } from './config.js';
import { readMigrations, schemaMatches } from './migrations.js';

export function createDatabase(config: DatabaseConfig, onError: () => void = () => {}) {
  const expected = readMigrations();
  const pool = new pg.Pool({ connectionString: config.connectionString, ssl: config.ssl, max: 4, connectionTimeoutMillis: config.timeoutMs, idleTimeoutMillis: 10000, statement_timeout: config.timeoutMs, query_timeout: config.timeoutMs + 200, application_name: 'bazar-api' });
  pool.on('error', () => onError());
  let closing: Promise<void> | undefined;
  return {
    async check(): Promise<boolean> {
      if (closing) return false;
      try {
        const history = await pool.query<{ version: string; checksum: string }>('SELECT version, checksum FROM bazar_meta.schema_migrations ORDER BY version');
        if (!schemaMatches(history.rows, expected)) return false;
        if (config.requireRestrictedRole) {
          const result = await pool.query<{ safe: boolean }>("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls AND NOT has_schema_privilege(current_user, 'bazar', 'CREATE') AND NOT has_schema_privilege(current_user, 'bazar_meta', 'CREATE') AND NOT has_table_privilege(current_user, 'bazar_meta.schema_migrations', 'INSERT,UPDATE,DELETE,TRUNCATE') AS safe FROM pg_roles WHERE rolname = current_user");
          if (result.rows[0]?.safe !== true) return false;
        }
        return true;
      } catch { return false; }
    },
    close: () => closing ??= pool.end(),
  };
}
