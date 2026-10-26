/** Official address classifier v3.22 (25.09.2026), eCom documentation 16.10.2026.
 * https://dev.ukrposhta.ua/documentation . No credentials or default HTTP transport.
 */
import { hash } from '../checkout/state.js';
import { query, reference } from './input.js';
import { text } from '../business/validation.js';
import {
  unavailable,
  type ShippingAdapter,
  type QuoteContext,
} from './adapter.js';
const base = 'https://www.ukrposhta.ua/address-classifier-ws/';
function numeric(v: unknown): string {
  if (typeof v !== 'string' || !/^\d{1,12}$/.test(v)) throw unavailable();
  return v;
}
function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function entries(v: unknown) {
  if (!object(v) || !object(v.Entries)) throw unavailable();
  const items = v.Entries.Entry;
  if (!Array.isArray(items) || items.length > 100 || !items.every(object))
    throw unavailable();
  return items;
}
export function ukrposhtaCityUrl(search: string) {
  const url = new URL(
    'get_city_by_region_id_and_district_id_and_city_ua',
    base,
  );
  url.searchParams.set('city_ua', query(search));
  return url.toString();
}
export function ukrposhtaOfficeUrl(regionId: string, cityId: string) {
  const url = new URL('get_postoffices_by_city_id', base);
  url.searchParams.set('region_id', numeric(regionId));
  url.searchParams.set('city_id', numeric(cityId));
  return url.toString();
}
/** Wire subset only; no default type, discount, declared value, COD, currency or guarantee is chosen. */
export interface UkrposhtaCalculationRequest {
  addressFrom: { postcode: string };
  addressTo: { postcode: string };
  type: string;
  deliveryType: 'W2W';
  validate: true;
  parcels: readonly {
    weight: number;
    length: number;
    width: number;
    height: number;
  }[];
}
export const ukrposhtaCalculationUrl =
  'https://www.ukrposhta.ua/ecom/0.0.1/domestic/delivery-price';
export function createUkrposhtaTestAdapter(input: {
  scope: 'isolated-test';
  directory(url: string, signal: AbortSignal): Promise<unknown>;
  /** Server directory lookup retains the documented REGION_ID/CITY_ID correlation. Never a guessed endpoint. */
  resolveCity(
    ref: string,
    signal: AbortSignal,
  ): Promise<{ REGION_ID: string; CITY_ID: string; CITY_UA: string } | null>;
  estimateForTest(
    context: QuoteContext,
    signal: AbortSignal,
  ): Promise<{ amountMinor: number; currency: 'UAH'; revision: string }>;
}): ShippingAdapter {
  if (process.env.NODE_ENV !== 'test' || input.scope !== 'isolated-test')
    throw new Error('Ukrposhta adapter requires isolated tests');
  const city = (r: {
    REGION_ID: unknown;
    CITY_ID: unknown;
    CITY_UA: unknown;
  }) => ({
    ref: numeric(r.REGION_ID) + '-' + numeric(r.CITY_ID),
    name: text(r.CITY_UA, 200),
  });
  return {
    scope: 'isolated-test',
    carrier: 'ukrposhta',
    pickupKinds: ['branch'],
    async cities(search, signal) {
      return entries(
        await input.directory(ukrposhtaCityUrl(search), signal),
      ).map((r) =>
        city({
          REGION_ID: r.REGION_ID,
          CITY_ID: r.CITY_ID,
          CITY_UA: r.CITY_UA,
        }),
      );
    },
    async city(ref, signal) {
      reference(ref);
      const r = await input.resolveCity(ref, signal);
      if (!r) return null;
      const result = city(r);
      if (result.ref !== ref) throw unavailable();
      return result;
    },
    async points(ref, kind, signal) {
      if (kind !== 'branch') throw unavailable();
      const r = await input.resolveCity(ref, signal);
      if (!r || city(r).ref !== ref) throw unavailable();
      return entries(
        await input.directory(
          ukrposhtaOfficeUrl(r.REGION_ID, r.CITY_ID),
          signal,
        ),
      ).map((p) => {
        if (p.CITY_ID !== r.CITY_ID || p.REGION_ID !== r.REGION_ID)
          throw unavailable();
        return {
          ref: numeric(p.ID),
          cityRef: ref,
          name: text(p.PO_LONG, 200),
          kind: 'branch' as const,
          // Active dictionary record alone is not proof of parcel delivery. Unknown flags stay unavailable.
          available: p.LOCK_CODE === '0' && p.IS_NODISTRICT === '0',
          revision: hash({
            id: p.ID,
            postcode: p.POSTINDEX,
            lock: p.LOCK_CODE,
            delivery: p.IS_NODISTRICT,
            name: p.PO_LONG,
          }).toString('hex'),
        };
      });
    },
    async point(cityRef, pointRef, kind, signal) {
      return (
        (await this.points(cityRef, kind, signal)).find(
          (p) => p.ref === pointRef,
        ) ?? null
      );
    },
    estimate: input.estimateForTest,
  };
}
