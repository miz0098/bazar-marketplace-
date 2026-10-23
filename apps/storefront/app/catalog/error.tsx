'use client';

export default function CatalogError({ reset }: { reset: () => void }) {
  return <div className="container page-shell"><div className="empty-state" role="alert"><span aria-hidden="true">!</span><h1>Не вдалося відкрити каталог</h1><p>Спробуйте повторити запит.</p><button className="button" type="button" onClick={reset}>Спробувати ще раз</button></div></div>;
}
