export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  version: number;
}
export interface CustomerAddress {
  id: string;
  carrier: 'nova-poshta' | 'meest' | 'ukrposhta';
  cityRef: string;
  locationRef: string;
  isDefault: boolean;
  version: number;
}
export interface CustomerWishlistItem {
  productId: string;
  handle: string;
  title: string;
  available: boolean;
  price: { amountMinor: number; currency: 'UAH' } | null;
}
export interface CustomerReview {
  id: string;
  productId: string;
  orderLineId: string;
  rating: number;
  body: string;
}
export type CustomerView = (
  | { resource: 'profile'; profile: CustomerProfile }
  | { resource: 'wishlist'; items: readonly CustomerWishlistItem[] }
  | { resource: 'addresses'; items: readonly CustomerAddress[] }
  | {
      resource: 'reviews';
      publication: 'not-asserted';
      items: readonly CustomerReview[];
    }
) & { mode: 'integration-test' };
export interface CustomerProfileInput {
  expectedVersion: number;
  firstName: string;
  lastName: string;
}
export interface CustomerAddressInput {
  carrier: CustomerAddress['carrier'];
  cityRef: string;
  locationRef: string;
  isDefault: boolean;
}
export interface CustomerReviewInput {
  orderLineId: string;
  rating: number;
  body: string;
}
/** Portable runtime transport validation. Flags never imply production authorization or publication. */
export function isCustomerView(v: unknown): v is CustomerView {
  const object = (x: unknown): x is Record<string, unknown> =>
    !!x && typeof x === 'object' && !Array.isArray(x);
  const id = (x: unknown) =>
    typeof x === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
  const text = (x: unknown, max: number) =>
    typeof x === 'string' &&
    x.trim().length > 0 &&
    x.length <= max &&
    !/\p{Cc}/u.test(x);
  const version = (x: unknown) =>
    typeof x === 'number' && Number.isSafeInteger(x) && x >= 1;
  if (!object(v) || v.mode !== 'integration-test') return false;
  const exact = (o: Record<string, unknown>, keys: readonly string[]) =>
    Object.keys(o).sort().join(',') === [...keys].sort().join(',');
  if (
    !exact(v, [
      'mode',
      'resource',
      v.resource === 'profile' ? 'profile' : 'items',
      ...(v.resource === 'reviews' ? ['publication'] : []),
    ])
  )
    return false;
  if (v.resource === 'reviews' && v.publication !== 'not-asserted')
    return false;
  if (v.resource === 'profile')
    return (
      object(v.profile) &&
      exact(v.profile, ['id', 'firstName', 'lastName', 'version']) &&
      id(v.profile.id) &&
      text(v.profile.firstName, 100) &&
      text(v.profile.lastName, 100) &&
      version(v.profile.version)
    );
  if (!Array.isArray(v.items) || v.items.length > 100) return false;
  const ids = new Set<string>();
  let defaults = 0;
  const valid = v.items.every((x) => {
    if (!object(x)) return false;
    const key = v.resource === 'wishlist' ? x.productId : x.id;
    if (!id(key) || ids.has(String(key).toLowerCase())) return false;
    ids.add(String(key).toLowerCase());
    if (v.resource === 'wishlist')
      return (
        exact(x, ['productId', 'handle', 'title', 'available', 'price']) &&
        text(x.handle, 200) &&
        text(x.title, 300) &&
        typeof x.available === 'boolean' &&
        (x.price === null
          ? x.available === false
          : object(x.price) &&
            exact(x.price, ['amountMinor', 'currency']) &&
            x.price.currency === 'UAH' &&
            typeof x.price.amountMinor === 'number' &&
            Number.isSafeInteger(x.price.amountMinor) &&
            x.price.amountMinor >= 0)
      );
    if (v.resource === 'addresses') {
      if (
        !exact(x, [
          'id',
          'carrier',
          'cityRef',
          'locationRef',
          'isDefault',
          'version',
        ])
      )
        return false;
      if (x.isDefault === true) defaults++;
      return (
        ['nova-poshta', 'meest', 'ukrposhta'].includes(String(x.carrier)) &&
        text(x.cityRef, 200) &&
        text(x.locationRef, 200) &&
        typeof x.isDefault === 'boolean' &&
        version(x.version)
      );
    }
    if (v.resource === 'reviews')
      return (
        exact(x, ['id', 'productId', 'orderLineId', 'rating', 'body']) &&
        v.publication === 'not-asserted' &&
        id(x.productId) &&
        id(x.orderLineId) &&
        typeof x.rating === 'number' &&
        Number.isInteger(x.rating) &&
        x.rating >= 1 &&
        x.rating <= 5 &&
        text(x.body, 2000)
      );
    return false;
  });
  return (
    valid &&
    defaults <= 1 &&
    ['wishlist', 'addresses', 'reviews'].includes(String(v.resource))
  );
}
