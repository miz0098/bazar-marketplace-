import { fields } from "../checkout/input.js";
import { integer, invalid, uuid } from "../business/validation.js";
import type {
  Carrier,
  PickupKind,
  SelectShippingInput,
  QuoteShippingInput,
} from "../contracts/shipping.js";
export function carrier(value: unknown): Carrier {
  if (value !== "nova-poshta" && value !== "meest") invalid();
  return value;
}
export function kind(value: unknown): PickupKind {
  if (value !== "branch" && value !== "parcel-locker") invalid();
  return value;
}
export function reference(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(value))
    invalid();
  return value;
}
export function query(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.length > 100 ||
    [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    invalid();
  return value.trim();
}
export function selectInput(value: unknown): SelectShippingInput {
  const r = fields(value, ["expectedVersion", "addressId", "kind"]);
  return {
    expectedVersion: integer(r.expectedVersion, 1),
    addressId: uuid(r.addressId),
    kind: kind(r.kind),
  };
}
export function quoteInput(value: unknown): QuoteShippingInput {
  const r = fields(value, ["expectedVersion", "idempotencyKey"]);
  return {
    expectedVersion: integer(r.expectedVersion, 1),
    idempotencyKey: uuid(r.idempotencyKey),
  };
}
