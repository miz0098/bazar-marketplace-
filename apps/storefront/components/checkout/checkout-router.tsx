'use client';
import {useServerCustomer} from '../server/customer-provider';
import {CheckoutPage} from './checkout-page';
import {CommerceCheckout} from './commerce-checkout';
export function CheckoutRouter(){const {enabled}=useServerCustomer();return enabled?<CommerceCheckout/>:<CheckoutPage/>;}
