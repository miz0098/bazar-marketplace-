'use client';
import {useServerCustomer} from '../server/customer-provider';

import { createContext, useContext, useState } from 'react';
import type { AccountScenario } from '@/domain/account/account';
import type { AccountService } from '@/services/contracts/account';
import {useWishlist} from '@/components/product/wishlist-provider';
import { createDemoAccountService } from '@/services/mock/account-service';

type AccountServices = Readonly<Record<AccountScenario, AccountService>>;

const AccountPreviewContext = createContext<AccountServices | null>(null);

export function AccountPreviewProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const {service}=useWishlist();
  const [services] = useState<AccountServices>(() => ({
    ready: service,
    empty: createDemoAccountService({ scenario: 'empty' }),
    error: createDemoAccountService({ scenario: 'error' }),
  }));

  return <AccountPreviewContext.Provider value={services}>{children}</AccountPreviewContext.Provider>;
}

export function useAccountService(scenario: AccountScenario = 'ready'): AccountService {
  const services = useContext(AccountPreviewContext);
  if (!services) throw new Error('useAccountService must be used inside AccountPreviewProvider');
  const {enabled}=useServerCustomer();
  return services[enabled?'ready':scenario];
}
