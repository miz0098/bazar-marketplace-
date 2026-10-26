import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = `bazar-f2-test-${randomBytes(6).toString('hex')}`;
const password = randomBytes(32).toString('hex');
const env = { ...process.env, BAZAR_POSTGRES_PASSWORD: password };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
if (process.env.GITHUB_ACTIONS === 'true') process.stdout.write(`::add-mask::${password}\n`);
const args = ['--host=unix:///var/run/docker.sock', 'compose', '-p', project, '-f', fileURLToPath(new URL('../../../infra/postgres/compose.test.yaml', import.meta.url))];
const docker = (extra, capture = false) => {
  const result = spawnSync('docker', [...args, ...extra], { env, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Local PostgreSQL test container command failed');
  return result.stdout?.trim();
};
try {
  docker(['up', '-d', '--wait', '--wait-timeout', '60']);
  const address = docker(['port', 'postgres', '5432'], true);
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error('Test database must bind only to loopback');
  const databaseUrl = `postgresql://bazar_test_owner:${password}@${address}/bazar_f2_test`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'tests/integration/postgres.test.ts'], { env: { ...env, DATABASE_TEST_URL: databaseUrl, BAZAR_INTEGRATION_TEST: '1', NODE_ENV: 'test' }, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch {
  process.stderr.write('PostgreSQL integration run failed. No credentials are printed.\n'); process.exitCode = 1;
} finally {
  try { docker(['down', '--volumes', '--remove-orphans']); } catch { process.stderr.write(`Clean up isolated test project: ${project}\n`); process.exitCode = 1; }
}
