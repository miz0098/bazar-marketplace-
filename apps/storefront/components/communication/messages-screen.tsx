"use client";
import {useServerCustomer} from '../server/customer-provider';
import {ServerCommunication} from './server-communication';
export function MessagesScreen({id,orderContext,requestContext}:{id?:string;orderContext?:string;requestContext?:string}){const {state}=useServerCustomer();return <ServerCommunication key={state.session?.user.id+(id??'')} id={id} support={false} orderContext={orderContext} requestContext={requestContext}/>;}
