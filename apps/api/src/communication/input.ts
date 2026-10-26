import { fields } from "../checkout/input.js";
import { integer, invalid, uuid } from "../business/validation.js";
export function messageBody(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 2000 ||
    /\p{Cc}/u.test(value.replace(/[\n\t]/g, ""))
  )
    invalid();
  const normalized = value.trim().normalize("NFC");
  if (normalized.length > 2000) invalid();
  return normalized;
}
export function sendInput(value: unknown) {
  const r = fields(value, ["clientMessageId", "body"]);
  return {
    clientMessageId: uuid(r.clientMessageId),
    body: messageBody(r.body),
  };
}
export function ticketInput(value: unknown) {
  const r = fields(value, ["clientRequestId", "subject", "category", "body"]);
  if (
    typeof r.subject !== "string" ||
    r.subject.trim().length < 5 ||
    r.subject.length > 120 ||
    /\p{Cc}/u.test(r.subject) ||
    typeof r.category !== "string" ||
    !["delivery", "payment", "other"].includes(r.category)
  )
    invalid();
  const subject = r.subject.trim().normalize("NFC");
  if (subject.length < 5 || subject.length > 120) invalid();
  return {
    clientRequestId: uuid(r.clientRequestId),
    subject,
    category: r.category,
    body: messageBody(r.body),
  };
}
export function historyQuery(q: URLSearchParams) {
  for (const k of q.keys())
    if (!["before", "limit"].includes(k) || q.getAll(k).length !== 1) invalid();
  const parse = (k: string, defaultValue: number, max: number) => {
    const v = q.get(k);
    if (v === null) return defaultValue;
    if (!/^[1-9]\d{0,15}$/.test(v)) invalid();
    return integer(Number(v), 1, max);
  };
  return {
    before: parse("before", Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    limit: parse("limit", 50, 100),
  };
}
