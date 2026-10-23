'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { mockCategories } from '@/fixtures/home';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <button className="catalog-button" type="button" aria-expanded={menuOpen} aria-controls="catalog-menu" onClick={() => setMenuOpen((value) => !value)}>
          <span className="catalog-button__icon" aria-hidden="true" />Каталог
        </button>
        <form className="search" action="/search">
          <label className="sr-only" htmlFor="header-search">Пошук товарів</label>
          <input id="header-search" name="q" placeholder="Я шукаю..." />
          <button type="submit" aria-label="Шукати"><SearchIcon /></button>
        </form>
        <nav className="header-actions" aria-label="Дії користувача">
          <Action href="/profile/wishlist" label="Обране"><HeartIcon /></Action>
          <Action href="/profile" label="Увійти"><UserIcon /></Action>
          <Action href="/cart" label="Кошик"><CartIcon /></Action>
        </nav>
        <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="catalog-menu" onClick={() => setMenuOpen((value) => !value)}>
          <span /><span /><span className="sr-only">Відкрити навігацію</span>
        </button>
        <div className="catalog-menu" id="catalog-menu" hidden={!menuOpen}>
          <p>Популярні категорії</p>
          <div>{mockCategories.map((category) => <Link href={category.href} key={category.id} onClick={() => setMenuOpen(false)}><span>{category.icon}</span>{category.title}</Link>)}</div>
        </div>
      </div>
    </header>
  );
}

function Action({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <Link className="header-action" href={href}><span>{children}</span><small>{label}</small></Link>;
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5.5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>; }
function CartIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10h10.9l2-7H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>; }
