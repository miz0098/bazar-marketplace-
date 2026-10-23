import type { HomePageContent, NavigationItem } from '@/services/contracts/content';
import type { ProductSummary } from '@/services/contracts/catalog';

export const mockCategories: readonly NavigationItem[] = [
  { id: 'electronics', title: 'Електроніка', href: '/catalog?category=electronics', icon: '📱' },
  { id: 'appliances', title: 'Побутова техніка', href: '/catalog?category=appliances', icon: '🏠' },
  { id: 'home', title: 'Дім і сад', href: '/catalog?category=home', icon: '🪴' },
  { id: 'fashion', title: 'Одяг і взуття', href: '/catalog?category=fashion', icon: '👟' },
  { id: 'beauty', title: 'Краса і здоровʼя', href: '/catalog?category=beauty', icon: '✨' },
  { id: 'sport', title: 'Спорт і відпочинок', href: '/catalog?category=sport', icon: '⚽' },
];

export const mockProducts: readonly ProductSummary[] = [
  ['iphone-15', 'Apple iPhone 15 Pro 128GB', 'Apple', 4269600, 'phone'],
  ['lenovo-ideapad', 'Ноутбук Lenovo IdeaPad Slim 5', 'Lenovo', 3199900, 'laptop'],
  ['sony-headphones', 'Навушники Sony WH-1000XM5', 'Sony', 1449900, 'headphones'],
  ['delonghi', 'Кавоварка DeLonghi Magnifica', 'DeLonghi', 1825000, 'home'],
  ['apple-watch', 'Apple Watch Series 9', 'Apple', 1689900, 'watch'],
  ['dyson', 'Пилосос Dyson V15 Detect', 'Dyson', 2499900, 'home'],
  ['camera', 'Камера Fujifilm X-S20', 'Fujifilm', 5299900, 'camera'],
  ['console', 'Ігрова консоль PlayStation 5', 'Sony', 2399900, 'console'],
].map(([handle, title, vendor, amountMinor, visual]) => ({ id: String(handle), handle: String(handle), title: String(title), vendor: String(vendor), price: { amountMinor: Number(amountMinor), currency: 'UAH' }, visual: visual as ProductSummary['visual'] }));

export const mockHomePage: HomePageContent = {
  heroSlides: [
    { id: 'daily', eyebrow: 'BAZAR МАРКЕТПЛЕЙС', title: 'Все для щоденних покупок', text: 'Знаходьте товари, бренди та категорії в одному зручному маркетплейсі.', primary: { label: 'До каталогу', href: '/catalog' }, secondary: { label: 'Новинки', href: '#new-products' } },
    { id: 'deals', eyebrow: 'Акційні пропозиції', title: 'Вигідні покупки щодня', text: 'Переглядайте добірки зі спеціальними цінами та сезонними пропозиціями.', primary: { label: 'Переглянути акції', href: '/catalog' }, secondary: { label: 'До каталогу', href: '/catalog' } },
    { id: 'new', eyebrow: 'Новинки', title: 'Нові товари вже на BAZAR', text: 'Знаходьте свіжі надходження у популярних категоріях маркетплейсу.', primary: { label: 'Дивитися новинки', href: '/catalog' }, secondary: { label: 'Популярне', href: '/catalog' } },
  ],
  categories: mockCategories,
  recommended: mockProducts.slice(0, 4),
  popular: mockProducts.slice(0, 8),
  newProducts: [...mockProducts].reverse().slice(0, 8),
  promotions: [
    { id: 'offers', title: 'Спеціальні пропозиції', text: 'Добірки та акції для покупок на BAZAR.', linkLabel: 'Переглянути', href: '/catalog' },
    { id: 'new', title: 'Нові надходження', text: 'Свіжі товари у ключових категоріях маркетплейсу.', linkLabel: 'До новинок', href: '/catalog' },
  ],
};
