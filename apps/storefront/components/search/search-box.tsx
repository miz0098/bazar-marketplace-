'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { suggestProducts } from '@/domain/catalog/query';
import type { ProductSummary } from '@/services/contracts/catalog';

export function SearchBox({ products }: { products: readonly ProductSummary[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const suggestions = suggestProducts(products, query, 5);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div className="search-shell" ref={rootRef}>
      <form className="search" action="/search" role="search">
        <label className="sr-only" htmlFor="header-search">Пошук товарів</label>
        <input id="header-search" name="q" value={query} placeholder="Я шукаю..." autoComplete="off" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} />
        <button className="search__clear" type="button" aria-label="Очистити пошук" disabled={!query} onClick={() => { setQuery(''); setOpen(false); }}>×</button>
        <button className="search__submit" type="submit" aria-label="Шукати"><SearchIcon /></button>
      </form>
      {open && query.trim().length >= 2 && (
        <div className="search-suggestions" role="listbox" aria-label="Підказки пошуку">
          {suggestions.length ? suggestions.map((product) => (
            <Link href={`/products/${product.handle}`} role="option" key={product.id} onClick={() => setOpen(false)}>
              <span>{product.vendor}</span><strong>{product.title}</strong>
            </Link>
          )) : <p>Збігів не знайдено</p>}
          <Link className="search-suggestions__all" href={`/search?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}>Переглянути всі результати</Link>
        </div>
      )}
    </div>
  );
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>; }
