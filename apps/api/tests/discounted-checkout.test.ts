import assert from 'node:assert/strict';
import test from 'node:test';
import { discountedTestPlan } from '../src/payments/test-pricing.js';
import { spawnSync } from 'node:child_process';
test('F16 synthetic plan enforces exact safe server amounts and never runs in production',()=>{
 const run=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`import assert from 'node:assert/strict';import {discountedTestPlan as plan} from './src/payments/test-pricing.ts';const cash=n=>({amountMinor:n,currency:'UAH'});const p={subtotal:cash(12345),discount:cash(2469),merchandiseTotal:cash(9876),fingerprint:'a'.repeat(64),acknowledged:true};assert.equal(plan(p,7350).amountMinor,17226);assert.throws(()=>plan({...p,discount:cash(12345),merchandiseTotal:cash(0)},7350));for(const x of [-1,1.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>plan(p,x));assert.throws(()=>plan({...p,discount:cash(99999)},0));assert.throws(()=>plan({...p,subtotal:{amountMinor:12345,currency:'USD'}},0));`],{env:{...process.env,NODE_ENV:'test'},encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.throws(()=>discountedTestPlan({} as never,0),/Isolated/);
});
