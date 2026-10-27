import type {readOrderFlow} from './order-flow.js';
import type {DiscountRule} from '../promotions/pricing.js';
import type {calculateCommerce} from './finance.js';
export interface Contact {firstName:string;lastName:string;phone:string;email:string;comment:string}
export interface Delivery {sellerId:string;carrier:'nova-poshta'|'meest'|'ukrposhta';cityRef:string;pointRef:string;kind:'branch'|'parcel-locker';cityName:string;pointName:string;revision:string}
export interface CommerceLine {lineId:string;sellerId:string;sellerName:string;productId:string;variantId:string;sku:string;title:string;characteristics:Record<string,string>;quantity:number;unitPriceMinor:number;generation:string;variantVersion:number;categoryId:string}
export interface PromotionTerms {scope:'order'|'category'|'product';rule:DiscountRule;minSubtotalMinor:number;startsAt:string;endsAt:string}
export interface Snapshot {version:1;mode:'integration-test';contact:Contact;deliveries:Delivery[];items:CommerceLine[];financial:ReturnType<typeof calculateCommerce>;promoCode:string|null;promotionId:string|null;promotionVersion:number|null;promotionTerms:PromotionTerms|null;shippingPrice:'carrier-managed'}
export interface Quote {orderId?:string|null;id:string;cartVersion:number;snapshot:Snapshot}
export type PaymentState='initiated'|'pending'|'succeeded'|'declined'|'unknown'|'verification-required';
export interface CommerceOrder {business?:Awaited<ReturnType<typeof readOrderFlow>>;id:string;number:string;mode:'integration-test';status:string;paymentState:PaymentState;attemptId:string|null;quote:Quote;sellerOrders:{id:string;sellerId:string;status:string;financial:Snapshot['financial']['sellers'][number];delivery:Delivery}[];history:{kind:string;createdAt:string}[]}
