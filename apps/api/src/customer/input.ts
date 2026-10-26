import { fields } from '../checkout/input.js';
import { integer, invalid } from '../business/validation.js';
export const version = (r: Record<string, unknown>) =>
  integer(r.expectedVersion, 1, 9007199254740990);
export function label(value: unknown, max: number) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    !value.trim() ||
    /\p{Cc}/u.test(value)
  )
    invalid();
  return value.trim().normalize('NFC');
}
export function profileInput(value: unknown) {
  const r = fields(value, ['expectedVersion', 'firstName', 'lastName']);
  const firstName = label(r.firstName, 100),
    lastName = label(r.lastName, 100);
  if (
    !/^[\p{L}][\p{L}\p{M}'’ -]*$/u.test(firstName) ||
    !/^[\p{L}][\p{L}\p{M}'’ -]*$/u.test(lastName)
  )
    invalid();
  return { firstName, lastName, expectedVersion: version(r) };
}
export function addressInput(value: unknown, update = false) {
  const r = fields(value, [
    'carrier',
    'cityRef',
    'locationRef',
    'isDefault',
    ...(update ? ['expectedVersion'] : []),
  ]);
  if (
    !['nova-poshta', 'meest', 'ukrposhta'].includes(String(r.carrier)) ||
    typeof r.isDefault !== 'boolean'
  )
    invalid();
  const cityRef = label(r.cityRef, 200),
    locationRef = label(r.locationRef, 200);
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(cityRef) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(locationRef)
  )
    invalid();
  return {
    carrier: String(r.carrier),
    cityRef,
    locationRef,
    isDefault: r.isDefault,
    expectedVersion: update ? version(r) : null,
  };
}
export function reviewBody(r: Record<string, unknown>) {
  return { rating: integer(r.rating, 1, 5), body: label(r.body, 2000) };
}
