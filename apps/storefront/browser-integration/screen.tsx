"use client";
import Link from "next/link";
import { NotificationCenter } from "../components/notifications/notification-center";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "../components/layout/site-header";
import { SiteFooter } from "../components/layout/site-footer";
import { WishlistProvider } from "../components/product/wishlist-provider";
import { CartProvider } from "../components/cart/cart-provider";
import { AuthProvider } from "../components/auth/auth-provider";
import { useRequestState } from "../components/account/use-request-state";
function formatMoney(m: { amountMinor: number; currency: "UAH" }) {
  const n = BigInt(m.amountMinor);
  return `${String(n / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")},${String(n % 100n).padStart(2, "0")} ₴`;
}
import { browserClients } from "./client";
import {
  parseResume,
  readGuest,
  RESUME_KEY,
  GUEST_KEY,
  type BrowserResume,
} from "./resume";
import type { ServerAuthSession } from "../lib/server-auth-client";
import type { ApiProduct, ApiProductDetail } from "../lib/catalog-api-client";
import type { ServerCartView } from "../services/contracts/server-cart";
import type {
  CheckoutSessionDto,
  IntegrationOrderDto,
} from "../services/contracts/checkout-business";
import type {
  ShippingQuote,
  ShippingCity,
  ShippingPoint,
  Carrier,
} from "../services/contracts/shipping-business";
import type { PaymentAttempt } from "../services/contracts/payment-business";
import type { LifecycleView } from "../services/contracts/order-lifecycle";
type Clients = ReturnType<typeof browserClients>;
type Data = {
  session: ServerAuthSession | null;
  products: ApiProduct[];
  product: ApiProductDetail | null;
  cart: ServerCartView | null;
  draft: CheckoutSessionDto | null;
  quote: ShippingQuote | null;
  attempt: PaymentAttempt | null;
  orders: IntegrationOrderDto[];
  order: IntegrationOrderDto | null;
  history: LifecycleView | null;
  resume: BrowserResume | null;
  guest: string[];
};
const names = {
  "nova-poshta": "Нова пошта",
  meest: "Meest",
  ukrposhta: "Укрпошта",
};
const codeOf = (e: unknown) =>
  e && typeof e === "object" && "status" in e ? e.status : undefined;
export function BrowserIntegrationApp() {
  return (
    <WishlistProvider>
      <CartProvider products={[]}>
        <AuthProvider>
          <Screen />
        </AuthProvider>
      </CartProvider>
    </WishlistProvider>
  );
}
function Screen() {
  const [clients] = useState(browserClients),
    path = usePathname(),
    params = useSearchParams(),
    router = useRouter(),
    [revision, setRevision] = useState(0);
  const requestKey = useMemo(() => ({ path, revision }), [path, revision]);
  const [data, setData] = useRequestState<Data | undefined>(
      requestKey,
      undefined,
    ),
    [loadError, setLoadError] = useRequestState(requestKey, "");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    inflight = useRef(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      let session: ServerAuthSession | null = null;
      try {
        session = await clients.auth.session();
      } catch (e) {
        if (codeOf(e) !== 401) throw e;
        await clients.auth.bootstrap();
      }
      const catalog = clients.catalog(location.origin),
        products = (await catalog.list()).items,
        product = path.startsWith("/products/")
          ? await catalog.get(path.split("/").at(-1)!)
          : null;
      let cart: ServerCartView | null = null,
        draft: CheckoutSessionDto | null = null,
        attempt: PaymentAttempt | null = null,
        orders: IntegrationOrderDto[] = [],
        order: IntegrationOrderDto | null = null,
        history: LifecycleView | null = null;
      const quote: ShippingQuote | null = null;
      const resume = session
        ? parseResume(sessionStorage.getItem(RESUME_KEY), session.user.id)
        : null;
      if (resume) sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
      else sessionStorage.removeItem(RESUME_KEY);
      if (session) {
        try {
          cart = await clients.cart.get();
        } catch (e) {
          if (codeOf(e) !== 404) throw e;
        }
        if (resume?.checkoutId && path === "/checkout") {
          draft = await clients.checkout.get(resume.checkoutId);
          try {
            const s = await clients.shipping.getSelection(draft.id);
            if (s.quoteId) {
              /* quote freshness remains enforced by server on pay/confirm */
            }
          } catch (e) {
            if (codeOf(e) !== 404) throw e;
          }
        }
        if (resume?.attemptId && path === "/checkout")
          attempt = await clients.payments.get(resume.attemptId);
        if (path.startsWith("/profile/orders")) {
          orders = (await clients.checkout.listOrders()).items;
          const id = path.split("/")[3];
          if (id) {
            order = await clients.checkout.getOrder(id);
            history = await clients.lifecycle.getOrder(id);
          }
        }
      }
      return {
        session,
        products,
        product,
        cart,
        draft,
        quote,
        attempt,
        orders,
        order,
        history,
        resume,
        guest: readGuest(localStorage.getItem(GUEST_KEY)),
      };
    };
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Не вдалося завантажити серверні тестові дані. Сесія або стан могли змінитися.",
          );
      });
    return () => {
      active = false;
    };
  }, [clients, path, revision, setData, setLoadError]);
  const save = useCallback((next: BrowserResume) => {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(next));
  }, []);
  async function run(op: () => Promise<void>) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    try {
      await op();
      setRevision((n) => n + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Серверна тестова дія недоступна.",
      );
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  const start = async () => {
    if (!data?.session || !data.cart?.canCheckout)
      throw new Error("Увійдіть і перевірте серверний кошик.");
    const resume = data.resume ?? {
      version: 1 as const,
      userId: data.session.user.id,
    };
    const key = resume.startKey ?? crypto.randomUUID();
    save({ ...resume, startKey: key });
    const draft = await clients.checkout.start({
      cartId: data.cart.cart.id,
      expectedCartVersion: data.cart.cart.version,
      idempotencyKey: key,
    });
    save({ ...resume, startKey: key, checkoutId: draft.id });
    router.push("/checkout?step=1");
  };
  const add = async (p: ApiProductDetail) => {
    if (!data) return;
    if (!data.session) {
      localStorage.setItem(
        GUEST_KEY,
        JSON.stringify([...new Set([...data.guest, p.variants[0].id])]),
      );
      router.push("/cart");
      return;
    }
    const cart = await clients.cart.ensureCurrent();
    await clients.cart.add({
      variantId: p.variants[0].id,
      quantity: 1,
      expectedVersion: cart.cart.version,
      idempotencyKey: crypto.randomUUID(),
    });
  };
  const step = Number(params.get("step") ?? 1);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти до вмісту
      </a>
      <SiteHeader
        categories={[]}
        products={[]}
        accountAction={{
          label: data?.session ? "Серверна сесія" : "Серверний вхід",
          open: () => router.push("/account/login"),
        }}
        cartCount={
          data?.session
            ? (data.cart?.cart.lines.reduce((s, l) => s + l.quantity, 0) ?? 0)
            : (data?.guest.length ?? 0)
        }
      />
      <main
        id="main-content"
        className={`container${path === "/checkout" ? " checkout-page" : ""}`}
      >
        <p className="demo-stop" role="note">
          Ізольований browser-integration. Лише вигадані дані PostgreSQL. Без
          реальних SMS, списань, ТТН або замовлень.
        </p>
        <nav className="breadcrumbs" aria-label="Тестовий шлях">
          <Link href="/catalog">Каталог</Link>
          <Link href="/cart">Кошик</Link>
          <Link href="/profile/orders">Мої замовлення</Link>
        </nav>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {loadError ? (
          <section className="empty-cart">
            <h1>Серверний стан недоступний</h1>
            <p role="alert">{loadError}</p>
            <button
              className="button"
              onClick={() => {
                sessionStorage.removeItem(RESUME_KEY);
                setRevision((n) => n + 1);
              }}
            >
              Повторити без локального тестового стану
            </button>
          </section>
        ) : !data ? (
          <div role="status" className="loading-state">
            Завантажуємо серверні дані…
          </div>
        ) : (
          <>
            {path === "/account/login" ? (
              <Login
                clients={clients}
                busy={busy}
                run={run}
                session={data.session}
                done={() => router.push("/cart")}
              />
            ) : path === "/cart" ? (
              <>
                <h1>Кошик</h1>
                <p>
                  Локальний гостьовий кошик: {data.guest.length}. Автоматичного
                  об’єднання немає.
                </p>
                {!data.session ? (
                  <Link className="button" href="/account/login">
                    Увійти через сервер для оформлення
                  </Link>
                ) : (
                  <>
                    <p>
                      Серверний кошик: {data.cart?.cart.lines.length ?? 0}{" "}
                      позицій
                    </p>
                    {!data.cart?.cart.lines.length && (
                      <>
                        <p>
                          Гостьові товари не перенесено. Додайте товар окремою
                          дією.
                        </p>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const p = await clients
                                .catalog(location.origin)
                                .get("browser-product");
                              await add(p);
                            })
                          }
                        >
                          Додати тестовий товар у серверний кошик
                        </button>
                      </>
                    )}
                    {data.cart?.cart.lines.map((l) => (
                      <div className="cart-row" key={l.variantId}>
                        <strong>
                          {
                            data.products.find((p) => p.id === l.productId)
                              ?.title
                          }
                        </strong>
                        <span>{formatMoney(l.lineTotal)}</span>
                        <label>
                          Кількість
                          <input
                            aria-label="Кількість у серверному кошику"
                            type="number"
                            min={1}
                            max={5}
                            value={l.quantity}
                            disabled={busy}
                            onChange={(e) => {
                              const quantity = Number(e.target.value);
                              void run(async () => {
                                await clients.cart.set(l.variantId, {
                                  quantity,
                                  expectedVersion: data.cart!.cart.version,
                                  idempotencyKey: crypto.randomUUID(),
                                });
                                sessionStorage.removeItem(RESUME_KEY);
                              });
                            }}
                          />
                        </label>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await clients.cart.remove(l.variantId, {
                                expectedVersion: data.cart!.cart.version,
                                idempotencyKey: crypto.randomUUID(),
                              });
                              sessionStorage.removeItem(RESUME_KEY);
                            })
                          }
                        >
                          Видалити
                        </button>
                      </div>
                    ))}
                    {data.cart &&
                      !data.cart.canCheckout &&
                      data.cart.cart.lines.length > 0 && (
                        <p role="alert" className="field-error">
                          Серверні залишки не дозволяють оформлення. Перевірте
                          кошик.
                        </p>
                      )}
                    {data.cart && (
                      <p>
                        Серверна сума товарів:{" "}
                        <strong>{formatMoney(data.cart.cart.subtotal)}</strong>
                      </p>
                    )}
                    <button
                      className="button"
                      disabled={busy || !data.cart?.canCheckout}
                      onClick={() => void run(start)}
                    >
                      Перейти до оформлення
                    </button>
                  </>
                )}
              </>
            ) : path === "/checkout" ? (
              <>
                {!data.session ? (
                  <Link href="/account/login">Потрібна серверна сесія</Link>
                ) : !data.draft ? (
                  <>
                    <h1>Оформлення</h1>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => void run(start)}
                    >
                      Створити тестову чернетку
                    </button>
                  </>
                ) : (
                  <>
                    <header className="checkout-heading">
                      <p className="eyebrow">Ізольований серверний checkout</p>
                      <h1>
                        {[
                          "Контактні дані та доставка",
                          "Оплата",
                          "Підтвердження",
                        ][step - 1] ?? "Оформлення"}
                      </h1>
                      <p>
                        Усі зовнішні операції тестові. Підсумок товарів не є
                        реальною сумою списання.
                      </p>
                    </header>
                    <ol
                      className="checkout-steps"
                      aria-label="Кроки оформлення"
                    >
                      {[
                        "Контактні дані та доставка",
                        "Оплата",
                        "Підтвердження",
                      ].map((s, i) => (
                        <li
                          key={s}
                          className={step === i + 1 ? "is-active" : ""}
                          aria-current={step === i + 1 ? "step" : undefined}
                        >
                          <span>{i + 1}</span>
                          <small>{s}</small>
                        </li>
                      ))}
                    </ol>
                    <div className="checkout-layout">
                      <section className="checkout-card">
                        {step === 1 ? (
                          <Delivery
                            data={data}
                            clients={clients}
                            busy={busy}
                            run={run}
                            next={() => router.push("/checkout?step=2")}
                          />
                        ) : step === 2 ? (
                          <Payment
                            data={data}
                            clients={clients}
                            busy={busy}
                            run={run}
                            save={save}
                            next={() => router.push("/checkout?step=3")}
                          />
                        ) : (
                          <>
                            <h2>Перевірте тестові дані</h2>
                            <FinancialSummary subtotal={data.draft.pricing!.subtotal} discount={data.draft.pricing!.discount} shipping={data.draft?.testShippingEstimate} total={data.attempt?.amount} />
                            <p>
                              {data.session.user.firstName}{" "}
                              {data.session.user.lastName} ·{" "}
                              {data.session.user.maskedPhone}
                            </p>
                            <p>
                              {data.draft.delivery &&
                                names[data.draft.delivery.carrier]}{" "}
                              · {data.draft.delivery?.cityRef} ·{" "}
                              {data.draft.delivery?.locationRef}
                            </p>
                            <p>
                              Доказ платіжного протоколу:{" "}
                              {data.attempt?.status ?? "відсутній"}. Реальна
                              оплата не підтверджена.
                            </p>
                            <ul className="checkout-items">
                              {data.cart?.cart.lines.map((l) => (
                                <li key={l.variantId}>
                                  {
                                    data.products.find(
                                      (p) => p.id === l.productId,
                                    )?.title
                                  }{" "}
                                  × {l.quantity}
                                </li>
                              ))}
                            </ul>
                            {data.draft.orderId ? (
                              <>
                                <p role="status">
                                  Тестове замовлення записано. Це не реальна
                                  покупка; оплата замовлення не ініційована.
                                </p>
                                <Link
                                  className="button"
                                  href={"/profile/orders/" + data.draft.orderId}
                                >
                                  Відкрити в «Мої замовлення»
                                </Link>
                              </>
                            ) : null}
                            <button
                              className="button"
                              disabled={
                                busy || data.attempt?.status !== "succeeded"
                              }
                              onClick={() =>
                                void run(async () => {
                                  const r = data.resume!;
                                  const input = r.confirmation ?? {
                                    expectedVersion: data.draft!.version,
                                    expectedFingerprint:
                                      data.draft!.pricing!.fingerprint,
                                    idempotencyKey: crypto.randomUUID(),
                                    paymentAttemptId: data.attempt!.id,
                                  };
                                  save({ ...r, confirmation: input });
                                  await clients.checkout.confirmIntegratedForTest(
                                    data.draft!.id,
                                    input,
                                  );
                                })
                              }
                            >
                              {data.draft.orderId
                                ? "Повторити підтвердження без дублювання"
                                : "Записати лише тестове замовлення"}
                            </button>
                            <div className="checkout-actions">
                              <Link href="/checkout?step=2">
                                Назад до оплати
                              </Link>
                            </div>
                          </>
                        )}
                      </section>
                      <aside className="checkout-summary">
                        <h2>Ваше замовлення</h2>
                        <div>
                          <span>Товари · сервер</span>
                          <strong>
                            {data.draft?.pricing ? formatMoney(data.draft.pricing.subtotal) : data.cart && formatMoney(data.cart.cart.subtotal)}
                          </strong>
                        </div>
                        <p>
                          Доставка — лише тестова пропозиція перевізника.
                          Синтетична сума визначається сервером під час підготовки платежу. Реальна сума списання не затверджена.
                        </p>
                        <p>
                          Промокод та підсумок перевіряються на другому кроці.
                          Реальне оформлення недоступне.
                        </p>
                      </aside>
                    </div>
                  </>
                )}
              </>
            ) : path.startsWith("/profile/messages") || path.startsWith("/profile/support/") ? (
              !data.session ? <Link href="/account/login">Потрібна серверна сесія</Link> : <RelatedHistory key={path+params.toString()} client={clients.communication} id={path.startsWith("/profile/messages") ? params.get("id")??"" : path.split("/")[3]} support={path.startsWith("/profile/support/")} />
            ) : path.startsWith("/profile/orders") ? (
              <>
                <h1>Мої замовлення · ізольовані дані</h1>
                {data.session && <NotificationCenter key={data.session.user.id} client={clients.communication} />}
                {!data.session ? (
                  <Link href="/account/login">Потрібна серверна сесія</Link>
                ) : data.order ? (
                  <>
                    <h2>Тестовий запис {data.order.id}</h2>
                    <p>
                      Замовлення: pending. Оплата: not-initiated. Доставка:
                      not-requested.
                    </p>
                    <p>
                      Підтвердження тестового протоколу не є реальною оплатою.
                    </p>
                    {data.order.testFinancials && <FinancialSummary {...data.order.testFinancials} />}
                    <ol aria-label="Історія серверних статусів">
                      {data.history?.history.map((h) => (
                        <li key={h.id}>
                          {h.source}: {h.toState}
                        </li>
                      ))}
                    </ol>
                    <Link href="/profile/orders">Усі тестові замовлення</Link>
                  </>
                ) : data.orders.length ? (
                  <ul>
                    {data.orders.map((o) => (
                      <li key={o.id}>
                        <Link href={"/profile/orders/" + o.id}>
                          Тестовий запис {o.id}
                        </Link>{" "}
                        · pending · оплата не ініційована
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Тестових замовлень поки немає.</p>
                )}
              </>
            ) : data.product ? (
              <>
                <h1>{data.product.title}</h1>
                <div className="product-layout">
                  <section className="product-details">
                    <p>{data.product.description}</p>
                    <p>
                      {formatMoney(data.product.price)} · актуальна ціна
                      PostgreSQL
                    </p>
                    <p>
                      {data.product.availability === "available"
                        ? "Є в наявності"
                        : "Немає в наявності"}
                    </p>
                    <button
                      className="button"
                      disabled={
                        busy || data.product.availability !== "available"
                      }
                      onClick={() => void run(() => add(data.product!))}
                    >
                      {data.session
                        ? "Додати в серверний кошик"
                        : "Додати до локального кошика"}
                    </button>
                    <Link href="/cart">Відкрити кошик</Link>
                  </section>
                </div>
              </>
            ) : (
              <>
                <h1>Каталог · тестові товари PostgreSQL</h1>
                <div className="product-grid">
                  {data.products.map((p) => (
                    <article className="product-card" key={p.id}>
                      <Link
                        className="product-card__link"
                        href={"/products/" + p.handle}
                      >
                        <span className="product-visual" aria-hidden="true" />
                        <span className="product-card__body">
                          <strong>{p.title}</strong>
                          <span className="product-card__price">
                            {formatMoney(p.price)}
                          </span>
                          <span>
                            {p.availability === "available"
                              ? "Є в наявності"
                              : "Немає в наявності"}
                          </span>
                        </span>
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
function Login({
  clients,
  session,
  done,
}: {
  clients: Clients;
  session: ServerAuthSession | null;
  done: () => void;
  busy: boolean;
  run: (op: () => Promise<void>) => Promise<void>;
}) {
  const [phone, setPhone] = useState("+380671234567"),
    [intent, setIntent] = useState<"login" | "register">("register"),
    [consent, setConsent] = useState(false),
    [challenge, setChallenge] = useState(""),
    [hint, setHint] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const perform = async (op: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await op();
    } catch {
      setError(
        "Сервер не підтвердив вхід. Перевірте код, згоду або спробуйте знову.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="checkout-card">
      <h1>Серверна тестова авторизація</h1>
      {session ? (
        <>
          <NotificationCenter key={session.user.id} client={clients.communication} />
          <p>
            Сесію перевірено сервером: {session.user.firstName} ·{" "}
            {session.user.maskedPhone}
          </p>
          <button
            className="button"
            onClick={() =>
              void perform(async () => {
                await clients.auth.logout();
                sessionStorage.removeItem(RESUME_KEY);
                done();
              })
            }
          >
            Відкликати серверну сесію
          </button>
        </>
      ) : (
        <>
          <p>
            Це ізольована реєстрація з вигаданими даними. SMS не надсилається.
            Локальний demo-вхід не створює цю сесію.
          </p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                if (
                  !/^\+380[3-9]\d{8}$/.test(phone) ||
                  (intent === "register" && !consent)
                )
                  throw new Error();
                const c = await clients.auth.start({ phone, intent });
                setChallenge(c.challengeId);
                setHint("");
              });
            }}
          >
            <div className="checkout-fields">
              <label>
                Телефон для тесту
                <input
                  value={phone}
                  inputMode="tel"
                  disabled={busy || !!challenge}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                Тип входу
                <select
                  value={intent}
                  disabled={busy || !!challenge}
                  onChange={(e) => setIntent(e.target.value as typeof intent)}
                >
                  <option value="register">Тестова реєстрація</option>
                  <option value="login">Тестовий вхід</option>
                </select>
              </label>
            </div>
            <label>
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              Погоджуюся лише на ізольований тест із вигаданими даними
            </label>
            <button
              className="button"
              disabled={busy || !!challenge}
              type="submit"
            >
              Створити серверний OTP challenge
            </button>
          </form>
          {challenge && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const r = await clients.code(challenge);
                    if (!/^\d{6}$/.test(r.code)) throw new Error();
                    setHint(r.code);
                  })
                }
              >
                Показати власний тестовий код
              </button>
              {hint && (
                <p role="status">
                  Ізольований OTP: <output>{hint}</output>. Це не SMS.
                </p>
              )}
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    if (intent === "register" && !consent) throw new Error();
                    await clients.auth.verify({
                      challengeId: challenge,
                      code,
                      ...(intent === "register"
                        ? {
                            profile: {
                              firstName: "Тестовий",
                              lastName: "Покупець",
                              consent: true as const,
                            },
                          }
                        : {}),
                    });
                    done();
                  });
                }}
              >
                <label>
                  Серверний OTP
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    disabled={busy}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button className="button" disabled={busy} type="submit">
                  Перевірити OTP на сервері
                </button>
              </form>
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}
function Delivery({
  data,
  clients,
  busy,
  run,
  next,
}: {
  data: Data;
  clients: Clients;
  busy: boolean;
  run: (op: () => Promise<void>) => Promise<void>;
  next: () => void;
}) {
  const [carrier, setCarrier] = useState<Carrier>(
      data.draft?.delivery?.carrier ?? "nova-poshta",
    ),
    [query, setQuery] = useState("Тест"),
    [cities, setCities] = useState<ShippingCity[]>([]),
    [points, setPoints] = useState<ShippingPoint[]>([]),
    [city, setCity] = useState(""),
    [point, setPoint] = useState(""),
    [quote, setQuote] = useState<ShippingQuote | null>(null),
    [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function task(op: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      await op();
    } catch {
      setError(
        "Тестова доставка недоступна: перевірте місто, відділення та актуальність тарифу.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  return (
    <>
      <h2>Контактні дані</h2>
      <div className="checkout-fields">
        <label>
          Контактна особа
          <input
            readOnly
            value={`${data.session!.user.firstName} ${data.session!.user.lastName}`}
          />
        </label>
        <label>
          Перевірений телефон
          <input readOnly value={data.session!.user.maskedPhone} />
        </label>
      </div>
      <p>
        Лише тестова особа. Реальні дані отримувача та їх зберігання ще не
        погоджені.
      </p>
      <h2>Доставка</h2>
      <fieldset className="checkout-options">
        <legend>Оберіть перевізника</legend>
        {Object.entries(names).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="carrier"
              checked={carrier === value}
              disabled={busy || working}
              onChange={() => {
                setCarrier(value as Carrier);
                setCities([]);
                setPoints([]);
                setCity("");
                setPoint("");
                setQuote(null);
              }}
            />
            <span>
              <strong>{label}</strong>
              <small>
                Ізольований довідник і тариф, без реального перевізника
              </small>
            </span>
          </label>
        ))}
        <label className="is-disabled">
          <input type="radio" name="carrier" disabled />
          <span>
            <strong>ПВЗ BAZAR</strong>
            <small>Недоступно</small>
          </span>
        </label>
      </fieldset>
      <div className="checkout-fields">
        <label>
          Пошук міста
          <input
            value={query}
            disabled={working || busy}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          disabled={working || busy}
          onClick={() =>
            void task(async () => {
              setCities(
                (await clients.shipping.cities({ carrier, query })).items,
              );
              setCity("");
              setPoint("");
              setQuote(null);
            })
          }
        >
          Знайти міста
        </button>
        <label>
          Населений пункт
          <select
            aria-label="Населений пункт"
            value={city}
            disabled={working || busy}
            onChange={(e) => {
              setCity(e.target.value);
              setPoint("");
              setPoints([]);
              setQuote(null);
            }}
          >
            <option value="">Оберіть місто</option>
            {cities.map((c) => (
              <option value={c.ref} key={c.ref}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!city || working || busy}
          onClick={() =>
            void task(async () => {
              setPoints(
                (
                  await clients.shipping.points({
                    carrier,
                    cityRef: city,
                    kind: "branch",
                  })
                ).items,
              );
            })
          }
        >
          Знайти відділення
        </button>
        <label>
          Відділення
          <select
            aria-label="Відділення"
            value={point}
            disabled={working || busy}
            onChange={(e) => {
              setPoint(e.target.value);
              setQuote(null);
            }}
          >
            <option value="">Оберіть відділення</option>
            {points.map((p) => (
              <option key={p.ref} value={p.ref} disabled={!p.available}>
                {p.name}
                {p.available ? "" : " · недоступне"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="button"
        disabled={!city || !point || working || busy}
        onClick={() =>
          void task(async () => {
            const addresses = await clients.customer.getAddresses();
            let owned = addresses.items.find(
              (a) =>
                a.carrier === carrier &&
                a.cityRef === city &&
                a.locationRef === point,
            );
            if (!owned) {
              const v = await clients.customer.createAddress({
                carrier,
                cityRef: city,
                locationRef: point,
                isDefault: false,
              });
              owned = v.items.find(
                (a) =>
                  a.carrier === carrier &&
                  a.cityRef === city &&
                  a.locationRef === point,
              );
            }
            if (!owned) throw new Error();
            const draft = await clients.checkout.get(data.draft!.id);
            const s = await clients.shipping.select(draft.id, {
              expectedVersion: draft.version,
              addressId: owned.id,
              kind: "branch",
            });
            const q = await clients.shipping.quote(draft.id, {
              expectedVersion: s.checkoutVersion,
              idempotencyKey: crypto.randomUUID(),
            });
            setQuote(q.quote);
          })
        }
      >
        Розрахувати тестову доставку
      </button>
      {quote && (
        <p role="status">
          Тестова пропозиція доставки: {formatMoney(quote.cost)}. Не гарантія
          тарифу, не ТТН. Діє до {quote.expiresAt}.
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="checkout-actions">
        <Link href="/cart">Назад до кошика</Link>
        <button
          className="button"
          disabled={!quote || busy || working}
          onClick={() =>
            void run(async () => {
              const fresh = await clients.checkout.get(data.draft!.id);
              await clients.checkout.setPayment(fresh.id, {
                expectedVersion: fresh.version,
                paymentSelection: "card-online",
                promoCode: null,
              });
              next();
            })
          }
        >
          Продовжити до оплати
        </button>
      </div>
    </>
  );
}
function Payment({
  data,
  clients,
  busy,
  run,
  save,
  next,
}: {
  data: Data;
  clients: Clients;
  busy: boolean;
  run: (op: () => Promise<void>) => Promise<void>;
  save: (r: BrowserResume) => void;
  next: () => void;
}) {
  const [promo, setPromo] = useState(data.draft?.appliedPromoCode ?? "");
  return (
    <>
      <h2>Спосіб оплати</h2>
      <fieldset className="checkout-options">
        <legend>Оберіть спосіб оплати</legend>
        <label>
          <input type="radio" checked readOnly name="payment" />
          <span>
            <strong>Банківська картка</strong>
            <small>Тестовий протокол без реквізитів картки та списання</small>
          </span>
        </label>
        <label className="is-disabled">
          <input type="radio" disabled name="payment" />
          <span>
            <strong>Apple Pay</strong>
            <small>
              Немає підтверджених можливостей браузера й погодженого provider
              SDK
            </small>
          </span>
        </label>
        <label className="is-disabled">
          <input type="radio" disabled name="payment" />
          <span>
            <strong>Google Pay</strong>
            <small>
              Немає підтверджених можливостей браузера й погодженого provider
              SDK
            </small>
          </span>
        </label>
      </fieldset>
      <form
        className="promo-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const d = await clients.checkout.get(data.draft!.id);
            await clients.checkout.setPayment(d.id, {
              expectedVersion: d.version,
              paymentSelection: "card-online",
              promoCode: promo || null,
            });
          });
        }}
      >
        <label>
          Промокод
          <input
            value={promo}
            disabled={busy || !!data.attempt}
            onChange={(e) => setPromo(e.target.value)}
          />
        </label>
        <button disabled={busy || !!data.attempt}>
          Застосувати промокод на сервері
        </button>
        <button
          type="button"
          disabled={busy || !!data.attempt}
          onClick={() =>
            void run(async () => {
              const d = await clients.checkout.get(data.draft!.id);
              await clients.checkout.setPayment(d.id, {
                expectedVersion: d.version,
                paymentSelection: "card-online",
                promoCode: null,
              });
              setPromo("");
            })
          }
        >
          Прибрати промокод явно
        </button>
      </form>
      <p>
        Серверна знижка: {formatMoney(data.draft!.pricing!.discount)}.
        {data.draft?.appliedPromoCode ? ` Застосовано: ${data.draft.appliedPromoCode}.` : " Промокод не застосовано."}
        Розрахунок лише для ізольованого тесту.
      </p>
      <FinancialSummary subtotal={data.draft!.pricing!.subtotal} discount={data.draft!.pricing!.discount} shipping={data.draft?.testShippingEstimate} total={data.attempt?.amount} />
      {!data.attempt ||
      ["declined", "cancelled"].includes(data.attempt.status) ? (
        <button
          className="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const d = await clients.checkout.get(data.draft!.id);
              const result = await clients.payments.create({
                checkoutId: d.id,
                expectedVersion: d.version,
                method: "card",
                idempotencyKey: crypto.randomUUID(),
              });
              save({
                ...data.resume!,
                attemptId: result.attempt.id,
                confirmation: undefined,
              });
            })
          }
        >
          {data.attempt
            ? "Нова тестова платіжна спроба"
            : "Створити тестову платіжну спробу"}
        </button>
      ) : null}
      {data.attempt && (
        <>
          <p role="status">
            Платіжний протокол: {data.attempt.status}. Реальна оплата
            замовлення: не підтверджена.
          </p>
          {data.attempt.status === "pending" && (
            <>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await clients.settle(data.attempt!.id, "succeeded");
                  })
                }
              >
                Ізольований успішний результат
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await clients.settle(data.attempt!.id, "declined");
                  })
                }
              >
                Ізольована відмова
              </button>
            </>
          )}
        </>
      )}
      <div className="checkout-actions">
        <Link href="/checkout?step=1">Назад до доставки</Link>
        <button
          className="button"
          disabled={busy || data.attempt?.status !== "succeeded"}
          onClick={next}
        >
          Перейти до підтвердження
        </button>
      </div>
    </>
  );
}

function FinancialSummary({subtotal,discount,shipping,total}:{subtotal:{amountMinor:number;currency:"UAH"};discount:{amountMinor:number;currency:"UAH"};shipping?:{amountMinor:number;currency:"UAH"};total?:{amountMinor:number;currency:"UAH"}}) {
 return <dl aria-label="Серверні тестові суми"><dt>Початкова сума</dt><dd>{formatMoney(subtotal)}</dd><dt>Знижка</dt><dd>{formatMoney(discount)}</dd><dt>Доставка</dt><dd>{shipping ? formatMoney(shipping) : "Перевіряється сервером"}</dd><dt>Тестовий підсумок</dt><dd>{total ? formatMoney(total) : "Буде визначений сервером до тестового результату оплати"}</dd></dl>;
}

function RelatedHistory({client,id,support}:{client:Clients['communication'];id:string;support:boolean}){
 const [view,setView]=useState<Awaited<ReturnType<typeof client.history>>|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;client.history(id,undefined,50,support).then(v=>{if(active)setView(v);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[client,id,support]);
 return <section className="checkout-card"><h1>{support?'Історія тестового звернення':'Історія тестового чату'}</h1><p>Ізольовані записи; реальний оператор, CRM і доставка повідомлень не підключені.</p>{error?<p role="alert">Запис недоступний або не належить поточному користувачу.</p>:!view?<p role="status">Завантаження історії…</p>:<ol aria-label="Історія пов’язаної сутності">{view.resource==='messages'||view.resource==='replies'?view.items.map(i=><li key={i.id} style={{overflowWrap:'anywhere'}}><p>{i.body}</p><time dateTime={i.createdAt}>{i.createdAt}</time></li>):null}</ol>}<Link href="/profile/orders">До замовлень і сповіщень</Link></section>;
}
