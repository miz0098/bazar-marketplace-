import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {lifecycleFixture} from './lifecycle.js';
import type {FlowPolicy} from '../../src/commerce/order-flow.js';
/** Explicit isolated UTC-calendar fixture, not a chosen production calendar/provider contract. */
export function orderFlowFixture(staffUserId:string){
 const key=randomBytes(32),refund=lifecycleFixture(),clock={now:new Date()};
 const sign=(e:unknown)=>{const raw=Buffer.from(JSON.stringify(e));return {raw,signature:createHmac('sha256',key).update(raw).digest('hex')};};
 const policy:FlowPolicy={scope:'isolated-test',allowTestResolutions:true,refund:refund.adapter,deadline:{staffUserId,revision:'synthetic-utc-calendar-five-days',now:()=>clock.now,due:start=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+5);return d;}},transport:{scope:'isolated-test',async verify(raw,signature){if(!/^[0-9a-f]{64}$/.test(signature)||!timingSafeEqual(createHmac('sha256',key).update(raw).digest(),Buffer.from(signature,'hex')))throw new Error('Unverified fixture');return JSON.parse(new TextDecoder().decode(raw));}}};
 return {policy,sign,refund,clock};
}
