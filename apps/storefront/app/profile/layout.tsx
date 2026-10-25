import type { Metadata } from 'next';
import { AccountPreviewProvider } from '@/components/account/account-preview-provider';
import { AccountShell } from '@/components/account/account-shell';
import './profile.css';

export const metadata: Metadata = {
  title: 'Профіль',
  description: 'Демонстраційний інтерфейс кабінету покупця BAZAR.',
};

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AccountPreviewProvider><AccountShell>{children}</AccountShell></AccountPreviewProvider>;
}
