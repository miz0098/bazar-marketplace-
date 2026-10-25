'use client';

import { createContext, useContext, useState } from 'react';
import type { AccountScenario } from '@/domain/account/account';
import type { AccountService } from '@/services/contracts/account';
import { createDemoAccountService } from '@/services/mock/account-service';

type AccountServices = Readonly<Record<AccountScenario, AccountService>>;

const AccountPreviewContext = createContext<AccountServices | null>(null);

export function AccountPreviewProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [services] = useState<AccountServices>(() => ({
    ready: createDemoAccountService(),
    empty: createDemoAccountService({ scenario: 'empty' }),
    error: createDemoAccountService({ scenario: 'error' }),
  }));

  return <AccountPreviewContext.Provider value={services}>{children}</AccountPreviewContext.Provider>;
}

export function useAccountService(scenario: AccountScenario = 'ready'): AccountService {
  const services = useContext(AccountPreviewContext);
  if (!services) throw new Error('useAccountService must be used inside AccountPreviewProvider');
  return services[scenario];
}
