import type {IncomingMessage} from 'node:http';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/foundation.js';
/** Only a verified isolated transport resolver may attach a body expectation. */
const expectations=new WeakMap<IncomingMessage,string>();
export function expectPreviewBody(request:IncomingMessage,digest:string){if(process.env.NODE_ENV!=='test'||!/^[a-f0-9]{64}$/.test(digest))throw new Error('Invalid isolated transport');expectations.set(request,digest);}
export function verifyPreviewBody(request:IncomingMessage,bytes:Uint8Array){const expected=expectations.get(request);if(expected&&createHash('sha256').update(bytes).digest('hex')!==expected)throw new ApiError(403,'CSRF_DENIED','Preview transport body mismatch.');expectations.delete(request);}
