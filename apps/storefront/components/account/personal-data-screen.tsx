"use client";
import {useServerCustomer} from '../server/customer-provider';
import {ServerAccountScreen} from './server-account';
export function PersonalDataScreen(){const {state}=useServerCustomer();return <ServerAccountScreen key={state.session?.user.id} section="profile"/>;}
