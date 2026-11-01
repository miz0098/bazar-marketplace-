'use client';
import {useServerCustomer} from '../server/customer-provider';
import {createServerAccountFacade} from '../../services/server/account-facade';
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react';
import type { AccountWishlistItem } from '@/domain/account/account';
type Service = ReturnType<typeof createServerAccountFacade>;
const Context = createContext<{
  service: Service;
  initial: readonly AccountWishlistItem[];
} | null>(null);
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const {store}=useServerCustomer();
  const [value] = useState(() => {
    if(!store)throw new Error('Server wishlist provider required');
    const service=createServerAccountFacade(store);
    return { service, initial: service.getWishlistSnapshot() };
  });
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
