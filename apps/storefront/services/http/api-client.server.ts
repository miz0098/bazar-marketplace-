import 'server-only';
import { createFoundationClient } from '@/lib/api-client';
import { readApiClientConfig } from '@/lib/api-config';

/** Opt-in server-side foundation probe. Never selected by the mock domain providers. */
export function getFoundationApiClient() {
  return createFoundationClient(readApiClientConfig(process.env));
}
