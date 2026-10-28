import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import { uuid } from '../business/validation.js';
import { notificationKinds, type NotificationKind } from '../contracts/communication.js';
/** Internal test composition only. Callers authorize the resource; no customer ingestion endpoint. */
export async function appendNotificationForTest(c:pg.PoolClient,actor:string,kind:NotificationKind,sourceId:string,scopeId:string){
 if(process.env.NODE_ENV!=='test')throw new Error('Isolated notifications only');
 actor=uuid(actor);sourceId=uuid(sourceId);scopeId=uuid(scopeId);
 if(!notificationKinds.includes(kind))throw new Error('Unsupported event');
 await c.query('INSERT INTO bazar.notification_events(user_id,kind,source_id,scope_id) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,kind,source_id) DO NOTHING',[actor,kind,sourceId,scopeId]);
 const row=(await c.query('SELECT scope_id FROM bazar.notification_events WHERE user_id=$1 AND kind=$2 AND source_id=$3',[actor,kind,sourceId])).rows[0];
 if(row&&row.scope_id!==scopeId)throw new ApiError(409,'CONFLICT','Event identity conflicts.');
}
