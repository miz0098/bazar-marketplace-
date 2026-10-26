import assert from 'node:assert/strict';
import test from 'node:test';
import { readConfig } from '../src/config.js';
import { createLogger } from '../src/logger.js';

test('configuration has local defaults, strict ranges and explicit production origins', () => {
  assert.equal(readConfig({}).host, '127.0.0.1');
  assert.equal(readConfig({}).port, 4000);
  assert.equal(readConfig({ NODE_ENV: 'test', PORT: '0' }).port, 0);
  const production = readConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'https://bazar.ua,https://bazar.ua' });
  assert.deepEqual(production.corsOrigins, ['https://bazar.ua']);
  assert.deepEqual(readConfig({ NODE_ENV: 'production', CORS_ORIGINS: '' }).corsOrigins, []);
  for (const env of [
    { NODE_ENV: 'other' }, { PORT: '0' }, { PORT: '65536' }, { PORT: '4000secret' }, { PORT: '' },
    { HOST: 'example.invalid' }, { LOG_LEVEL: 'secret' }, { SHUTDOWN_TIMEOUT_MS: '0' },
    { CORS_ORIGINS: '*' }, { CORS_ORIGINS: 'null' }, { CORS_ORIGINS: 'https://bazar.ua/path' },
    { CORS_ORIGINS: 'https://user:secret@example.invalid' },
    { NODE_ENV: 'production' }, { NODE_ENV: 'production', CORS_ORIGINS: 'http://localhost:3000' },
  ]) assert.throws(() => readConfig(env));
  assert.throws(() => readConfig({ PORT: 'secret-value' }), (error: unknown) => error instanceof Error && error.message === 'Invalid PORT');
});

test('logger constructs safe records and drops raw payloads, credentials and untrusted labels', () => {
  const lines: string[] = [];
  const logger = createLogger('info', (line) => lines.push(line));
  logger.write(Object.assign({ event: 'request' as const, status: 404 }, { secret: 'do-not-log', authorization: 'Bearer private-token', url: '/?phone=private-phone', body: 'private-message' }));
  const entry = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(entry).sort(), ['event', 'level', 'status', 'timestamp']);
  assert.doesNotMatch(lines[0], /do-not-log|private-token|private-phone|private-message/);
  createLogger('error', (line) => lines.push(line)).write({ event: 'startup', port: 4000 });
  assert.equal(lines.length, 1);
  createLogger('error', (line) => lines.push(line)).write({ event: 'server_error' });
  assert.equal(lines.length, 2);
});
