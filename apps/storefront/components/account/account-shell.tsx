'use client';
import {ServerAccountNotifications,ServerConversationBadge} from './server-account-notifications';
import {useServerCustomer} from '../server/customer-provider';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountIcon, type AccountIconName } from '@/components/account/account-icons';

const navigation: readonly { href: string; label: string; icon: AccountIconName }[] = [
  { href: '/profile/orders', label: 'Мої замовлення', icon: 'orders' },
  { href: '/profile/wishlist', label: 'Обране', icon: 'wishlist' },
  { href: '/profile/messages', label: 'Повідомлення', icon: 'messages' },
  { href: '/profile/reviews', label: 'Мої відгуки', icon: 'reviews' },
  { href: '/profile/personal-data', label: 'Особисті дані', icon: 'profile' },
  { href: '/profile/addresses', label: 'Улюблені адреси', icon: 'addresses' },
  { href: '/profile/payment-methods', label: 'Платіжні методи', icon: 'payments' },
  { href: '/profile/support', label: 'BAZAR-підтримка', icon: 'support' },
];

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AccountShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const {store}=useServerCustomer();const router=useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState('');
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const previousPathRef = useRef(pathname);

  const closeDrawer = useCallback((restoreFocus = true) => {
    setDrawerOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => { document.body.style.overflow = previousOverflow; };
  }, [drawerOpen]);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    setDrawerOpen(false);
    window.requestAnimationFrame(() => contentRef.current?.focus({ preventScroll: true }));
  }, [pathname]);

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!drawerOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const previewLogout = async () => {
    if(store){try{await store.logout();router.push('/');}catch{setLogoutNotice('Сервер не підтвердив вихід. Оновіть дані та повторіть.');}return;}
    closeDrawer(false);
    setLogoutNotice('Серверної сесії немає: це анонімний демо-перегляд, тому завершувати вхід не потрібно.');
    window.requestAnimationFrame(() => noticeRef.current?.focus({ preventScroll: true }));
  };

  return (
    <section className={`account-module${drawerOpen ? ' is-drawer-open' : ''}`} data-account-shell>
      <div className="account-container">
        <button
          className="account-mobile-toggle"
          type="button"
          aria-controls="account-sidebar"
          aria-expanded={drawerOpen}
          ref={triggerRef}
          onClick={() => setDrawerOpen(true)}
        >
          <AccountIcon name="menu" />
          Відкрити меню профілю
        </button>

        <div className="account-layout">
          <aside
            className="account-sidebar"
            id="account-sidebar"
            aria-label="Навігація акаунта"
            aria-modal={drawerOpen || undefined}
            role={drawerOpen ? 'dialog' : undefined}
            ref={drawerRef}
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="account-sidebar__top">
              <button className="account-sidebar__close" type="button" aria-label="Закрити меню акаунта" ref={closeRef} onClick={() => closeDrawer()}>
                <AccountIcon name="close" />
              </button>
            </div>
            <nav className="account-nav" aria-label="Розділи акаунта">
              {navigation.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link className={`account-nav__item${active ? ' is-active' : ''}`} href={item.href} aria-current={active ? 'page' : undefined} key={item.href} onClick={() => closeDrawer(false)}>
                    <span className="account-nav__icon"><AccountIcon name={item.icon} /></span>
                    {item.label}{item.href==='/profile/messages'&&<ServerConversationBadge/>}
                  </Link>
                );
              })}
              <button className="account-nav__item account-nav__item--logout" type="button" onClick={previewLogout}>
                <span className="account-nav__icon"><AccountIcon name="logout" /></span>
                Вихід
              </button>
            </nav>
          </aside>

          <div className="account-content" tabIndex={-1} ref={contentRef} inert={drawerOpen ? true : undefined}>
            <div className="account-preview-note" role="note">
              <strong>{store?'Тестовий серверний акаунт':'Демонстраційний профіль'}</strong>
              <span>{store?'Сесія, кошик і обране підключені до тестового сервера. Профіль, адреси, відгуки, листування й сповіщення зберігаються в тестовому акаунті.':'Ви не автентифіковані. Дані вигадані, а зміни діють лише до оновлення сторінки.'}</span>
            </div>
            {logoutNotice && <p className="account-status" role="status" tabIndex={-1} ref={noticeRef}>{logoutNotice}</p>}
            {store&&<ServerAccountNotifications/>}
            {children}
          </div>
        </div>
      </div>
      {drawerOpen && <button className="account-drawer-backdrop" type="button" tabIndex={-1} aria-label="Закрити меню акаунта" onClick={() => closeDrawer()} />}
    </section>
  );
}

export const accountNavigationLabels = [...navigation.map((item) => item.label), 'Вихід'] as const;
