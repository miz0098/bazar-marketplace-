import type { Metadata } from 'next';
import { AccountPreviewProvider } from '@/components/account/account-preview-provider';
import { AccountShell } from '@/components/account/account-shell';
import { CommunicationPreviewProvider } from '@/components/communication/preview-provider';
import './profile.css';
import './communication.css';

export const metadata: Metadata = {
  title: 'Профіль',
  description: 'Демонстраційний інтерфейс кабінету покупця BAZAR.',
};

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AccountPreviewProvider><CommunicationPreviewProvider><AccountShell>{children}</AccountShell></CommunicationPreviewProvider></AccountPreviewProvider>;
}
