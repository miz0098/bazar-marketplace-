/** APPROVED F23 order states; transport/payment/refund events are separate axes. */
export const orderStatuses=['new','confirmed','preparing','shipped','delivered','cancelled','system-cancelled','returning','returned'] as const;
export type OrderStatus=typeof orderStatuses[number];
export const orderStatusLabels:Record<OrderStatus,string>={new:'Нове',confirmed:'Підтверджено',preparing:'Готується до відправлення',shipped:'Відправлено',delivered:'Доставлено',cancelled:'Скасовано','system-cancelled':'Скасовано системою',returning:'Повернення',returned:'Повернено'};
export const isOrderStatus=(v:unknown):v is OrderStatus=>typeof v==='string'&&(orderStatuses as readonly string[]).includes(v);
/** Null is an explicitly heterogeneous projection, not a new order state. */
export function aggregateOrderStatus(states:readonly OrderStatus[]):OrderStatus|null{return states.length&&states.every(s=>s===states[0])?states[0]:null;}
export function cancellationAction(s:OrderStatus){return s==='new'||s==='confirmed'?'direct':s==='preparing'||s==='shipped'?'request':s==='delivered'?'return':'unavailable';}
export function canTransition(from:OrderStatus,to:OrderStatus){return ({new:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['shipped','cancelled','system-cancelled'],shipped:['delivered','cancelled'],delivered:['returning'],returning:['returned','delivered'],returned:[],cancelled:[],'system-cancelled':[]} as Record<OrderStatus,OrderStatus[]>)[from].includes(to);}
/** Read-only legacy label projection. Never rewrite audit source records. */
export function historicalOrderStatus(s:string):OrderStatus|null{return s==='in_transit'||s==='in-transit'?'shipped':s==='completed'?'delivered':isOrderStatus(s)?s:null;}
