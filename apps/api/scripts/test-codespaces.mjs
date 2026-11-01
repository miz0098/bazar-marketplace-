import {spawn} from 'node:child_process';
import {createWriteStream,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const root=path.resolve(import.meta.dirname,'../../..'),dir=mkdtempSync(path.join(tmpdir(),'bazar-codespaces-')),log=path.join(dir,'run.log');
const env={...process.env,BAZAR_FULL_SIMULATION:'1',BAZAR_STOREFRONT_INTEGRATION:'1',CODESPACES:'true',CODESPACE_NAME:'bazar-forwarding-check',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
const origin='https://bazar-forwarding-check-3000.app.github.dev',host=new URL(origin).host;
const output=createWriteStream(log),runner=spawn(process.execPath,['apps/api/scripts/test-browser.mjs','--serve'],{cwd:root,env,stdio:['ignore','pipe','pipe']});runner.stdout.pipe(output);runner.stderr.pipe(output);
let succeeded=false;
const jar=new Map();
async function call(url,body,extra={}){
 const r=await fetch('http://127.0.0.1:3000'+url,{method:body===undefined?'GET':'POST',headers:{host,'x-forwarded-host':host,'x-forwarded-proto':'https',origin,'sec-fetch-site':'same-origin',cookie:[...jar].map(([k,v])=>`${k}=${v}`).join(';'),...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of r.headers.getSetCookie()){assert.match(cookie,/;\s*Secure/i);assert.match(cookie,/;\s*HttpOnly/i);assert.match(cookie,/;\s*SameSite=Strict/i);const [key,value]=cookie.split(';')[0].split('=');jar.set(key,value);}
 return r;
}
try{
 let ready=false;
 for(let i=0;i<450;i++){if(runner.exitCode!==null)throw new Error('Codespaces runner exited before readiness');try{if(readFileSync(log,'utf8').includes('BAZAR: '+origin)){ready=true;break;}}catch{/* The log is created asynchronously. */}await new Promise(r=>setTimeout(r,200));}
 assert.ok(ready,'Forwarded port startup timed out');
 const redirect=await fetch('http://127.0.0.1:3000/pages/delivery-payment',{redirect:'manual',headers:{host,'x-forwarded-host':host,'x-forwarded-proto':'https'}});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/help/delivery');
 const catalog=await call('/catalog');assert.equal(catalog.status,200);const html=await catalog.text();assert.match(html,/data-offer-id="[a-f0-9-]+"/);assert.doesNotMatch(html,/Каталог недоступний|Не вдалося відкрити каталог|Не вдалося завантажити сторінку/);
 assert.equal((await call('/api/v1/auth/csrf',undefined,{host:'localhost:3000','x-forwarded-host':'evil.example'})).status,403);
 assert.equal((await call('/api/v1/auth/csrf',undefined,{origin:'https://evil.example'})).status,403);
 const csrf=(await(await call('/api/v1/auth/csrf')).json()).data.csrfToken;
 const challenge=(await(await call('/api/v1/auth/otp/challenges',{phone:'+380671119999',intent:'register'},{'x-csrf-token':csrf})).json()).data;
 assert.ok(challenge.challengeId);
 const profile={firstName:'Олена',lastName:'Коваль',consent:true};
 assert.equal((await call('/api/v1/auth/otp/verify',{challengeId:challenge.challengeId,code:'000001',profile},{'x-csrf-token':csrf})).status,401);
 const verified=await call('/api/v1/auth/otp/verify',{challengeId:challenge.challengeId,code:'123456',profile},{'x-csrf-token':csrf});assert.equal(verified.status,200);const session=(await verified.json()).data;
 assert.equal((await call('/api/v1/auth/session')).status,200);
 assert.equal((await call('/api/v1/auth/logout',{})).status,403);
 assert.equal((await call('/api/v1/auth/logout',{}, {'x-csrf-token':session.csrfToken})).status,200);
 assert.equal((await call('/api/v1/auth/session')).status,401);
 succeeded=true;
 process.stdout.write('Codespaces port3000 forwarding, exact Origin/Host, Secure cookies, server OTP and logout: passed\n');
}finally{
 if(runner.exitCode===null){runner.kill('SIGTERM');await Promise.race([once(runner,'exit'),new Promise((_,reject)=>{setTimeout(()=>reject(new Error('Runner shutdown timed out')),25000).unref();})]);}
 output.end();if(succeeded)rmSync(dir,{recursive:true,force:true});else process.stderr.write('Codespaces verification log: '+log+'\n');
}
