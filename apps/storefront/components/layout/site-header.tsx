'use client';
import {useServerCustomer} from '../server/customer-provider';
import {useRouter} from 'next/navigation';

import { useWishlist } from '@/components/product/wishlist-provider';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthModal } from '@/components/auth/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { Logo } from '@/components/brand/logo';
import { SearchBox } from '@/components/search/search-box';
import type { Category, ProductSummary } from '@/services/contracts/catalog';

export function SiteHeader({
  categories,
  products,
  accountAction,
  cartCount,
}: {
  categories: readonly Category[];
  products: readonly ProductSummary[];
  accountAction?: {label:string;open:()=>void};
  cartCount?:number;
}) {
  const {state,enabled}=useServerCustomer(),router=useRouter();
  const effectiveAccount=accountAction??(enabled&&state.session?{label:state.session.user.firstName,open:()=>router.push('/profile/wishlist')}:undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { items: wishlist } = useWishlist();
  const { itemCount: localCount } = useCart();
  const itemCount = cartCount ?? localCount;
  const { openAuth } = useAuthModal();

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 180);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        if (menuOpen) {
          const triggers = menuRef.current?.querySelectorAll<HTMLButtonElement>(
            'button[aria-controls="catalog-menu"]',
          );
          Array.from(triggers ?? [])
            .find((button) => button.offsetParent !== null)
            ?.focus();
        }
      }
    };
    const handleOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="header-inner" ref={menuRef}>
        <Logo />
        <button
          className="catalog-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="catalog-menu"
          onPointerEnter={() => {
            cancelClose();
            setMenuOpen(true);
          }}
          onPointerLeave={scheduleClose}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="catalog-button__icon" aria-hidden="true" />
          Каталог
        </button>
        <SearchBox products={products} />
        <nav className="header-actions" aria-label="Дії користувача">
          <Action href="/profile/wishlist" label="Обране">
            <HeartIcon />
            <span
              className="cart-count"
              aria-label={`${wishlist.length} товарів в обраному`}
            >
              {wishlist.length}
            </span>
          </Action>
          <button
            className="header-action header-auth-trigger"
            type="button"
            onClick={() => effectiveAccount ? effectiveAccount.open() : openAuth('login')}
          >
            <span>
              <UserIcon />
            </span>
            <small>{effectiveAccount?.label ?? 'Увійти'}</small>
          </button>
          <Action href="/cart" label="Кошик">
            <CartIcon />
            <span
              className="cart-count"
              aria-label={`${itemCount} товарів у кошику`}
            >
              {itemCount}
            </span>
          </Action>
        </nav>
        <div className="header-mobile-actions">
          <Link
            className="mobile-commerce-link"
            href="/profile/wishlist"
            aria-label={`Обране: ${wishlist.length}`}
          >
            <HeartIcon />
            <span>{wishlist.length}</span>
          </Link>
          <Link
            className="mobile-commerce-link"
            href="/cart"
            aria-label={`Кошик: ${itemCount}`}
          >
            <CartIcon />
            <span>{itemCount}</span>
          </Link>
          <button
            className="mobile-auth-button"
            type="button"
            aria-label={effectiveAccount?.label ?? 'Увійти за номером телефону'}
            onClick={() => effectiveAccount ? effectiveAccount.open() : openAuth('login')}
          >
            <UserIcon />
          </button>
          <button
            className="mobile-menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="catalog-menu"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span className="sr-only">Відкрити навігацію</span>
          </button>
        </div>
        <div
          className="catalog-menu"
          id="catalog-menu"
          hidden={!menuOpen}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        >
          <p>Популярні категорії</p>
          <div>
            {categories.map((category) => (
              <section key={category.id}>
                <Link
                  className="catalog-menu__category"
                  href={`/catalog?category=${category.id}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{category.icon}</span>
                  {category.title}
                </Link>
                <div className="catalog-menu__subs">
                  {category.subcategories.map((subcategory) => (
                    <Link
                      href={`/catalog?category=${category.id}&subcategory=${encodeURIComponent(subcategory)}`}
                      key={subcategory}
                      onClick={() => setMenuOpen(false)}
                    >
                      {subcategory}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function Action({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="header-action" href={href}>
      <span>{children}</span>
      <small>{label}</small>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 5.5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.2 10h10.9l2-7H6" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
