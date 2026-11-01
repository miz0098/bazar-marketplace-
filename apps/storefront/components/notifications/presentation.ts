import {simulationCopy} from '../../lib/simulation';
import { isId, notificationKinds, type NotificationItem } from '../../services/contracts/communication-business';
export function notificationPresentation(item:NotificationItem){
 if(!isId(item.scopeId)||!notificationKinds.includes(item.kind))throw new Error('Unsafe notification target');
 const titles:Record<NotificationItem['kind'],string>={
  'review.moderated':simulationCopy('Результат тестової модерації відгуку','Результат модерації відгуку'),
  'question.answered':simulationCopy('Опублікована тестова відповідь продавця','Відповідь продавця опубліковано'),
  'product.availability_restored':simulationCopy('Товар знову доступний у тестовому каталозі','Товар знову в наявності'),
  'order.created':simulationCopy('Створено тестове замовлення','Замовлення створено'),
  'order.status_changed':simulationCopy('Тестова подія зміни статусу','Статус замовлення оновлено'),
  'message.created':simulationCopy('Нове тестове повідомлення','Нове повідомлення'),
  'support.replied':simulationCopy('Симуляція відповіді підтримки','Відповідь підтримки'),
  'order.cancelled':simulationCopy('Тестовий сценарій скасування','Замовлення скасовано'),
  'refund.completed':simulationCopy('Ізольована тестова подія відшкодування','Відшкодування підтверджено'),
  'return.requested':simulationCopy('Тестовий запит на повернення','Запит на повернення створено'),
  'return.status_changed':simulationCopy('Тестова зміна запиту на повернення','Статус повернення оновлено'),
 };
 const href=['review.moderated','question.answered'].includes(item.kind)?'/profile/reviews':item.kind==='product.availability_restored'?`/products/catalog/${item.scopeId}`:item.kind==='message.created'?`/profile/messages?id=${item.scopeId}`:item.kind==='support.replied'?`/profile/support/${item.scopeId}`:`/profile/orders/${item.scopeId}`;
 return {title:titles[item.kind],href};
}
