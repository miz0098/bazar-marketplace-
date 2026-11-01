import {storefrontContent} from '../fixtures/storefront-content';
import {getOfferCatalogService} from './http/offers.server';
import type {ContentService} from './contracts/content';
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
const titles:Readonly<Record<string,string>>={'how-to-order':'Як замовити',delivery:'Доставка і оплата',returns:'Повернення товару','order-tracking':'Відстеження замовлення',warranty:'Гарантія',partners:'Партнерам',news:'Новини','public-offer':'Публічна оферта','privacy-policy':'Політика конфіденційності','terms-of-service':'Умови користування',about:'Про BAZAR',contacts:'Контакти',careers:'Вакансії'};
export class StorefrontContentService implements ContentService {
 async getInfoPage(slug:string){return Object.hasOwn(titles,slug)?{title:titles[slug],description:ordinaryDescriptions[slug]}:null;}
 async getHomePage(){const catalog=getOfferCatalogService(process.env.BAZAR_STOREFRONT_INTEGRATION==='1');const [categories,products]=await Promise.all([catalog.getCategories(),catalog.listProducts({limit:24})]);return {...storefrontContent,categories:categories.map(c=>({id:c.id,title:c.title,href:'/collections/'+c.handle,icon:c.icon??''})),recommended:products.items.slice(0,4),popular:products.items.slice(0,8),newProducts:products.items.slice().reverse().slice(0,8)};}
}
