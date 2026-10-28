import assert from 'node:assert/strict';
import test from 'node:test';
import { readDatabaseConfig } from '../src/database/config.js';
import { readMigrations, schemaMatches } from '../src/database/migrations.js';

test('database configuration is explicit, sanitized and verifies remote TLS', () => {
  assert.equal(readDatabaseConfig({}), undefined);
  assert.equal(readDatabaseConfig({ MIGRATION_DATABASE_URL: 'postgres://user:secret@127.0.0.1/test' }), undefined);
  assert.equal(readDatabaseConfig({ DATABASE_URL: 'postgres://user:secret@127.0.0.1/test' })?.ssl, false);
  assert.deepEqual(readDatabaseConfig({ DATABASE_URL: 'postgres://user:secret@db.invalid/test' })?.ssl, { rejectUnauthorized: true });
  for (const env of [
    { DATABASE_URL: 'invalid-secret' }, { DATABASE_URL: 'http://user:secret@db.invalid/test' },
    { DATABASE_URL: 'postgres://user:secret@db.invalid/test?sslmode=disable' },
    { DATABASE_URL: 'postgres://user:secret@db.invalid/test', DATABASE_SSL: 'disable' },
    { DATABASE_URL: 'postgres://user:secret@127.0.0.1/test', NODE_ENV: 'production', DATABASE_SSL: 'disable' },
    { DATABASE_URL: 'postgres://user:secret@127.0.0.1/test', DATABASE_TIMEOUT_MS: '0' },
    { DATABASE_URL: 'postgres://user@127.0.0.1/test' },
  ]) assert.throws(() => readDatabaseConfig(env), (error: unknown) => error instanceof Error && !error.message.includes('secret'));
});

test('migration inventory is ordered and schema validation fails closed on missing, modified or future history', () => {
  const migrations = readMigrations();
  assert.equal(migrations.length, 21);
  assert.equal(schemaMatches(migrations, migrations), true);
  assert.equal(schemaMatches([], migrations), false);
  assert.equal(schemaMatches([{ ...migrations[0], checksum: 'wrong' }, migrations[1]], migrations), false);
  assert.equal(schemaMatches([...migrations, { ...migrations[0], version: '0016' }], migrations), false);
});
