/** BAZAR normalized contracts, not carrier wire payloads. No provider is enabled. */
export type Carrier = "nova-poshta" | "meest" | "ukrposhta";
export type PickupKind = "branch" | "parcel-locker";
export interface ShippingCity {
  ref: string;
  name: string;
}
export interface ShippingPoint {
  ref: string;
  cityRef: string;
  name: string;
  kind: PickupKind;
  available: boolean;
  revision: string;
}
export interface ShippingSelection {
  mode: "integration-test";
  checkoutId: string;
  checkoutVersion: number;
  addressId: string;
  carrier: Carrier;
  cityRef: string;
  pointRef: string;
  kind: PickupKind;
  pointRevision: string;
  quoteId: string | null;
  canCreateShipment: false;
}
export interface ShippingQuote {
  mode: "integration-test";
  id: string;
  checkoutId: string;
  checkoutVersion: number;
  carrier: Carrier;
  kind: PickupKind;
  cost: { amountMinor: number; currency: "UAH" };
  quotedAt: string;
  expiresAt: string;
  validitySource: "integration-policy";
  binding: string;
  /** An estimate, never a guaranteed tariff, total payable or booking. */
  status: "estimate-for-test";
  canCreateShipment: false;
}
export interface SelectShippingInput {
  expectedVersion: number;
  addressId: string;
  kind: PickupKind;
}
export interface QuoteShippingInput {
  expectedVersion: number;
  idempotencyKey: string;
}
export interface ShippingCheck {
  mode: "integration-test";
  quoteId: string;
  current: true;
  checkedAt: string;
  canPlaceRealOrder: false;
}
/** Future tracking boundary. No public tracking lookup or fabricated carrier status. */
export interface ShipmentTrackingAdapter {
  track(
    ownedProviderReference: string,
    signal: AbortSignal,
  ): Promise<{
    observedAt: string;
    providerStatusCode: string;
    occurredAt: string | null;
  }>;
}
