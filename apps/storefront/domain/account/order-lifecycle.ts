export type DemoReturnDraft = {
  requestKey: string;
  reason: string;
  items: readonly { orderLineId: string; quantity: number }[];
};
export type DemoReturnRequest = {
  id: string;
  reason: string;
  items: readonly { orderLineId: string; quantity: number }[];
  state: "requested-for-demo";
  createdAt: string;
};
export type DemoOrderLifecycle = {
  orderId: string;
  cancellation: "policy-required";
  refundStatus: "not-initiated";
  returns: readonly DemoReturnRequest[];
  history: readonly { id: string; createdAt: string; text: string }[];
};
export function validateDemoReturn(draft: DemoReturnDraft) {
  if (
    typeof draft.requestKey !== "string" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(draft.requestKey)
  )
    return "Невірний ключ демо-запиту.";
  if (
    typeof draft.reason !== "string" ||
    !draft.reason.trim() ||
    draft.reason.length > 2000 ||
    /\p{Cc}/u.test(draft.reason.replace(/[\n\t]/g, ""))
  )
    return "Вкажіть вигадану причину до 2000 символів.";
  if (
    !Array.isArray(draft.items) ||
    !draft.items.length ||
    draft.items.length > 100 ||
    draft.items.some(
      (i) =>
        !i ||
        typeof i.orderLineId !== "string" ||
        !i.orderLineId ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1,
    ) ||
    new Set(draft.items.map((i) => i.orderLineId)).size !== draft.items.length
  )
    return "Оберіть товари та додатну цілу кількість.";
  return "";
}
