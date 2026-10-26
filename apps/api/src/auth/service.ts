import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../contracts/foundation.js';
import type { SessionDto } from '../contracts/modules.js';
import { uuid, text } from '../business/validation.js';
import { validateAuthConfig, type AuthConfig } from './config.js';
import { charge } from './rate-limit.js';
import {
  csrf,
  digest,
  equal,
  keyed,
  makeFlow,
  otp,
  phone,
  secret,
  validFlow,
} from './crypto.js';
import { registration, type Registration } from './input.js';
import type { SmsAdapter } from './sms.js';

const unavailable = () =>
  new ApiError(
    503,
    'SERVICE_UNAVAILABLE',
    'SMS authentication is unavailable.',
  );
const failed = () =>
  new ApiError(401, 'AUTH_FAILED', 'The verification could not be completed.');
const required = () =>
  new ApiError(401, 'AUTH_REQUIRED', 'A verified server session is required.');
const lockPhone = async (client: pg.PoolClient, hash: Buffer) => {
  await client.query('SELECT pg_advisory_xact_lock($1::integer,$2::integer)', [
    hash.readInt32BE(0),
    hash.readInt32BE(4),
  ]);
};
function sessionDto(row: Record<string, unknown>): SessionDto {
  if (
    !(row.expires_at instanceof Date) ||
    !Number.isFinite(row.expires_at.getTime())
  )
    throw new Error('Invalid session record');
  return {
    user: {
      id: uuid(row.user_id),
      firstName: text(row.first_name, 100),
      lastName: text(row.last_name, 100),
      maskedPhone: '+380•••••••••',
    },
    expiresAt: row.expires_at.toISOString(),
  };
}
/** Constructed exclusively by isolated integration composition. main.ts registers no test provider. */
export function createAuthService(
  pool: pg.Pool,
  config: AuthConfig,
  sms: SmsAdapter,
) {
  validateAuthConfig(config);
  if (sms.kind !== 'isolated-test') throw unavailable();
  const p = config.policy;
  return {
    config,
    bootstrap(flow: string) {
      const next = validFlow(config, flow) ? flow : makeFlow(config);
      return { flow: next, csrfToken: csrf(config, next) };
    },
    async challenge(
      input: { phone: string; intent: 'login' | 'register' },
      flow: string,
      clientAddress: string,
    ) {
      const normalized = phone(input.phone);
      if (
        !['login', 'register'].includes(input.intent) ||
        !validFlow(config, flow)
      )
        throw failed();
      const subject = keyed(config.phoneKey, 'phone', normalized);
      await charge(pool, config, 'challenge', clientAddress, subject);
      const id = randomUUID(),
        code = otp();
      const client = await pool.connect();
      let expiresAt: string;
      try {
        await client.query('BEGIN');
        await lockPhone(client, subject);
        await client.query(
          'UPDATE bazar.otp_challenges SET consumed_at=clock_timestamp() WHERE subject_digest=$1 AND consumed_at IS NULL',
          [subject],
        );
        const row = (
          await client.query(
            "INSERT INTO bazar.otp_challenges(id,subject_digest,code_digest,max_attempts,expires_at,intent,flow_digest,delivery_state) VALUES ($1,$2,$3,$4,clock_timestamp()+$5*interval '1 second',$6,$7,'pending') RETURNING expires_at",
            [
              id,
              subject,
              keyed(config.otpKey, 'otp', `${id}:${code}:${flow}`),
              p.otpAttempts,
              p.otpTtlSeconds,
              input.intent,
              digest(flow),
            ],
          )
        ).rows[0];
        expiresAt = row.expires_at.toISOString();
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      const controller = new AbortController();
      let timer: NodeJS.Timeout | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(unavailable());
          }, p.smsTimeoutMs);
          timer.unref();
        });
        const result = await Promise.race([
          sms.send({
            phone: normalized,
            code,
            challengeId: id,
            signal: controller.signal,
          }),
          timeout,
        ]);
        if (result?.status !== 'test-only') throw unavailable();
        const updated = await pool.query(
          "UPDATE bazar.otp_challenges SET delivery_state='test-only' WHERE id=$1 AND consumed_at IS NULL AND delivery_state='pending' AND expires_at>clock_timestamp()",
          [id],
        );
        if (updated.rowCount !== 1) throw unavailable();
      } catch {
        await pool.query(
          "UPDATE bazar.otp_challenges SET delivery_state='failed',consumed_at=clock_timestamp() WHERE id=$1",
          [id],
        );
        throw unavailable();
      } finally {
        if (timer) clearTimeout(timer);
        controller.abort();
      }
      return {
        challengeId: id,
        expiresAt,
        resendAfterSeconds: p.resendSeconds,
        delivery: 'test-only' as const,
      };
    },
    async verify(
      input: { challengeId: string; code: string; profile?: Registration },
      flow: string,
      clientAddress: string,
      previousToken: string,
    ) {
      uuid(input.challengeId);
      if (input.profile !== undefined)
        input = { ...input, profile: registration(input.profile) };
      if (
        typeof input.code !== 'string' ||
        !/^\d{6}$/.test(input.code) ||
        !validFlow(config, flow)
      )
        throw failed();
      await charge(pool, config, 'verify', clientAddress);
      const client = await pool.connect();
      let result:
        | {
            token: string;
            flow: string;
            data: SessionDto & { csrfToken: string; mode: 'test-only' };
          }
        | undefined;
      try {
        await client.query('BEGIN');
        const subject = (
          await client.query(
            'SELECT subject_digest FROM bazar.otp_challenges WHERE id=$1',
            [input.challengeId],
          )
        ).rows[0]?.subject_digest;
        if (subject) await lockPhone(client, subject);
        const row = (
          await client.query(
            'SELECT *,clock_timestamp() AS db_now FROM bazar.otp_challenges WHERE id=$1 FOR UPDATE',
            [input.challengeId],
          )
        ).rows[0];
        const match = equal(
          keyed(
            config.otpKey,
            'otp',
            `${input.challengeId}:${input.code}:${flow}`,
          ),
          row?.code_digest ?? Buffer.alloc(32),
        );
        const eligible =
          row &&
          row.flow_digest &&
          equal(row.flow_digest, digest(flow)) &&
          !row.consumed_at &&
          row.delivery_state === 'test-only' &&
          row.expires_at > row.db_now &&
          row.attempts < row.max_attempts;
        if (eligible) {
          await client.query(
            'UPDATE bazar.otp_challenges SET attempts=attempts+1 WHERE id=$1',
            [input.challengeId],
          );
          if (match) {
            await client.query(
              'UPDATE bazar.otp_challenges SET consumed_at=clock_timestamp() WHERE id=$1',
              [input.challengeId],
            );
            let identity = (
              await client.query(
                'SELECT user_id FROM bazar.auth_phone_identities WHERE phone_digest=$1',
                [subject],
              )
            ).rows[0];
            if (row.intent === 'register' && !identity && input.profile) {
              const profile = input.profile;
              const user = (
                await client.query(
                  'INSERT INTO bazar.users(first_name,last_name) VALUES ($1,$2) RETURNING id',
                  [profile.firstName, profile.lastName],
                )
              ).rows[0];
              await client.query(
                'INSERT INTO bazar.auth_phone_identities(user_id,phone_digest,consent_at) VALUES ($1,$2,clock_timestamp())',
                [user.id, subject],
              );
              identity = { user_id: user.id };
            } else if (row.intent !== 'login' || input.profile)
              identity = undefined;
            if (identity) {
              const nextFlow = makeFlow(config),
                token = secret(),
                csrfToken = csrf(config, nextFlow);
              // Revoke the browser's previous session only when its flow binding also matches.
              if (/^[A-Za-z0-9_-]{43}$/.test(previousToken))
                await client.query(
                  'UPDATE bazar.sessions SET revoked_at=clock_timestamp() WHERE token_digest=$1 AND csrf_digest=$2',
                  [digest(previousToken), digest(csrf(config, flow))],
                );
              const session = (
                await client.query(
                  "INSERT INTO bazar.sessions(user_id,token_digest,csrf_digest,expires_at) VALUES ($1,$2,$3,clock_timestamp()+$4*interval '1 second') RETURNING user_id,expires_at",
                  [
                    identity.user_id,
                    digest(token),
                    digest(csrfToken),
                    p.sessionTtlSeconds,
                  ],
                )
              ).rows[0];
              const user = (
                await client.query(
                  'SELECT first_name,last_name FROM bazar.users WHERE id=$1',
                  [identity.user_id],
                )
              ).rows[0];
              result = {
                token,
                flow: nextFlow,
                data: {
                  ...sessionDto({ ...session, ...user }),
                  csrfToken,
                  mode: 'test-only',
                },
              };
            }
          }
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      if (!result) throw failed();
      return result;
    },
    async principal(token: string, flow: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !validFlow(config, flow))
        throw required();
      const row = (
        await pool.query(
          'SELECT s.id AS session_id,s.user_id,s.expires_at,u.first_name,u.last_name FROM bazar.sessions s JOIN bazar.users u ON u.id=s.user_id JOIN bazar.auth_phone_identities i ON i.user_id=u.id WHERE s.token_digest=$1 AND s.csrf_digest=$2 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()',
          [digest(token), digest(csrf(config, flow))],
        )
      ).rows[0];
      if (!row) throw required();
      return {
        userId: uuid(row.user_id),
        sessionId: uuid(row.session_id),
        data: {
          ...sessionDto(row),
          csrfToken: csrf(config, flow),
          mode: 'test-only' as const,
        },
      };
    },
    async revoke(
      principal: { userId: string; sessionId: string },
      all: boolean,
    ) {
      uuid(principal.userId);
      uuid(principal.sessionId);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const identity = (
          await client.query(
            'SELECT phone_digest FROM bazar.auth_phone_identities WHERE user_id=$1',
            [principal.userId],
          )
        ).rows[0];
        if (!identity) throw required();
        await lockPhone(client, identity.phone_digest);
        await client.query(
          'UPDATE bazar.sessions SET revoked_at=clock_timestamp() WHERE user_id=$1 AND ($3::boolean OR id=$2) AND revoked_at IS NULL',
          [principal.userId, principal.sessionId, all],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return { status: 'revoked' as const };
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
