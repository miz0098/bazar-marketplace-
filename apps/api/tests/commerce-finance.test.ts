import assert from 'node:assert/strict';
import test from 'node:test';
import {allocate,calculateCommerce,generatePromoCode,rounded} from '../src/commerce/finance.js';
const lines=[{lineId:'a',sellerId:'A',quantity:1,unitPriceMinor:800000,eligible:true},{lineId:'b',sellerId:'B',quantity:1,unitPriceMinor:200000,eligible:true}];
test('F22 proportional fixed promotion and per-seller commission reconcile the approved example',()=>{const p=calculateCommerce(lines,{kind:'fixed',amountMinor:100000},'exact-only');assert.deepEqual(p.sellers.map(s=>[s.discountMinor,s.netMinor,s.commissionMinor,s.sellerMinor]),[[80000,720000,36000,684000],[20000,180000,9000,171000]]);assert.equal(p.netMinor,900000);assert.equal(p.commissionMinor,45000);assert.equal(p.sellerMinor,855000);});
test('F22 largest remainder resolves one-kopiyka ties by immutable IDs, never array order',()=>{const w=[{id:'b',weight:1n},{id:'a',weight:1n},{id:'c',weight:1n}];assert.deepEqual([...allocate(2n,w)],[['a',1n],['b',1n],['c',0n]]);assert.deepEqual([...allocate(2n,w.reverse())],[['a',1n],['b',1n],['c',0n]]);});
test('F22 eligibility, percentages, quantities, caps and zero eligible values never discount shipping or negative lines',()=>{const p=calculateCommerce([{...lines[0],quantity:2},{...lines[1],eligible:false}],{kind:'percentage',basisPoints:1000},'exact-only');assert.equal(p.discountMinor,160000);assert.equal(p.lines[1].discountMinor,0);const cap=calculateCommerce(lines,{kind:'fixed',amountMinor:2000000},'exact-only');assert.equal(cap.netMinor,0);assert.equal(cap.discountMinor,1000000);assert.equal(calculateCommerce(lines.map(l=>({...l,eligible:false})),{kind:'fixed',amountMinor:100},'exact-only').discountMinor,0);});
test('F22 unresolved financial rounding fails closed; explicit algorithms use rational arithmetic',()=>{assert.throws(()=>rounded(1n,2n,'exact-only'));assert.equal(rounded(1n,2n,'half-up'),1n);assert.equal(rounded(1n,2n,'half-even'),0n);assert.equal(rounded(3n,2n,'half-even'),2n);assert.throws(()=>calculateCommerce([{...lines[0],unitPriceMinor:1}],null,'exact-only'));});
test('F22 generated promotion identifiers satisfy the approved namespace and leading zeros are retained',()=>{const codes=Array.from({length:100},generatePromoCode);assert.ok(codes.every(c=>/^BZ\d{11}$/.test(c)));assert.equal(new Set(codes).size,100);});

test('F22 identifier collisions use bounded safe retry and never overwrite an existing campaign',async()=>{
 let attempts=0;const {insertUniquePromo}=await import('../src/commerce/finance.js');
 const code=await insertUniquePromo(async()=>++attempts===3,()=>`BZ${String(attempts).padStart(11,'0')}`);assert.equal(attempts,3);assert.equal(code,'BZ00000000002');
 let rejected=0;await assert.rejects(insertUniquePromo(async()=>{rejected++;return false;},()=> 'BZ00000000000'));assert.equal(rejected,8);
});
