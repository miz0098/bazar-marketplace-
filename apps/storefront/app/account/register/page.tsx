import type { Metadata } from 'next';
import { AuthFlow } from '@/components/auth/auth-flow';

export const metadata: Metadata = { title: 'Реєстрація' };

export default function RegisterPage() {
  return (
    <section className="auth-page" aria-label="Реєстрація BAZAR">
      <div className="container auth-page__inner">
        <AuthFlow idPrefix="auth-register-page" initialIntent="register" surface="page" />
      </div>
    </section>
  );
}
