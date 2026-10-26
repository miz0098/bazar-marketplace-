import {createDemoOrderLifecycle} from './order-lifecycle-service';
import {
  ACCOUNT_ORDER_STATUSES,
  hasAccountValidationErrors,
  normalizeAccountText,
  validateAccountAddress,
  validateAccountProfile,
  validateAccountReview,
  type AccountAddress,
  type AccountAddressDraft,
  type AccountFixtureSet,
  type AccountOrderDetail,
  type AccountOrderPage,
  type AccountOrderQuery,
  type AccountOrderStatus,
  type AccountProfile,
  type AccountProfileDraft,
  type AccountReview,
  type AccountReviewDraft,
  type AccountScenario,
  type AccountWishlistItem,
  type AccountWishlistPage,
  type AccountWishlistQuery,
} from '@/domain/account/account';
import { demoProducts } from '@/fixtures/catalog';
import { demoAccountFixtures } from '@/fixtures/account';
import {
  AccountServiceError,
  type AccountMutationResult,
  type AccountService,
} from '@/services/contracts/account';
import type { Money, ProductSummary } from '@/services/contracts/catalog';

const DEFAULT_LATENCY_MS = 180;
const DEFAULT_ORDER_PAGE_SIZE = 5;
const DEFAULT_WISHLIST_PAGE_SIZE = 12;

export interface DemoAccountServiceOptions {
  readonly scenario?: AccountScenario;
  readonly latencyMs?: number;
  readonly wait?: (milliseconds: number) => Promise<void>;
  readonly fixtures?: AccountFixtureSet;
}

function defaultWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneMoney(money: Money): Money {
  return { ...money };
}

function cloneProduct(product: ProductSummary): ProductSummary {
  return {
    ...product,
    price: cloneMoney(product.price),
    compareAtPrice: product.compareAtPrice
      ? cloneMoney(product.compareAtPrice)
      : undefined,
  };
}

function cloneOrder(order: AccountOrderDetail): AccountOrderDetail {
  return {
    ...order,
    total: cloneMoney(order.total),
    items: order.items.map((item) => ({
      ...item,
      product: cloneProduct(item.product),
      lineTotal: cloneMoney(item.lineTotal),
    })),
  };
}

function cloneWishlistItem(item: AccountWishlistItem): AccountWishlistItem {
  return { ...item, product: cloneProduct(item.product) };
}

function cloneReview(review: AccountReview): AccountReview {
  return { ...review, product: cloneProduct(review.product) };
}

function toFieldErrors(
  errors: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}

function validationError(
  errors: Readonly<Record<string, string | undefined>>,
): AccountServiceError {
  return new AccountServiceError(
    'validation',
    'Перевірте позначені поля.',
    toFieldErrors(errors),
  );
}

function notFound(resource: string): AccountServiceError {
  return new AccountServiceError(
    'not-found',
    `${resource} не знайдено у демо-перегляді.`,
  );
}

function previewResult<T>(value: T): AccountMutationResult<T> {
  return { status: 'preview-only', persisted: false, value };
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || Number(value) < 1) return fallback;
  return Math.min(Number(value), maximum);
}

function normalizeSearch(value = ''): string {
  return normalizeAccountText(value).toLocaleLowerCase('uk-UA');
}

export function createDemoAccountService(
  options: DemoAccountServiceOptions = {},
): AccountService & { restoreDemoWishlist(ids: readonly string[]): void } {
  const scenario = options.scenario ?? 'ready';
  const latencyMs = Math.max(
    0,
    Math.trunc(options.latencyMs ?? DEFAULT_LATENCY_MS),
  );
  const wait = options.wait ?? defaultWait;
  const fixtureSource = options.fixtures ?? demoAccountFixtures;
  const useCollections = scenario === 'ready';

  let profile: AccountProfile = { ...fixtureSource.profile };
  const orders = useCollections ? fixtureSource.orders.map(cloneOrder) : [];
  const lifecycle = createDemoOrderLifecycle(orders);
  let wishlist = useCollections
    ? fixtureSource.wishlist.map(cloneWishlistItem)
    : [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  let reviews = useCollections ? fixtureSource.reviews.map(cloneReview) : [];
  let addresses = useCollections
    ? fixtureSource.addresses.map((address) => ({ ...address }))
    : [];
  const paymentMethods = useCollections
    ? fixtureSource.paymentMethods.map((method) => ({ ...method }))
    : [];
  let addressSequence = addresses.length;

  async function run<T>(operation: () => T): Promise<T> {
    await wait(latencyMs);
    if (scenario === 'error') {
      throw new AccountServiceError(
        'unavailable',
        'Не вдалося завантажити демо-дані профілю. Спробуйте ще раз.',
      );
    }
    return operation();
  }

  function cloneAddresses(): readonly AccountAddress[] {
    return addresses.map((address) => ({ ...address }));
  }

  function normalizeDefaultAddress(
    nextAddresses: readonly AccountAddress[],
    preferredId?: string,
  ): AccountAddress[] {
    const selectedId =
      preferredId ??
      nextAddresses.find((address) => address.isDefault)?.id ??
      nextAddresses[0]?.id;

    return nextAddresses.map((address) => ({
      ...address,
      isDefault: Boolean(selectedId) && address.id === selectedId,
    }));
  }

  return {
    mode: 'preview-only',
    getOrderLifecycle: (id) => run(() => lifecycle.get(id)),
    createOrderReturn: (id,draft) => run(() => previewResult(lifecycle.create(id,draft))),
    restoreDemoWishlist(ids) {
      wishlist = [...new Set(ids)].flatMap((id, index) => {
        const product = demoProducts.find((p) => p.id === id);
        return product
          ? [
              {
                id: 'wishlist-' + id,
                product: cloneProduct(product),
                addedAt: new Date(
                  Date.UTC(2000, 0, 1) - index * 1000,
                ).toISOString(),
              },
            ]
          : [];
      });
      notify();
    },

    getProfile() {
      return run(() => ({ ...profile }));
    },

    updateProfile(draft: AccountProfileDraft) {
      return run(() => {
        const errors = validateAccountProfile(draft);
        if (hasAccountValidationErrors(errors)) throw validationError(errors);

        profile = {
          ...profile,
          firstName: normalizeAccountText(draft.firstName),
          lastName: normalizeAccountText(draft.lastName),
          email: draft.email.trim(),
          birthday: draft.birthday.trim(),
          gender: draft.gender,
        };
        return previewResult({ ...profile });
      });
    },

    listOrders(query: AccountOrderQuery = {}) {
      return run(() => {
        const status = query.status ?? 'all';
        const pageSize = positiveInteger(
          query.pageSize,
          DEFAULT_ORDER_PAGE_SIZE,
          24,
        );
        const counts = Object.fromEntries([
          ['all', orders.length],
          ...ACCOUNT_ORDER_STATUSES.map((value) => [
            value,
            orders.filter((order) => order.status === value).length,
          ]),
        ]) as Record<AccountOrderStatus | 'all', number>;
        const filtered = [...orders]
          .filter((order) => status === 'all' || order.status === status)
          .sort((left, right) => right.placedAt.localeCompare(left.placedAt));
        const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
        const page = Math.min(
          positiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER),
          pageCount,
        );
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize).map((order) => ({
          id: order.id,
          number: order.number,
          placedAt: order.placedAt,
          status: order.status,
          itemCount: order.itemCount,
          total: cloneMoney(order.total),
          leadProduct: cloneProduct(order.items[0]!.product),
        }));

        const result: AccountOrderPage = {
          items,
          total: filtered.length,
          page,
          pageSize,
          pageCount,
          hasMore: page < pageCount,
          counts,
        };
        return result;
      });
    },

    getOrder(id: string) {
      return run(() => {
        const found = orders.find((order) => order.id === id);
        return found ? cloneOrder(found) : null;
      });
    },

    subscribeWishlist(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getWishlistSnapshot() {
      return wishlist;
    },
    addWishlistItem(product) {
      return run(() => {
        const canonical = demoProducts.find((p) => p.id === product.id);
        if (!canonical) throw notFound('Товар');
        if (!wishlist.some((i) => i.product.id === canonical.id)) {
          wishlist = [
            {
              id: 'wishlist-' + canonical.id,
              product: cloneProduct(canonical),
              addedAt: new Date().toISOString(),
            },
            ...wishlist,
          ];
          notify();
        }
        return previewResult(wishlist.map(cloneWishlistItem));
      });
    },
    listWishlist(query: AccountWishlistQuery = {}) {
      return run(() => {
        const search = normalizeSearch(query.search);
        const sort = query.sort ?? 'newest';
        const pageSize = positiveInteger(
          query.pageSize,
          DEFAULT_WISHLIST_PAGE_SIZE,
          48,
        );
        const filtered = wishlist.filter((item) => {
          if (!search) return true;
          return normalizeSearch(
            `${item.product.title} ${item.product.vendor} ${item.product.category} ${item.product.subcategory}`,
          ).includes(search);
        });
        const sorted = [...filtered].sort((left, right) => {
          if (sort === 'price-asc')
            return (
              left.product.price.amountMinor - right.product.price.amountMinor
            );
          if (sort === 'price-desc')
            return (
              right.product.price.amountMinor - left.product.price.amountMinor
            );
          if (sort === 'name')
            return left.product.title.localeCompare(right.product.title, 'uk');
          return right.addedAt.localeCompare(left.addedAt);
        });
        const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
        const page = Math.min(
          positiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER),
          pageCount,
        );
        const start = (page - 1) * pageSize;
        const result: AccountWishlistPage = {
          items: sorted.slice(start, start + pageSize).map(cloneWishlistItem),
          total: sorted.length,
          page,
          pageSize,
          pageCount,
          hasMore: page < pageCount,
        };
        return result;
      });
    },

    removeWishlistItem(id: string) {
      return run(() => {
        if (!wishlist.some((item) => item.id === id))
          throw notFound('Обраний товар');
        wishlist = wishlist.filter((item) => item.id !== id);
        notify();
        return previewResult(wishlist.map(cloneWishlistItem));
      });
    },

    removeWishlistItems(ids: readonly string[]) {
      return run(() => {
        const selectedIds = new Set(ids.filter(Boolean));
        if (!selectedIds.size)
          throw validationError({ ids: 'Оберіть хоча б один товар.' });
        if (!wishlist.some((item) => selectedIds.has(item.id)))
          throw notFound('Обрані товари');
        wishlist = wishlist.filter((item) => !selectedIds.has(item.id));
        notify();
        return previewResult(wishlist.map(cloneWishlistItem));
      });
    },

    listReviews() {
      return run(() => reviews.map(cloneReview));
    },

    updateReview(id: string, draft: AccountReviewDraft) {
      return run(() => {
        const errors = validateAccountReview(draft);
        if (hasAccountValidationErrors(errors)) throw validationError(errors);
        if (!reviews.some((review) => review.id === id))
          throw notFound('Відгук');

        reviews = reviews.map((review) =>
          review.id === id
            ? {
                ...review,
                rating: draft.rating,
                text: normalizeAccountText(draft.text),
              }
            : review,
        );
        return previewResult(reviews.map(cloneReview));
      });
    },

    deleteReview(id: string) {
      return run(() => {
        if (!reviews.some((review) => review.id === id))
          throw notFound('Відгук');
        reviews = reviews.filter((review) => review.id !== id);
        return previewResult(reviews.map(cloneReview));
      });
    },

    listAddresses() {
      return run(cloneAddresses);
    },

    addAddress(draft: AccountAddressDraft) {
      return run(() => {
        const errors = validateAccountAddress(draft);
        if (hasAccountValidationErrors(errors)) throw validationError(errors);

        let id: string;
        do {
          addressSequence += 1;
          id = `demo-address-${addressSequence}`;
        } while (addresses.some((address) => address.id === id));

        const address: AccountAddress = {
          id,
          label: normalizeAccountText(draft.label),
          recipientName: normalizeAccountText(draft.recipientName),
          deliveryMethod: draft.deliveryMethod,
          city: normalizeAccountText(draft.city),
          location: normalizeAccountText(draft.location),
          isDefault: Boolean(draft.makeDefault) || addresses.length === 0,
        };
        addresses = normalizeDefaultAddress(
          [...addresses, address],
          address.isDefault ? address.id : undefined,
        );
        return previewResult(cloneAddresses());
      });
    },

    updateAddress(id: string, draft: AccountAddressDraft) {
      return run(() => {
        const errors = validateAccountAddress(draft);
        if (hasAccountValidationErrors(errors)) throw validationError(errors);
        if (!addresses.some((address) => address.id === id))
          throw notFound('Адресу');

        addresses = addresses.map((address) =>
          address.id === id
            ? {
                ...address,
                label: normalizeAccountText(draft.label),
                recipientName: normalizeAccountText(draft.recipientName),
                deliveryMethod: draft.deliveryMethod,
                city: normalizeAccountText(draft.city),
                location: normalizeAccountText(draft.location),
              }
            : address,
        );
        addresses = normalizeDefaultAddress(
          addresses,
          draft.makeDefault ? id : undefined,
        );
        return previewResult(cloneAddresses());
      });
    },

    removeAddress(id: string) {
      return run(() => {
        const target = addresses.find((address) => address.id === id);
        if (!target) throw notFound('Адресу');
        addresses = addresses.filter((address) => address.id !== id);
        addresses = normalizeDefaultAddress(
          addresses,
          target.isDefault ? addresses[0]?.id : undefined,
        );
        return previewResult(cloneAddresses());
      });
    },

    setDefaultAddress(id: string) {
      return run(() => {
        if (!addresses.some((address) => address.id === id))
          throw notFound('Адресу');
        addresses = normalizeDefaultAddress(addresses, id);
        return previewResult(cloneAddresses());
      });
    },

    listPaymentMethods() {
      return run(() => paymentMethods.map((method) => ({ ...method })));
    },
  };
}

export const demoAccountService = createDemoAccountService();
