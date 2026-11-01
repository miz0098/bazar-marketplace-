import {simulationMode} from '../../lib/simulation';
import {demoInfoPages} from './info-service';
import { mockHomePage } from '@/fixtures/home';
import type { ContentService } from '@/services/contracts/content';

const ordinaryDescriptions:Readonly<Record<string,string>>={
 'how-to-order':'Увійдіть у свій акаунт, додайте товари до кошика, оберіть доставку для кожного продавця та підтвердьте оплату. Історія покупок доступна в особистому кабінеті.',
 delivery:'Нова пошта, Meest та Укрпошта. Оберіть місто й відділення під час оформлення. Вартість доставки — за тарифами перевізника.',
 returns:'Відкрийте деталі покупки в розділі «Мої замовлення», оберіть товари та вкажіть причину повернення. Стан повернення й відшкодування відображається окремо.',
 'order-tracking':'Відкрийте «Мої замовлення», щоб переглянути статус покупки та історію доставки.',
 warranty:'З питань гарантії зверніться до продавця через картку товару або деталі замовлення.',
 partners:'Із питань співпраці зверніться до підтримки BAZAR.',
 news:'Опублікованих новин поки немає.',
 'public-offer':'Текст публічної оферти готується до публікації.',
 'privacy-policy':'Політика конфіденційності готується до публікації.',
 'terms-of-service':'Умови користування готуються до публікації.',
 about:'BAZAR — маркетплейс товарів від різних продавців. Порівнюйте пропозиції та керуйте покупками в особистому кабінеті.',
 contacts:'Напишіть нам у розділі підтримки особистого кабінету.',
 careers:'Відкритих вакансій поки немає.',
};
export class MockContentService implements ContentService {
  async getInfoPage(slug:string){const page=Object.hasOwn(demoInfoPages,slug)?demoInfoPages[slug]:null;return page&&simulationMode?{...page,description:ordinaryDescriptions[slug]??page.description}:page;}
  async getHomePage() { return mockHomePage; }
}
