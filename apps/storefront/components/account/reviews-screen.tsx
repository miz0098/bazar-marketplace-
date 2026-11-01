"use client";
import {useServerCustomer} from '../server/customer-provider';
import {ServerAccountScreen} from './server-account';
export function ReviewsScreen(){const {state}=useServerCustomer();return <ServerAccountScreen key={state.session?.user.id} section="reviews"/>;}
