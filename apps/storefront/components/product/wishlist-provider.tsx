'use client';
import {useServerCustomer} from '../server/customer-provider';
import {createServerAccountFacade} from '../../services/server/account-facade';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  createPersistentDemoAccountService,
  DEMO_WISHLIST_KEY,
} from '@/services/mock/persistent-wishlist';
import type { AccountWishlistItem } from '@/domain/account/account';
type Service = ReturnType<typeof createPersistentDemoAccountService>;
const Context = createContext<{
  service: Service;
  initial: readonly AccountWishlistItem[];
} | null>(null);
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const {store}=useServerCustomer();
  const [value] = useState(() => {
    const service = store?createServerAccountFacade(store):createPersistentDemoAccountService();
    return { service, initial: service.getWishlistSnapshot() };
  });
  useEffect(() => {
    if(store)return;
    const disconnect = value.service.connectWishlist({
      read: () => localStorage.getItem(DEMO_WISHLIST_KEY),
      write: (data) => localStorage.setItem(DEMO_WISHLIST_KEY, data),
    });
    const sync = (event: StorageEvent) => {
      if (event.key === DEMO_WISHLIST_KEY || event.key === null)
        value.service.reloadWishlist();
    };
    window.addEventListener('storage', sync);
    return () => {
      disconnect();
      window.removeEventListener('storage', sync);
    };
  }, [value,store]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWishlist() {
  const value = useContext(Context);
  if (!value) throw new Error('Wishlist provider required');
  const { service, initial } = value;
  const items = useSyncExternalStore(
    service.subscribeWishlist,
    service.getWishlistSnapshot,
    () => initial,
  );
  const notice = useSyncExternalStore(
    service.subscribeWishlist,
    service.getWishlistNotice,
    () => '',
  );
  const ready = useSyncExternalStore(
    service.subscribeWishlist,
    service.isWishlistReady,
    () => false,
  );
  return { service, items, notice, ready };
}
