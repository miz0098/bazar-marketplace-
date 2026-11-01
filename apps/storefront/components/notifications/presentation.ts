import { isId, notificationKinds, type NotificationItem } from '../../services/contracts/communication-business';
export function notificationPresentation(item:NotificationItem){
 if(!isId(item.scopeId)||!notificationKinds.includes(item.kind))throw new Error('Unsafe notification target');
 const titles:Record<NotificationItem['kind'],string>={
  'review.moderated':('Результат модерації відгуку'),
  'question.answered':('Відповідь продавця опубліковано'),
  'product.availability_restored':('Товар знову в наявності'),
  'order.created':('Замовлення створено'),
  'order.status_changed':('Статус замовлення оновлено'),
  'message.created':('Нове повідомлення'),
  'support.replied':('Відповідь підтримки'),
  'order.cancelled':('Замовлення скасовано'),
  'refund.completed':('Відшкодування підтверджено'),
  'return.requested':('Запит на повернення створено'),
  'return.status_changed':('Статус повернення оновлено'),
 };
 const href=['review.moderated','question.answered'].includes(item.kind)?'/profile/reviews':item.kind==='product.availability_restored'?`/products/catalog/${item.scopeId}`:item.kind==='message.created'?`/profile/messages?id=${item.scopeId}`:item.kind==='support.replied'?`/profile/support/${item.scopeId}`:`/profile/orders/${item.scopeId}`;
 return {title:titles[item.kind],href};
}
