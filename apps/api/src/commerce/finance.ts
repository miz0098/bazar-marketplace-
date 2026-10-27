import {randomInt} from 'node:crypto';
import {safeAmount,PricingPolicyError,type DiscountRule} from '../promotions/pricing.js';
export type Rounding='exact-only'|'half-up'|'half-even';
export const calculationVersion='commerce-v2-half-up';
export const roundingPolicy='positive-minor-half-up-v1';
/** Non-negative rational minor units: floor(n/d), add one iff 2*remainder >= denominator. */
export function roundHalfUp(n:bigint,d:bigint):bigint {
 if(n<0n||d<=0n)throw new Error('Invalid rational');
 const quotient=n/d,remainder=n%d;
 return quotient+(2n*remainder>=d?1n:0n);
}
export function rounded(n:bigint,d:bigint,policy:Rounding):bigint{
 if(n<0n||d<=0n)throw new Error('Invalid rational');
 if(policy==='half-up')return roundHalfUp(n,d);
 const q=n/d,r=n%d;if(!r)return q;if(policy==='exact-only')throw new PricingPolicyError();
 return q+(2n*r>d||2n*r===d&&q%2n===1n?1n:0n);
}
export function amount(n:bigint){if(n<0n||n>BigInt(Number.MAX_SAFE_INTEGER))throw new PricingPolicyError();return Number(n);}
export interface FinancialLine {lineId:string;sellerId:string;quantity:number;unitPriceMinor:number;eligible:boolean}
/** Allocation independent of caller iteration order. Stable immutable variant UUID is the cart line identity. */
export function allocate(total:bigint,weights:readonly {id:string;weight:bigint}[]){
 const sorted=[...weights].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(new Set(sorted.map(x=>x.id)).size!==sorted.length||sorted.some(x=>x.weight<0n))throw new Error('Invalid allocation identities');
 const sum=sorted.reduce((n,x)=>n+x.weight,0n);if(total<0n||total>sum)throw new Error('Invalid allocation capacity');
 const rows=sorted.map(x=>({...x,assigned:sum?total*x.weight/sum:0n,remainder:sum?total*x.weight%sum:0n}));
 let left=total-rows.reduce((n,x)=>n+x.assigned,0n);
 const ranked=[...rows].sort((a,b)=>a.remainder>b.remainder?-1:a.remainder<b.remainder?1:a.id<b.id?-1:a.id>b.id?1:0);
 for(const r of ranked){if(!left)break;if(r.assigned<r.weight){r.assigned++;left--;}}
 if(left)throw new Error('Allocation cannot reconcile');return new Map(rows.map(r=>[r.id,r.assigned]));
}
export function calculateCommerce(input:readonly FinancialLine[],rule:DiscountRule|null,rounding:Rounding='half-up'){
 if(!input.length||input.length>1000||new Set(input.map(l=>l.lineId)).size!==input.length)throw new PricingPolicyError();
 const lines=[...input].sort((a,b)=>a.lineId<b.lineId?-1:a.lineId>b.lineId?1:0).map(l=>{safeAmount(l.unitPriceMinor);if(!Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>2147483647)throw new PricingPolicyError();return {...l,gross:BigInt(l.unitPriceMinor)*BigInt(l.quantity)};});
 const eligible=lines.filter(l=>l.eligible).reduce((n,l)=>n+l.gross,0n),gross=lines.reduce((n,l)=>n+l.gross,0n);
 let discount=0n;
 if(rule){if(rule.kind==='fixed'){safeAmount(rule.amountMinor);if(!rule.amountMinor)throw new PricingPolicyError();discount=BigInt(rule.amountMinor);}else{if(!Number.isInteger(rule.basisPoints)||rule.basisPoints<1||rule.basisPoints>10000)throw new PricingPolicyError();discount=rounded(eligible*BigInt(rule.basisPoints),10000n,rounding);}if(discount>eligible)discount=eligible;}
 const shares=allocate(discount,lines.map(l=>({id:l.lineId,weight:l.eligible?l.gross:0n})));
 const result=lines.map(l=>({lineId:l.lineId,sellerId:l.sellerId,quantity:l.quantity,unitPriceMinor:l.unitPriceMinor,eligible:l.eligible,grossMinor:amount(l.gross),discountMinor:amount(shares.get(l.lineId)!),netMinor:amount(l.gross-shares.get(l.lineId)!)}));
 const sellers=[...new Set(lines.map(l=>l.sellerId))].sort().map(sellerId=>{const own=result.filter(l=>l.sellerId===sellerId),net=own.reduce((n,l)=>n+BigInt(l.netMinor),0n),commission=rounded(net*5n,100n,rounding);return {sellerId,currency:'UAH' as const,grossMinor:amount(own.reduce((n,l)=>n+BigInt(l.grossMinor),0n)),discountMinor:amount(own.reduce((n,l)=>n+BigInt(l.discountMinor),0n)),netMinor:amount(net),commissionBasisPoints:500,commissionMinor:amount(commission),sellerMinor:amount(net-commission)};});
 return {version:rounding==='half-up'?calculationVersion:'commerce-v1-largest-remainder',...(rounding==='half-up'?{roundingPolicy,commissionBasis:'seller-net-merchandise-after-promotions-excluding-shipping' as const}:{}),allocation:'largest-remainder-immutable-line-id' as const,rounding,currency:'UAH' as const,grossMinor:amount(gross),discountMinor:amount(discount),netMinor:amount(gross-discount),commissionMinor:amount(sellers.reduce((n,s)=>n+BigInt(s.commissionMinor),0n)),sellerMinor:amount(sellers.reduce((n,s)=>n+BigInt(s.sellerMinor),0n)),lines:result,sellers};
}
export const generatePromoCode=()=>`BZ${String(randomInt(100000000000)).padStart(11,'0')}`;
/** Call only from a capability-checked operator service; no buyer creation endpoint exists. */
export async function insertUniquePromo(create:(code:string)=>Promise<boolean>,generate:()=>string=generatePromoCode){for(let attempt=0;attempt<8;attempt++){const code=generate();if(!/^BZ\d{11}$/.test(code))throw new Error('Invalid generated code');if(await create(code))return code;}throw new Error('Promotion identifier collision budget exhausted');}
