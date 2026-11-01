import {ServerAccountGate} from '@/components/server/customer-provider';
import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/account-shell';
import './profile.css';
import './communication.css';

export const metadata: Metadata = {
  title: 'Профіль',
  description: 'Особистий кабінет покупця BAZAR.',
};

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ServerAccountGate><AccountShell>{children}</AccountShell></ServerAccountGate>;
}
