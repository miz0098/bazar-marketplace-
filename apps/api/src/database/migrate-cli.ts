import { readDatabaseConfig } from './config.js';
import { migrate } from './migrations.js';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Production migrations require a separately approved release workflow');
  const config = readDatabaseConfig(process.env, true);
  if (!config) throw new Error('MIGRATION_DATABASE_URL is required');
  const count = await migrate(config);
  process.stdout.write(JSON.stringify({ event: 'migrations_complete', applied: count }) + '\n');
}
main().catch(() => { process.stderr.write('Database migration failed. No connection or SQL details are logged.\n'); process.exitCode = 1; });
