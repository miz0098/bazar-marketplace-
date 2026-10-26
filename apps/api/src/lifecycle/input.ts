import { fields } from "../checkout/input.js";
import { integer, invalid, uuid } from "../business/validation.js";
import type { RequestKind } from "../contracts/lifecycle.js";
export function reasonText(v: unknown) {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.length > 2000 ||
    /\p{Cc}/u.test(v.replace(/[\n\t]/g, ""))
  )
    invalid();
  const s = v.trim().normalize("NFC");
  if (s.length > 2000) invalid();
  return s;
}
export function requestInput(value: unknown, kind: RequestKind) {
  const r = fields(value, [
    "idempotencyKey",
    "reason",
    ...(kind === "return" ? ["items"] : []),
  ]);
  let items: { orderLineId: string; quantity: number }[] = [];
  if (kind === "return") {
    if (!Array.isArray(r.items) || r.items.length < 1 || r.items.length > 100)
      invalid();
    items = r.items
      .map((v) => {
        const i = fields(v, ["orderLineId", "quantity"]);
        return {
          orderLineId: uuid(i.orderLineId),
          quantity: integer(i.quantity, 1, 2147483647),
        };
      })
      .sort((a, b) => a.orderLineId.localeCompare(b.orderLineId));
    if (new Set(items.map((i) => i.orderLineId)).size !== items.length)
      invalid();
  }
  return {
    idempotencyKey: uuid(r.idempotencyKey),
    reason: reasonText(r.reason),
    items,
  };
}
