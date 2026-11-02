/** Offline B1 contract experiment only. NOT a login server, SDK, or production verifier. */
import {verify} from 'node:crypto';

export function validateConfiguration(config) {
  const blockers = [];
  if (config.plusVerified !== true) blockers.push('PLUS_ENTITLEMENT_UNVERIFIED');
  if (config.realEmailEnrollment !== true) blockers.push('VERIFIED_EMAIL_ENROLLMENT_REQUIRED');
  if (config.flow !== 'authorization_code') blockers.push('AUTHORIZATION_CODE_REQUIRED');
  if (config.pkce !== 'S256') blockers.push('PKCE_S256_REQUIRED');
  if (config.logout !== 'rp_initiated') blockers.push('RP_INITIATED_LOGOUT_REQUIRED');
  if (config.refreshTokens !== true) blockers.push('LONG_SESSION_REFRESH_UNPROVEN');
  if (config.firebaseAuth !== false) blockers.push('FIREBASE_AUTH_PROHIBITED');
  for (const key of ['authorization', 'token', 'jwks', 'discovery']) {
    try {
      const url = new URL(config.endpoints?.[key]);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error();
    } catch { blockers.push(`HTTPS_${key.toUpperCase()}_ENDPOINT_REQUIRED`); }
  }
  return {eligibleForFurtherProof: blockers.length === 0, blockers};
}

export function inspectLocalIdToken(token, publicKey, expected) {
  // Only locally injected keys; no discovery, key downloads, HTTP, cookies, sessions or email sending.
  const fail = reason => {throw new Error(reason);};
  if (typeof token !== 'string' || token.length > 16384) fail('TOKEN_FORMAT');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) fail('TOKEN_FORMAT');
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {fail('TOKEN_FORMAT');}
  if (!header || header.alg !== 'RS256' || header.kid !== expected.kid || header.crit) fail('ALGORITHM_OR_KEY');
  if (!verify('RSA-SHA256', Buffer.from(parts.slice(0, 2).join('.')), publicKey, Buffer.from(parts[2], 'base64url'))) fail('SIGNATURE');
  if (!claims || claims.iss !== expected.issuer || claims.aud !== expected.audience) fail('ISSUER_OR_AUDIENCE');
  if (typeof claims.sub !== 'string' || !claims.sub.trim() || claims.nonce !== expected.nonce || !expected.nonce) fail('SUBJECT_OR_NONCE');
  if (!Number.isInteger(claims.exp) || claims.exp <= expected.now || !Number.isInteger(claims.iat) || claims.iat > expected.now || claims.iat >= claims.exp) fail('TOKEN_TIME');
  if (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf > expected.now)) fail('TOKEN_TIME');
  if (typeof claims.email !== 'string' || !claims.email.trim()) fail('REAL_EMAIL_REQUIRED');
  if (claims.email_verified !== true) fail('VERIFIED_EMAIL_REQUIRED');
  // Checking a signed claim cannot establish that the issuer truly verified an inbox.
  return {contractSatisfied: true, sessionIssued: false};
}
