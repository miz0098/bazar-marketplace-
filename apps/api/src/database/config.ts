export interface DatabaseConfig {
  readonly connectionString: string;
  readonly ssl: false | { readonly rejectUnauthorized: true };
  readonly timeoutMs: number;
  readonly requireRestrictedRole: boolean;
}

export function readDatabaseConfig(env: Readonly<Record<string, string | undefined>>, migration = false): DatabaseConfig | undefined {
  const key = migration ? 'MIGRATION_DATABASE_URL' : 'DATABASE_URL';
  const value = env[key];
  if (value === undefined || value === '') return undefined;
  const fail = () => { throw new Error(`Invalid ${key}`); };
  let url: URL;
  try { url = new URL(value); decodeURIComponent(url.username); decodeURIComponent(url.password); } catch { return fail(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2 || url.search || url.hash) return fail();
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  const ssl = env[migration ? 'MIGRATION_DATABASE_SSL' : 'DATABASE_SSL'] ?? (local && env.NODE_ENV !== 'production' ? 'disable' : 'verify-full');
  if (!['disable', 'verify-full'].includes(ssl) || (ssl === 'disable' && (!local || env.NODE_ENV === 'production'))) return fail();
  const timeout = env.DATABASE_TIMEOUT_MS ?? '1500';
  if (!/^\d+$/.test(timeout) || Number(timeout) < 100 || Number(timeout) > 5000) throw new Error('Invalid DATABASE_TIMEOUT_MS');
  return { connectionString: value, ssl: ssl === 'disable' ? false : { rejectUnauthorized: true }, timeoutMs: Number(timeout), requireRestrictedRole: env.NODE_ENV === 'production' };
}
