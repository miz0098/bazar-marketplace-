'use client';

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="account-state account-state--error" role="alert">
      <span className="account-state__icon" aria-hidden="true">!</span>
      <h1>Не вдалося відкрити демо-профіль</h1>
      <p>Спробуйте завантажити локальні демонстраційні дані ще раз.</p>
      <button className="account-button account-button--primary" type="button" onClick={reset}>Повторити</button>
    </section>
  );
}
