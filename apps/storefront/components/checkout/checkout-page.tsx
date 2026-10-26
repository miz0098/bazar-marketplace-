'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/cart/cart-provider';
import { checkoutTotal, EMPTY_CHECKOUT_DRAFT, normalizeUkrainianPhone, parseCheckoutDraft, validateContactAndDelivery } from '@/domain/checkout/checkout';
import { formatMoney } from '@/lib/money';
import type { CheckoutDraft, DeliveryMethod, PaymentMethod, PromoResult } from '@/services/contracts/checkout';
import { demoCheckoutService } from '@/services/mock/checkout-service';

const STORAGE_KEY = 'bazar-demo-checkout-v1';
const stepNames = ['Контактні дані та доставка', 'Оплата', 'Підтвердження'];

function Summary({ subtotal, promo }: { subtotal: ReturnType<typeof checkoutTotal>; promo: PromoResult | null }) {
  const total = checkoutTotal(subtotal, promo);
  return <aside className="checkout-summary"><h2>Ваше замовлення</h2><div><span>Товари</span><strong>{formatMoney(subtotal)}</strong></div>{promo && <div className="checkout-discount"><span>Промокод {promo.code}</span><strong>−{formatMoney(promo.discount)}</strong></div>}<div><span>Доставка</span><strong>вартість за тарифами перевізника</strong></div><div className="checkout-summary__total"><span>До сплати за товари</span><strong>{formatMoney(total)}</strong></div><p>Вартість доставки не включена й не розраховується у демо.</p></aside>;
}

export function CheckoutPage() {
  const cart = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const rawStep = Number(params.get('step') ?? 1);
  const step = rawStep >= 1 && rawStep <= 3 ? rawStep : 1;
  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_CHECKOUT_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promo, setPromo] = useState<PromoResult | null>(null);
  const [promoState, setPromoState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(parseCheckoutDraft(window.sessionStorage.getItem(STORAGE_KEY)));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }, [draft, hydrated]);
  useEffect(() => { if (hydrated) headingRef.current?.focus(); }, [step, hydrated]);
  useEffect(() => {
    if (hydrated && step > 1 && Object.keys(validateContactAndDelivery(draft)).length) router.replace('/checkout?step=1');
  }, [draft, hydrated, router, step]);

  const update = (patch: Partial<CheckoutDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const go = (next: number) => router.push(`/checkout?step=${next}`);
  function submitDelivery(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateContactAndDelivery(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(first)?.focus();
      return;
    }
    update({ contact: { ...draft.contact, phone: normalizeUkrainianPhone(draft.contact.phone) } });
    go(2);
  }

  async function applyPromo(event: FormEvent) {
    event.preventDefault();
    if (!draft.promoCode.trim()) { setPromoState('error'); setPromoMessage('Введіть промокод.'); return; }
    setPromoState('loading'); setPromoMessage('Перевіряємо демо-промокод…');
    try {
      const result = await demoCheckoutService.validatePromo(draft.promoCode, cart.subtotal);
      setPromo(result); setPromoState('idle'); setPromoMessage(result.message);
    } catch (error) {
      setPromo(null); setPromoState('error'); setPromoMessage(error instanceof Error ? error.message : 'Не вдалося перевірити промокод.');
    }
  }

  if (!cart.hydrated || !hydrated) return <div className="loading-state" role="status"><span /><p>Завантажуємо оформлення…</p></div>;
  if (!cart.lines.length) return <div className="empty-cart"><span aria-hidden="true">🛒</span><h1>Немає товарів для оформлення</h1><p>Додайте товари до демонстраційного кошика, щоб пройти три кроки оформлення.</p><Link className="button" href="/catalog">Перейти до каталогу</Link></div>;

  return <>
    <nav className="breadcrumbs" aria-label="Навігаційний ланцюжок"><Link href="/">Головна</Link><span>/</span><Link href="/cart">Кошик</Link><span>/</span><span>Оформлення</span></nav>
    <header className="checkout-heading"><p className="eyebrow">Демонстраційне оформлення</p><h1 ref={headingRef} tabIndex={-1}>{stepNames[step - 1]}</h1><p>Дані зберігаються лише у вашому браузері. Замовлення, оплата та резерв товару не створюються.</p></header>
    <ol className="checkout-steps" aria-label="Кроки оформлення">{stepNames.map((name, index) => <li key={name} className={step === index + 1 ? 'is-active' : step > index + 1 ? 'is-complete' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span><small>{name}</small></li>)}</ol>

    {step === 1 && <form className="checkout-layout" onSubmit={submitDelivery} noValidate><section className="checkout-card"><h2>Контактні дані</h2><div className="checkout-fields"><label htmlFor="fullName">Ім’я та прізвище<input id="fullName" autoComplete="name" value={draft.contact.fullName} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} onChange={(e) => update({ contact: { ...draft.contact, fullName: e.target.value } })} />{errors.fullName && <small id="fullName-error" className="field-error">{errors.fullName}</small>}</label><label htmlFor="phone">Телефон<input id="phone" inputMode="tel" autoComplete="tel" placeholder="+380XXXXXXXXX" value={draft.contact.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} onChange={(e) => update({ contact: { ...draft.contact, phone: e.target.value } })} />{errors.phone && <small id="phone-error" className="field-error">{errors.phone}</small>}</label></div><h2>Доставка</h2><fieldset className="checkout-options"><legend>Оберіть перевізника</legend>{([['nova-poshta', 'Нова пошта'], ['meest', 'Meest'], ['ukrposhta', 'Укрпошта']] as const).map(([value, label]) => <label key={value}><input type="radio" name="delivery" checked={draft.delivery.method === value} onChange={() => update({ delivery: { ...draft.delivery, method: value as DeliveryMethod } })} /><span><strong>{label}</strong><small>{value === 'ukrposhta' ? 'Відділення. Без live-пошуку у демо.' : 'Відділення або поштомат. Без live-пошуку у демо.'}</small></span></label>)}<label className="is-disabled"><input type="radio" name="delivery" disabled /><span><strong>ПВЗ BAZAR</strong><small>Тимчасово недоступно</small></span></label></fieldset><div className="checkout-fields"><label htmlFor="city">Населений пункт<input id="city" autoComplete="address-level2" value={draft.delivery.city} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined} onChange={(e) => update({ delivery: { ...draft.delivery, city: e.target.value } })} />{errors.city && <small id="city-error" className="field-error">{errors.city}</small>}</label><label htmlFor="branch">Номер або адреса відділення<input id="branch" value={draft.delivery.branch} aria-invalid={Boolean(errors.branch)} aria-describedby={errors.branch ? 'branch-error' : undefined} onChange={(e) => update({ delivery: { ...draft.delivery, branch: e.target.value } })} />{errors.branch && <small id="branch-error" className="field-error">{errors.branch}</small>}</label></div><p className="checkout-shipping-copy">Доставка: <strong>вартість за тарифами перевізника</strong></p><div className="checkout-actions"><Link href="/cart">Назад до кошика</Link><button className="button" type="submit">Продовжити до оплати</button></div></section><Summary subtotal={cart.subtotal} promo={promo} /></form>}

    {step === 2 && <div className="checkout-layout"><section className="checkout-card"><h2>Спосіб оплати</h2><fieldset className="checkout-options"><legend className="visually-hidden">Оберіть спосіб оплати</legend>{([['card-online', 'Карткою онлайн', 'Демонстрація без платіжного шлюзу та списання.'], ['on-receipt', 'Під час отримання', 'Умови та комісії перевізника не розраховуються.']] as const).map(([value, label, note]) => <label key={value}><input type="radio" name="payment" checked={draft.paymentMethod === value} onChange={() => update({ paymentMethod: value as PaymentMethod })} /><span><strong>{label}</strong><small>{note}</small></span></label>)}</fieldset><form className="promo-form" onSubmit={applyPromo}><label htmlFor="promoCode">Промокод</label><div><input id="promoCode" value={draft.promoCode} onChange={(e) => { update({ promoCode: e.target.value }); setPromo(null); setPromoMessage(''); }} placeholder="Для демо: BAZAR10" /><button type="submit" disabled={promoState === 'loading'}>{promoState === 'loading' ? 'Перевіряємо…' : 'Застосувати'}</button></div><p role="status" className={promoState === 'error' ? 'field-error' : 'field-success'}>{promoMessage}</p></form><div className="checkout-actions"><button type="button" className="link-button" onClick={() => go(1)}>Назад</button><button className="button" type="button" onClick={() => go(3)}>Перейти до підтвердження</button></div></section><Summary subtotal={cart.subtotal} promo={promo} /></div>}

    {step === 3 && <div className="checkout-layout"><section className="checkout-card checkout-review"><h2>Перевірте дані</h2><dl><div><dt>Отримувач</dt><dd>{draft.contact.fullName}<br />{draft.contact.phone}</dd></div><div><dt>Доставка</dt><dd>{draft.delivery.method === 'nova-poshta' ? 'Нова пошта' : draft.delivery.method === 'ukrposhta' ? 'Укрпошта' : 'Meest'}<br />{draft.delivery.city}, {draft.delivery.branch}<br />вартість за тарифами перевізника</dd></div><div><dt>Оплата</dt><dd>{draft.paymentMethod === 'card-online' ? 'Карткою онлайн' : 'Під час отримання'}</dd></div></dl><h2>Товари</h2><ul className="checkout-items">{cart.lines.map((line) => <li key={line.product.variantId??line.product.id}><span>{line.product.title} {line.product.variantLabel} × {line.quantity}</span><strong>{formatMoney({ ...line.product.price, amountMinor: line.product.price.amountMinor * line.quantity })}</strong></li>)}</ul><div className="demo-stop" role="note"><strong>Демо завершується на цьому кроці.</strong><p>Кнопки створення замовлення або підтвердження оплати немає. Кошик не очищається, товар не резервується.</p></div><div className="checkout-actions"><button type="button" className="link-button" onClick={() => go(2)}>Назад до оплати</button><Link className="button button--secondary" href="/cart">Повернутися до кошика</Link></div></section><Summary subtotal={cart.subtotal} promo={promo} /></div>}
  </>;
}
