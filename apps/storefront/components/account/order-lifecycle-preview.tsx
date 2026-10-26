"use client";
import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useAccountService } from "./account-preview-provider";
import { useRequestState } from "./use-request-state";
import { AccountLoading, AccountState } from "./account-ui";
import { accountOrderStatusLabels, formatAccountDate } from "./account-format";
import type {
  AccountOrderDetail,
  AccountScenario,
} from "@/domain/account/account";
import {
  validateDemoReturn,
  type DemoOrderLifecycle,
} from "@/domain/account/order-lifecycle";
export function OrderLifecyclePreview({
  order,
  scenario,
}: {
  order: AccountOrderDetail;
  scenario: AccountScenario;
}) {
  const service = useAccountService(scenario),
    [attempt, setAttempt] = useState(0);
  const key = useMemo(
    () => ({ id: order.id, service, attempt }),
    [order.id, service, attempt],
  );
  const [view, setView] = useRequestState<
      DemoOrderLifecycle | null | undefined
    >(key, undefined),
    [loadError, setLoadError] = useRequestState(key, "");
  const [reason, setReason] = useState(""),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const inflight = useRef(false),
    requestKey = useRef<string | undefined>(undefined),
    formRef = useRef<HTMLFormElement>(null),
    reasonRef = useRef<HTMLTextAreaElement>(null),
    uid = useId();
  useEffect(() => {
    let active = true;
    service
      .getOrderLifecycle(order.id)
      .then((v) => {
        if (active) setView(v);
      })
      .catch(() => {
        if (active)
          setLoadError("Не вдалося завантажити демонстраційну історію.");
      });
    return () => {
      active = false;
    };
  }, [service, order.id, attempt, setView, setLoadError]);
  useEffect(() => {
    if (notice && !busy) reasonRef.current?.focus();
  }, [notice, busy]);
  if (loadError)
    return (
      <AccountState
        error
        title="Історія недоступна"
        text={loadError}
        action={
          <button
            type="button"
            className="account-button account-button--primary"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Спробувати ще раз
          </button>
        }
      />
    );
  if (view === undefined)
    return <AccountLoading label="Завантажуємо демонстраційну історію…" />;
  if (!view)
    return (
      <AccountState
        title="Історії поки немає"
        text="Цей запис недоступний у поточному демо-перегляді."
      />
    );
  return (
    <section
      className="account-order-detail-card"
      aria-label="Демонстраційний життєвий цикл"
    >
      <h2 className="account-order-detail-card__title">
        Статуси та запити · демо
      </h2>
      <p className="account-muted">
        Лише вигадані дані. Запит не схвалює повернення, не скасовує замовлення
        та не ініціює відшкодування.
      </p>
      <dl className="account-order-detail-list">
        <div>
          <dt>Замовлення</dt>
          <dd>{accountOrderStatusLabels[order.status]} · демо-запис</dd>
        </div>
        <div>
          <dt>Оплата</dt>
          <dd>Не підтверджено</dd>
        </div>
        <div>
          <dt>Доставка</dt>
          <dd>Не підтверджено</dd>
        </div>
        <div>
          <dt>Повернення товару</dt>
          <dd>
            {view.returns.length ? "Демо-запит створено" : "Запитів немає"}
          </dd>
        </div>
        <div>
          <dt>Повернення коштів</dt>
          <dd>Не ініційовано</dd>
        </div>
      </dl>
      <h3>Доступність скасування</h3>
      <p className="account-muted">
        Реальне скасування недоступне: правила та повноваження ще не погоджені.
        Статус замовлення не змінюється.
      </p>
      <h3>Історія демо-запису</h3>
      <ol aria-label="Історія статусів і запитів">
        {view.history.map((h) => (
          <li key={h.id}>
            <time dateTime={h.createdAt}>{formatAccountDate(h.createdAt)}</time>
            <p>{h.text}</p>
          </li>
        ))}
      </ol>
      <h3>Демонстраційні запити на повернення</h3>
      {view.returns.length === 0 ? (
        <p className="account-muted">Демо-запитів на повернення поки немає.</p>
      ) : (
        <ul aria-label="Демо-запити на повернення">
          {view.returns.map((r) => (
            <li key={r.id}>
              <strong>{r.id} · Демо-запит створено</strong>
              <p>{r.reason}</p>
              <p>
                {r.items
                  .map(
                    (i) =>
                      `${order.items.find((l) => l.id === i.orderLineId)?.product.title}: ${i.quantity} шт.`,
                  )
                  .join("; ")}
              </p>
              <p className="account-muted">
                Не схвалено, нікому не надіслано. Реального повернення чи
                відшкодування немає.
              </p>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={formRef}
        aria-label="Демонстраційний запит на повернення"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (inflight.current) return;
          requestKey.current ??= crypto.randomUUID();
          const draft = {
            requestKey: requestKey.current,
            reason,
            items: order.items
              .map((l) => ({
                orderLineId: l.id,
                quantity: Number(quantities[l.id] ?? 0),
              }))
              .filter((i) => i.quantity !== 0),
          };
          const validation = validateDemoReturn(draft);
          setError(validation);
          setNotice("");
          if (validation) {
            if (!reason.trim()) reasonRef.current?.focus();
            else formRef.current?.querySelector("input")?.focus();
            return;
          }
          inflight.current = true;
          setBusy(true);
          try {
            const result = await service.createOrderReturn(order.id, draft);
            setView(result.value);
            setReason("");
            setQuantities({});
            requestKey.current = undefined;
            setNotice(
              "Створено лише демо-запит. Нікому не надіслано; після перезавантаження він зникне.",
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Не вдалося створити демо-запит.",
            );
          } finally {
            inflight.current = false;
            setBusy(false);
          }
        }}
      >
        <p className="account-muted" id={`${uid}-hint`}>
          Оберіть кількість товарів (0 — не обрано) та вигадану причину. Умови,
          строки, доставка й сума відшкодування не визначаються цією формою.
        </p>
        {order.items.map((l) => (
          <label className="account-field" key={l.id}>
            <span>{l.product.title}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={l.quantity}
              step={1}
              disabled={busy}
              aria-label={`Кількість для ${l.product.title}`}
              aria-describedby={`${uid}-hint${error ? ` ${uid}-error` : ""}`}
              value={quantities[l.id] ?? "0"}
              onChange={(e) => {
                setQuantities({ ...quantities, [l.id]: e.target.value });
                requestKey.current = undefined;
              }}
            />
          </label>
        ))}
        <label className="account-field">
          <span>Вигадана причина повернення</span>
          <textarea
            ref={reasonRef}
            rows={3}
            maxLength={2000}
            value={reason}
            disabled={busy}
            aria-describedby={`${uid}-hint${error ? ` ${uid}-error` : ""}`}
            onChange={(e) => {
              setReason(e.target.value);
              requestKey.current = undefined;
            }}
          />
        </label>
        {error && (
          <p id={`${uid}-error`} className="account-field-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="account-muted" role="status">
            {notice}
          </p>
        )}
        <button
          className="account-button account-button--primary"
          type="submit"
          disabled={busy}
        >
          {busy ? "Створюємо демо-запит…" : "Створити лише демо-запит"}
        </button>
      </form>
    </section>
  );
}
