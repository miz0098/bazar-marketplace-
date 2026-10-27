import { isId, notificationKinds, type NotificationItem } from '../../services/contracts/communication-business';
export function notificationPresentation(item:NotificationItem){
 if(!isId(item.scopeId)||!notificationKinds.includes(item.kind))throw new Error('Unsafe notification target');
 const titles:Record<NotificationItem['kind'],string>={
  'product.availability_restored':'Товар знову доступний у тестовому каталозі',
  'order.created':'Створено тестове замовлення',
  'order.status_changed':'Тестова подія зміни статусу',
  'message.created':'Нове тестове повідомлення',
  'support.replied':'Симуляція відповіді підтримки',
  'order.cancelled':'Тестовий сценарій скасування',
  'refund.completed':'Ізольована тестова подія відшкодування',
  'return.requested':'Тестовий запит на повернення',
  'return.status_changed':'Тестова зміна запиту на повернення',
 };
 const href=item.kind==='product.availability_restored'?`/products/catalog/${item.scopeId}`:item.kind==='message.created'?`/profile/messages?id=${item.scopeId}`:item.kind==='support.replied'?`/profile/support/${item.scopeId}`:`/profile/orders/${item.scopeId}`;
 return {title:titles[item.kind],href};
}
