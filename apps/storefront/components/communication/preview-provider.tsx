'use client';

import { createContext, useContext, useState } from 'react';
import type { CommunicationScenario } from '@/domain/communication/communication';
import type { MessagingService, SupportService } from '@/services/contracts/communication';
import { createDemoMessagingService, createDemoSupportService } from '@/services/mock/communication-service';

type Services = Readonly<{ messaging: MessagingService; support: SupportService }>;
const PreviewContext = createContext<Readonly<Record<CommunicationScenario, Services>> | null>(null);

export function CommunicationPreviewProvider({ children }: { children: React.ReactNode }) {
  const [services] = useState(() => {
    const create = (scenario: CommunicationScenario): Services => ({ messaging: createDemoMessagingService({ scenario }), support: createDemoSupportService({ scenario }) });
    return { ready: create('ready'), empty: create('empty'), error: create('error'), 'send-error': create('send-error') };
  });
  return <PreviewContext.Provider value={services}>{children}</PreviewContext.Provider>;
}

export function useCommunicationServices(scenario: CommunicationScenario): Services {
  const services = useContext(PreviewContext);
  if (!services) throw new Error('Communication preview provider is required');
  return services[scenario];
}
