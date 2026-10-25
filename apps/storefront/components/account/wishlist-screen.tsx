'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AccountIcon } from '@/components/account/account-icons';
import { useAccountService } from '@/components/account/account-preview-provider';
import { AccountLoading, AccountPageHeading, AccountState, DemoMutationNotice } from '@/components/account/account-ui';
import { useCart } from '@/components/cart/cart-provider';
import type { AccountScenario, AccountWishlistPage, AccountWishlistSort } from '@/domain/account/account';
import { formatMoney } from '@/lib/money';

export function WishlistScreen({ scenario }: { scenario: AccountScenario }) {
  const service = useAccountService(scenario);
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AccountWishlistSort>('newest');
  const [pageSize, setPageSize] = useState(4);
  const [result, setResult] = useState<AccountWishlistPage | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');
    service.listWishlist({ search, sort, pageSize }).then((value) => {
      if (active) setResult(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити обране.');
    });
    return () => { active = false; };
  }, [attempt, pageSize, search, service, sort]);

  const visibleIds = useMemo(() => result?.items.map((item) => item.id) ?? [], [result]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const refresh = () => setAttempt((value) => value + 1);
  const mutate = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      setSelected(new Set());
      setNotice(success);
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося виконати демо-дію.');
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAllVisible = () => setSelected((current) => {
    const next = new Set(current);
    visibleIds.forEach((id) => { if (allVisibleSelected) next.delete(id); else next.add(id); });
    return next;
  });

  return (
    <div className="account-wishlist-screen">
      <AccountPageHeading kicker="Збережені товари" title="Обране" description="Пошук і дії працюють лише з демонстраційним списком та не синхронізуються з акаунтом." />
      <div className="account-wishlist-toolbar account-toolbar">
        <label className="account-search"><span>Пошук в обраному</span><input type="search" value={search} placeholder="Назва або бренд" onChange={(event) => { setSearch(event.target.value); setPageSize(4); setSelected(new Set()); }} /><AccountIcon name="search" /></label>
        <label className="account-sort"><span>Сортування</span><select value={sort} onChange={(event) => { setSort(event.target.value as AccountWishlistSort); setPageSize(4); setSelected(new Set()); }}><option value="newest">Спочатку нові</option><option value="price-asc">Від дешевих</option><option value="price-desc">Від дорогих</option><option value="name">За назвою</option></select></label>
      </div>
      {notice && <DemoMutationNotice>{notice} Зміна скинеться після оновлення сторінки.</DemoMutationNotice>}
      {error ? (
        <AccountState error icon="warning" title="Обране недоступне" text={error} action={<button className="account-button account-button--primary" type="button" onClick={refresh}>Спробувати ще раз</button>} />
      ) : !result ? <AccountLoading label="Завантажуємо демонстраційне обране…" /> : result.items.length === 0 ? (
        <AccountState icon="wishlist" title={search ? 'Нічого не знайдено' : 'Список обраного порожній'} text={search ? 'Спробуйте змінити запит або очистити пошук.' : 'Додайте товари з каталогу, коли синхронізований сервіс стане доступним. У цій версії показано лише демо-стан.'} action={search ? <button className="account-button account-button--secondary" type="button" onClick={() => setSearch('')}>Очистити пошук</button> : <Link className="account-button account-button--primary" href="/catalog">Перейти до каталогу</Link>} />
      ) : (
        <>
          <div className="account-wishlist-selection">
            <label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /> Обрати показані</label>
            <span>Обрано: {selected.size}</span>
            <button className="account-button account-button--danger" type="button" disabled={!selected.size || busy} onClick={() => void mutate(() => service.removeWishlistItems([...selected]), 'Обрані товари прибрано з демо-списку.')}>Видалити обрані</button>
          </div>
          <div className="account-wishlist-grid" aria-live="polite">
            {result.items.map((item) => (
              <article className="account-wishlist-card" aria-label={item.product.title} key={item.id}>
                <label className="account-wishlist-card__select"><input type="checkbox" checked={selected.has(item.id)} aria-label={`Обрати ${item.product.title}`} onChange={() => toggleItem(item.id)} /></label>
                <button className="account-wishlist-card__heart" type="button" aria-label={`Видалити ${item.product.title} з обраного`} disabled={busy} onClick={() => void mutate(() => service.removeWishlistItem(item.id), `${item.product.title} прибрано з демо-списку.`)}><AccountIcon name="trash" /></button>
                <Link className="account-wishlist-card__media" href={`/products/${item.product.handle}`} aria-label={`Відкрити ${item.product.title}`}><span className={`product-visual product-visual--${item.product.visual}`} aria-hidden="true"><span /></span></Link>
                <div className="account-wishlist-card__body">
                  <span className="account-wishlist-card__vendor">{item.product.vendor}</span>
                  <Link href={`/products/${item.product.handle}`}><h2>{item.product.title}</h2></Link>
                  <strong className="account-wishlist-card__price">{formatMoney(item.product.price)}</strong>
                  <div className="account-wishlist-card__actions">
                    <button className="account-button account-button--primary account-wishlist-card__button" type="button" disabled={!item.product.available} onClick={() => { cart.add(item.product); setNotice(`${item.product.title} додано до демонстраційного кошика.`); }}><AccountIcon name="cart" />{item.product.available ? 'До кошика' : 'Немає в наявності'}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {result.hasMore && <div className="account-wishlist-more"><button className="account-button account-button--secondary" type="button" onClick={() => setPageSize((value) => value + 4)}>Показати ще</button></div>}
        </>
      )}
    </div>
  );
}
