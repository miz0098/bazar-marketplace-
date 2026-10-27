import test from 'node:test';
import assert from 'node:assert/strict';
import {orderStatuses,orderStatusLabels,isFlowProjection,isFlowView} from '../services/contracts/order-flow';
const id='00000000-0000-4000-8000-000000000001';
const p={parentStatus:'delivered',fundsReturned:false,sellerOrders:[{id,sellerId:id,status:'delivered',version:1,cancellation:'return',shipmentState:'delivered',preparedAt:null,dispatchDueAt:null,deadlinePolicy:null,trackingRef:null}]};
test('F23 portable order vocabulary and guards reject removed states and false refund finality',()=>{assert.equal(orderStatuses.length,9);assert.ok(!Object.values(orderStatusLabels).some(s=>['У дорозі','Завершено'].includes(s)));assert.ok(isFlowProjection(p));assert.equal(isFlowProjection({...p,parentStatus:'returned'}),false);assert.equal(isFlowProjection({...p,parentStatus:'completed'}),false);assert.equal(isFlowProjection({...p,sellerOrders:[{...p.sellerOrders[0],status:'in_transit'}]}),false);assert.equal(isFlowProjection({...p,fundsReturned:true}),false);assert.ok(isFlowView({...p,mode:'integration-test',parentId:id,requests:[],returns:[],refunds:[],history:[]}));});
