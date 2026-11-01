import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {safeLocalRedirect} from './browser/gateway.js';
import {codespacesOrigin,forwardedHostAllowed} from './browser/codespaces.js';

test('Codespaces origin is exact configuration and forwarded metadata cannot choose another host',()=>{
 const env={CODESPACES:'true',CODESPACE_NAME:'bazar-test',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
 const origin=codespacesOrigin(env)!;assert.equal(origin,'https://bazar-test-3000.app.github.dev');
 assert.equal(codespacesOrigin({}),null);
 assert.equal(safeLocalRedirect(origin,'/profile?a=1'),'/profile?a=1');assert.equal(safeLocalRedirect(origin,'http://bazar-test-3000.app.github.dev/profile'),'/profile');for(const url of ['//evil.example/path','https://evil.example/','javascript:alert(1)','https://user@bazar-test-3000.app.github.dev/'])assert.equal(safeLocalRedirect(origin,url),null);
 for(const patch of [{CODESPACE_NAME:'evil/path'},{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'evil.example'},{CODESPACE_NAME:''}])assert.throws(()=>codespacesOrigin({...env,...patch}));
 assert.ok(forwardedHostAllowed({host:'bazar-test-3000.app.github.dev'},origin));
 assert.ok(forwardedHostAllowed({host:'localhost:3000','x-forwarded-host':'bazar-test-3000.app.github.dev','x-forwarded-proto':'https'},origin));
 for(const h of [{host:'evil.example'},{host:'localhost:3000','x-forwarded-host':'evil.example','x-forwarded-proto':'https'},{host:'localhost:3000','x-forwarded-host':'bazar-test-3000.app.github.dev','x-forwarded-proto':'http'},{host:'localhost:3000','x-forwarded-host':['bazar-test-3000.app.github.dev'],'x-forwarded-proto':'https'}])assert.equal(forwardedHostAllowed(h,origin),false);
});
test('fixed OTP123456 requires isolated test composition and is always rejected in production',()=>{
 const script=`import assert from 'node:assert/strict';import {authFixture} from './tests/helpers/auth.ts';import {validateAuthConfig} from './src/auth/config.ts';const c=authFixture().config;c.fixedOtp='123456';if(process.env.EXPECT_ALLOW==='1')validateAuthConfig(c);else assert.throws(()=>validateAuthConfig(c));`;
 for(const [mode,full,browser,allow]of [['test','1','1','1'],['test','0','1','0'],['test','1','0','0'],['production','1','1','0']]){
  const r=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{env:{...process.env,NODE_ENV:mode,BAZAR_FULL_SIMULATION:full,BAZAR_BROWSER_INTEGRATION:browser,EXPECT_ALLOW:allow},encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);
 }
});
