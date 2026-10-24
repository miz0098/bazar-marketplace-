import type { Metadata } from 'next';
import { AuthFlow } from '@/components/auth/auth-flow';

export const metadata: Metadata = { title: 'Вхід' };

export default function LoginPage() {
  return (
    <section className="auth-page" aria-label="Вхід до BAZAR">
      <div className="container auth-page__inner">
        <AuthFlow idPrefix="auth-login-page" initialIntent="login" surface="page" />
      </div>
    </section>
  );
}
