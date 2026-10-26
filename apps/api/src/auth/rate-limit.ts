import type pg from 'pg';
import type { AuthConfig } from './config.js';
import { keyed } from './crypto.js';
import { ApiError } from '../contracts/foundation.js';
export class RateLimitError extends ApiError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, 'RATE_LIMITED', 'Please wait before trying again.');
  }
}
/** Durable budgets are committed even when the protected operation subsequently fails. */
export async function charge(
  pool: pg.Pool,
  config: AuthConfig,
  operation: 'challenge' | 'verify',
  clientAddress: string,
  phoneDigest?: Buffer,
): Promise<void> {
  const p = config.policy;
  const entries: {
    scope: string;
    key: Buffer;
    limit: number;
    cooldown: number;
  }[] = [
    {
      scope: `${operation}-global`,
      key: keyed(config.phoneKey, 'rate-global', operation),
      limit:
        operation === 'challenge'
          ? p.challengeGlobalLimit
          : p.verifyGlobalLimit,
      cooldown: 0,
    },
    {
      scope: `${operation}-client`,
      key: keyed(config.phoneKey, 'rate-client', clientAddress),
      limit:
        operation === 'challenge'
          ? p.challengeClientLimit
          : p.verifyClientLimit,
      cooldown: 0,
    },
  ];
  if (phoneDigest)
    entries.push({
      scope: 'challenge-phone',
      key: phoneDigest,
      limit: p.challengePhoneLimit,
      cooldown: p.resendSeconds,
    });
  // Global first bounds per-client/phone row creation even after the global budget is exhausted.
  const client = await pool.connect();
  let retry = 0;
  try {
    await client.query('BEGIN');
    for (const entry of entries) {
      await client.query(
        'INSERT INTO bazar.auth_rate_limits(scope,key_digest,window_started_at,hits,next_allowed_at) VALUES ($1,$2,clock_timestamp(),0,clock_timestamp()) ON CONFLICT DO NOTHING',
        [entry.scope, entry.key],
      );
      const row = (
        await client.query(
          'SELECT *,clock_timestamp() AS db_now FROM bazar.auth_rate_limits WHERE scope=$1 AND key_digest=$2 FOR UPDATE',
          [entry.scope, entry.key],
        )
      ).rows[0];
      const now: Date = row.db_now;
      const expired =
        now.getTime() >=
        row.window_started_at.getTime() + p.rateWindowSeconds * 1000;
      const hits = expired ? 0 : row.hits;
      const cooling = row.next_allowed_at.getTime() > now.getTime();
      const allowed = hits < entry.limit && !cooling;
      if (!allowed)
        retry = Math.max(
          retry,
          1,
          Math.ceil(
            (cooling
              ? row.next_allowed_at.getTime() - now.getTime()
              : row.window_started_at.getTime() +
                p.rateWindowSeconds * 1000 -
                now.getTime()) / 1000,
          ),
        );
      await client.query(
        'UPDATE bazar.auth_rate_limits SET hits=$3,window_started_at=$4,next_allowed_at=$5 WHERE scope=$1 AND key_digest=$2',
        [
          entry.scope,
          entry.key,
          Math.min(hits + 1, 2147483647),
          expired ? now : row.window_started_at,
          allowed
            ? new Date(now.getTime() + entry.cooldown * 1000)
            : row.next_allowed_at,
        ],
      );
      if (!allowed) break;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  if (retry) throw new RateLimitError(retry);
}
