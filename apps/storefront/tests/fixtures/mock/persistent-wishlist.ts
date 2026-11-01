import { createDemoAccountService } from './account-service';
export const DEMO_WISHLIST_KEY = 'bazar-demo-wishlist-v1';
export interface WishlistStorage {
  read(): string | null;
  write(value: string): void;
}
/** Only product IDs; no copied product fields, account data, phone or token is stored. */
export function parseWishlistIds(raw: string): readonly string[] {
  if (raw.length > 16384) throw new Error('Invalid wishlist storage');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid wishlist storage');
  const r = value as Record<string, unknown>;
  if (
    Object.keys(r).sort().join(',') !== 'productIds,version' ||
    r.version !== 1 ||
    !Array.isArray(r.productIds) ||
    r.productIds.length > 200 ||
    r.productIds.some(
      (id) => typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id),
    )
  )
    throw new Error('Invalid wishlist storage');
  return [...new Set(r.productIds as string[])];
}
export function createPersistentDemoAccountService() {
  const base = createDemoAccountService(),
    listeners = new Set<() => void>();
  let storage: WishlistStorage | undefined,
    ready = false,
    loading = false,
    notice = '';
  const notify = () => listeners.forEach((listener) => listener());
  const save = () => {
    if (!storage) return;
    try {
      storage.write(
        JSON.stringify({
          version: 1,
          productIds: base.getWishlistSnapshot().map((item) => item.product.id),
        }),
      );
      notice = '';
    } catch {
      notice =
        'Не вдалося зберегти демо-обране. Зміни доступні лише до оновлення сторінки.';
    }
  };
  base.subscribeWishlist(() => {
    if (!loading) save();
    notify();
  });
  const reload = (initial = false) => {
    if (!storage) return;
    loading = true;
    try {
      const raw = storage.read();
      if (raw !== null) {
        try {
          base.restoreDemoWishlist(parseWishlistIds(raw));
          notice = '';
        } catch {
          base.restoreDemoWishlist([]);
          save();
          notice =
            'Пошкоджене демо-обране відкинуто. ' +
            (notice || 'Додайте товари з каталогу.');
        }
      } else {
        if (!initial) base.restoreDemoWishlist([]);
        save();
      }
    } catch {
      notice =
        'Локальне сховище недоступне. Демо-обране працює лише до оновлення сторінки.';
    } finally {
      loading = false;
      ready = true;
      notify();
    }
  };
  return {
    ...base,
    subscribeWishlist(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getWishlistNotice: () => notice,
    isWishlistReady: () => ready,
    reloadWishlist: () => reload(),
    connectWishlist(next: WishlistStorage) {
      storage = next;
      reload(true);
      return () => {
        storage = undefined;
      };
    },
  };
}
