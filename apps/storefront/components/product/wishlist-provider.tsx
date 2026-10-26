'use client';
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react';
import { createDemoAccountService } from '@/services/mock/account-service';
import type { AccountService } from '@/services/contracts/account';
const Context = createContext<AccountService | null>(null);
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => createDemoAccountService());
  return <Context.Provider value={service}>{children}</Context.Provider>;
}
export function useWishlist() {
  const service = useContext(Context);
  if (!service) throw new Error('Wishlist provider required');
  const items = useSyncExternalStore(
    service.subscribeWishlist,
    service.getWishlistSnapshot,
    service.getWishlistSnapshot,
  );
  return { service, items };
}
