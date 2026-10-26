export default function ProfileLoading() {
  return (
    <div className="account-loading" role="status" aria-live="polite">
      <span className="account-skeleton account-skeleton--title" />
      <span className="account-skeleton account-skeleton--line" />
      <div className="account-skeleton-grid"><span /><span /><span /></div>
      <span className="sr-only">Завантажуємо демонстраційний профіль…</span>
    </div>
  );
}
