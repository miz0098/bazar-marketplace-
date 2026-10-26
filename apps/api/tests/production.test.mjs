import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import { createFoundationClient } from '../../storefront/lib/api-client.ts';

test('compiled API starts, serves health and exits cleanly on SIGTERM', { timeout: 6000 }, async (t) => {
  const child = spawn(process.execPath, ['dist/main.js'], { env: { PATH: process.env.PATH, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '0', CORS_ORIGINS: '', LOG_LEVEL: 'info', SHUTDOWN_TIMEOUT_MS: '500' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data; });
  const startup = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      const line = output.split('\n').find((line) => line.includes('"event":"startup"'));
      if (line) resolve(JSON.parse(line));
    });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`API exited before startup: ${code}`)));
  });
  const response = await fetch(`http://127.0.0.1:${startup.port}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.scope, 'process');
  const client = createFoundationClient({ baseUrl: `http://127.0.0.1:${startup.port}`, timeoutMs: 1000 });
  assert.equal((await client.getHealth()).scope, 'process');
  assert.equal((await client.getVersion()).businessModulesAvailable, false);
  assert.equal((await fetch(`http://127.0.0.1:${startup.port}/ready`)).status, 503);
  const disabled=await fetch(`http://127.0.0.1:${startup.port}/api/v1/auth/csrf`);
  assert.equal(disabled.status,503);assert.equal(disabled.headers.get('set-cookie'),null);
  const pricing=await fetch(`http://127.0.0.1:${startup.port}/api/v1/pricing/promotions/evaluate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({subtotal:1,code:'INVENTED'})});
  assert.equal(pricing.status,503);assert.equal(pricing.headers.get('set-cookie'),null);
  for(const path of ['/api/v1/orders','/api/v1/checkouts','/api/v1/delivery/carriers','/api/v1/delivery/quotes','/api/v1/payments/attempts','/api/v1/payments/webhooks/isolated']){const unavailable=await fetch(`http://127.0.0.1:${startup.port}${path}`);assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('set-cookie'),null);}
  const exit = once(child, 'exit');
  child.kill('SIGTERM');
  assert.equal((await exit)[0], 0);
  assert.equal(stderr, '');
});

test('invalid compiled configuration exits without echoing environment secrets', { timeout: 3000 }, async () => {
  const child = spawn(process.execPath, ['dist/main.js'], { env: { PATH: process.env.PATH, PORT: 'private-value', NODE_ENV: 'production', CORS_ORIGINS: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.doesNotMatch(output, /private-value|stack|Error:/);
  assert.equal(JSON.parse(output).event, 'configuration_error');
});


test('compiled runtime refuses test-auth activation even with production-like settings', {timeout:3000}, async()=>{
  const child=spawn(process.execPath,['dist/main.js'],{env:{PATH:process.env.PATH,NODE_ENV:'production',CORS_ORIGINS:'',AUTH_MODE:'test'},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});
  const [code]=await once(child,'exit');assert.equal(code,1);assert.equal(JSON.parse(output).event,'configuration_error');assert.doesNotMatch(output,/stack|OTP|phoneKey/);
});
