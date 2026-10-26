/** Verified subset of Meest's official OpenAPI 3.0 (Swagger 2.0), 2026-10-26.
 * Source: https://wiki.meest-group.com/api/files/openAPI_ua.json
 * Pure codecs only: no credentials, transport, default contract, booking or production activation.
 */
import { hash } from "../checkout/state.js";
import { reference, query } from "./input.js";
import { unavailable } from "./adapter.js";
export const meestOpenApiBase = "https://api.meest.com/v3.0/openAPI";
export interface MeestCitySearch {
  filters: { cityDescr?: string; cityID?: string; countryID: string };
  isDirectory: false;
}
export interface MeestBranchSearch {
  filters: { cityID: string; branchID?: string };
}
export interface MeestBranchReceiver {
  branchID: string;
  cityID: string;
  service: "Branch";
}
/** Postal locker uses Branch service too. Type IDs must come from /branchTypes, never a guessed UUID. */
export interface MeestCalculateRequest {
  contractID: string;
  sender: MeestBranchReceiver;
  receiver: MeestBranchReceiver;
  placesItems: readonly {
    quantity: number;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    insurance?: number;
  }[];
}
export interface MeestParcelStatus {
  status: string;
  statusCode: string;
  date: string;
}
export function meestCitySearch(search: string): MeestCitySearch {
  return {
    filters: {
      cityDescr: query(search),
      countryID: "c35b6195-4ea3-11de-8591-001d600938f8",
    },
    isDirectory: false,
  };
}
export function meestBranchSearch(
  cityID: string,
  branchID?: string,
): MeestBranchSearch {
  return {
    filters: {
      cityID: reference(cityID),
      ...(branchID === undefined ? {} : { branchID: reference(branchID) }),
    },
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** costServices is a decimal string, not a float. No rounding or currency inference. */
export function decodeMeestCost(value: unknown) {
  if (
    !object(value) ||
    (value.status !== "ok" && value.status !== "OK") ||
    !Array.isArray(value.result) ||
    value.result.length !== 1 ||
    !object(value.result[0])
  )
    throw unavailable();
  const cost = value.result[0].costServices;
  if (typeof cost !== "string" || !/^\d{1,14}(?:\.\d{1,2})?$/.test(cost))
    throw unavailable();
  const [whole, fraction = ""] = cost.split("."),
    amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw unavailable();
  return {
    amountMinor: Number(amount),
    revision: hash({ costServices: cost }).toString("hex"),
  };
}
