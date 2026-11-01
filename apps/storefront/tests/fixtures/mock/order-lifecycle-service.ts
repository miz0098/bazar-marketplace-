import type { AccountOrderDetail } from "@/domain/account/account";
import {
  validateDemoReturn,
  type DemoReturnDraft,
  type DemoOrderLifecycle,
} from "@/domain/account/order-lifecycle";
import { AccountServiceError } from "@/services/contracts/account";
/** Ephemeral synthetic requests only, no eligibility/approval/refund or browser storage. */
export function createDemoOrderLifecycle(
  orders: readonly AccountOrderDetail[],
  now = () => new Date().toISOString(),
) {
  const views = new Map<string, DemoOrderLifecycle>();
  const keys = new Map<string, { digest: string; orderId: string }>();
  let sequence = 0;
  for (const order of orders)
    views.set(order.id, {
      orderId: order.id,
      cancellation: "policy-required",
      refundStatus: "not-initiated",
      returns: [],
      history: [
        {
          id: `${order.id}-snapshot`,
          createdAt: order.placedAt,
          text: "Створено вигаданий запис замовлення; це не історія реальної покупки.",
        },
      ],
    });
  return {
    get(id: string) {
      return structuredClone(views.get(id) ?? null);
    },
    create(id: string, draft: DemoReturnDraft) {
      const view = views.get(id),
        order = orders.find((o) => o.id === id);
      if (!view || !order)
        throw new AccountServiceError(
          "not-found",
          "Демо-замовлення не знайдено.",
        );
      const error = validateDemoReturn(draft);
      if (error) throw new AccountServiceError("validation", error);
      const items = [...draft.items].sort((a, b) =>
          a.orderLineId.localeCompare(b.orderLineId),
        ),
        digest = JSON.stringify({
          orderId: id,
          reason: draft.reason.trim(),
          items,
        });
      const prior = keys.get(draft.requestKey);
      if (prior) {
        if (prior.orderId !== id || prior.digest !== digest)
          throw new AccountServiceError(
            "validation",
            "Ключ демо-запиту вже використано з іншим текстом.",
          );
        return structuredClone(view);
      }
      for (const item of items) {
        const line = order.items.find((l) => l.id === item.orderLineId),
          used = view.returns
            .flatMap((r) => r.items)
            .filter((i) => i.orderLineId === item.orderLineId)
            .reduce((s, i) => s + i.quantity, 0);
        if (!line || item.quantity + used > line.quantity)
          throw new AccountServiceError(
            "validation",
            "Кількість перевищує доступну в цьому демо-записі.",
          );
      }
      const createdAt = now(),
        request = {
          id: `demo-return-${++sequence}`,
          reason: draft.reason.trim(),
          items,
          state: "requested-for-demo" as const,
          createdAt,
        };
      const next: DemoOrderLifecycle = {
        ...view,
        returns: [...view.returns, request],
        history: [
          ...view.history,
          {
            id: request.id,
            createdAt,
            text: "Створено лише демонстраційний запит на повернення. Не схвалено, нікому не надіслано.",
          },
        ],
      };
      views.set(id, next);
      keys.set(draft.requestKey, { digest, orderId: id });
      return structuredClone(next);
    },
  };
}
