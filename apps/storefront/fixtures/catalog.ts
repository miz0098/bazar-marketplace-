import type { Category, Product } from '@/services/contracts/catalog';

export const demoCategories: readonly Category[] = [
  { id: 'electronics', title: 'Електроніка', icon: '📱', subcategories: ['Смартфони', 'Ноутбуки', 'Аудіо', 'Ігрові консолі'] },
  { id: 'appliances', title: 'Побутова техніка', icon: '🏠', subcategories: ['Кавоварки', 'Пилососи', 'Кухонна техніка'] },
  { id: 'home', title: 'Дім і сад', icon: '🪴', subcategories: ['Освітлення', 'Текстиль', 'Сад'] },
  { id: 'fashion', title: 'Одяг і взуття', icon: '👟', subcategories: ['Взуття', 'Одяг', 'Аксесуари'] },
  { id: 'beauty', title: 'Краса і здоровʼя', icon: '✨', subcategories: ['Догляд', 'Парфумерія', 'Здоровʼя'] },
  { id: 'sport', title: 'Спорт і відпочинок', icon: '⚽', subcategories: ['Фітнес', 'Туризм', 'Велоспорт'] },
];

type Seed = Omit<Product, 'price' | 'compareAtPrice' | 'gallery' | 'specifications' | 'reviews'> & {
  price: number;
  compareAtPrice?: number;
  specs: readonly [string, string][];
  tones: readonly string[];
};

const seeds: readonly Seed[] = [
  { id: 'iphone-15', handle: 'iphone-15', title: 'Apple iPhone 15 Pro 128GB', vendor: 'Apple', category: 'electronics', subcategory: 'Смартфони', price: 4269600, compareAtPrice: 4499900, visual: 'phone', available: true, rating: 4.9, reviewCount: 128, sku: 'APP-IP15P-128', description: 'Потужний смартфон із титановим корпусом, яскравим дисплеєм та професійною системою камер.', specs: [['Дисплей', '6,1″ Super Retina XDR'], ['Памʼять', '128 ГБ'], ['Колір', 'Синій титан'], ['Гарантія', '12 місяців']], tones: ['#dbeafe', '#bfdbfe', '#e2e8f0'] },
  { id: 'lenovo-ideapad', handle: 'lenovo-ideapad', title: 'Ноутбук Lenovo IdeaPad Slim 5', vendor: 'Lenovo', category: 'electronics', subcategory: 'Ноутбуки', price: 3199900, visual: 'laptop', available: true, rating: 4.7, reviewCount: 46, sku: 'LEN-SLIM5-14', description: 'Легкий універсальний ноутбук для роботи, навчання та щоденних завдань.', specs: [['Дисплей', '14″ IPS'], ['Процесор', 'AMD Ryzen 7'], ['Оперативна памʼять', '16 ГБ'], ['Накопичувач', '512 ГБ SSD']], tones: ['#dbeafe', '#e0f2fe', '#cbd5e1'] },
  { id: 'sony-headphones', handle: 'sony-headphones', title: 'Навушники Sony WH-1000XM5', vendor: 'Sony', category: 'electronics', subcategory: 'Аудіо', price: 1449900, compareAtPrice: 1599900, visual: 'headphones', available: true, rating: 4.8, reviewCount: 91, sku: 'SON-WH1000XM5', description: 'Бездротові навушники з адаптивним шумозаглушенням і тривалим часом роботи.', specs: [['Підключення', 'Bluetooth 5.2'], ['Автономність', 'до 30 годин'], ['Колір', 'Чорний'], ['Мікрофон', 'Вбудований']], tones: ['#dbeafe', '#e2e8f0', '#bae6fd'] },
  { id: 'delonghi', handle: 'delonghi', title: 'Кавоварка DeLonghi Magnifica', vendor: 'DeLonghi', category: 'appliances', subcategory: 'Кавоварки', price: 1825000, visual: 'home', available: true, rating: 4.6, reviewCount: 34, sku: 'DEL-MAG-22', description: 'Автоматична кавоварка для еспресо та молочних напоїв зі зручним керуванням.', specs: [['Потужність', '1450 Вт'], ['Тиск', '15 бар'], ['Резервуар', '1,8 л'], ['Тип кави', 'Зернова / мелена']], tones: ['#f1f5f9', '#dbeafe', '#e2e8f0'] },
  { id: 'apple-watch', handle: 'apple-watch', title: 'Apple Watch Series 9', vendor: 'Apple', category: 'electronics', subcategory: 'Смартфони', price: 1689900, visual: 'watch', available: true, rating: 4.8, reviewCount: 53, sku: 'APP-WATCH-S9', description: 'Розумний годинник для активності, повідомлень і щоденного контролю самопочуття.', specs: [['Корпус', '45 мм'], ['Дисплей', 'Always-On Retina'], ['Захист', 'WR50'], ['Ремінець', 'Sport Band']], tones: ['#dbeafe', '#e0e7ff', '#e2e8f0'] },
  { id: 'dyson', handle: 'dyson', title: 'Пилосос Dyson V15 Detect', vendor: 'Dyson', category: 'appliances', subcategory: 'Пилососи', price: 2499900, visual: 'home', available: true, rating: 4.7, reviewCount: 27, sku: 'DYS-V15', description: 'Бездротовий пилосос із лазерним підсвічуванням та автоматичним налаштуванням потужності.', specs: [['Автономність', 'до 60 хвилин'], ['Фільтрація', 'HEPA'], ['Контейнер', '0,54 л'], ['Вага', '3,1 кг']], tones: ['#e0f2fe', '#dbeafe', '#fef3c7'] },
  { id: 'camera', handle: 'camera', title: 'Камера Fujifilm X-S20', vendor: 'Fujifilm', category: 'electronics', subcategory: 'Смартфони', price: 5299900, visual: 'camera', available: false, rating: 4.9, reviewCount: 18, sku: 'FUJ-XS20', description: 'Компактна бездзеркальна камера для фото та відео з ефективною стабілізацією.', specs: [['Матриця', '26,1 Мп APS-C'], ['Відео', '6.2K'], ['Стабілізація', 'IBIS'], ['Байонет', 'Fujifilm X']], tones: ['#e2e8f0', '#dbeafe', '#cbd5e1'] },
  { id: 'console', handle: 'console', title: 'Ігрова консоль PlayStation 5', vendor: 'Sony', category: 'electronics', subcategory: 'Ігрові консолі', price: 2399900, visual: 'console', available: true, rating: 4.9, reviewCount: 204, sku: 'SON-PS5-SLIM', description: 'Консоль нового покоління з високою швидкістю завантаження та підтримкою 4K.', specs: [['Накопичувач', '1 ТБ SSD'], ['Роздільна здатність', 'до 4K'], ['Комплектація', 'DualSense'], ['Версія', 'Slim']], tones: ['#dbeafe', '#f8fafc', '#e0e7ff'] },
  { id: 'running-shoes', handle: 'running-shoes', title: 'Кросівки для бігу Air Flex', vendor: 'RunLab', category: 'fashion', subcategory: 'Взуття', price: 329900, visual: 'fashion', available: true, rating: 4.5, reviewCount: 39, sku: 'RUN-AF-42', description: 'Легкі бігові кросівки з амортизацією для тренувань у місті.', specs: [['Розмір', '42'], ['Матеріал', 'Текстиль'], ['Колір', 'Білий / синій'], ['Сезон', 'Демісезон']], tones: ['#dbeafe', '#f8fafc', '#bfdbfe'] },
  { id: 'fitness-mat', handle: 'fitness-mat', title: 'Килимок для фітнесу Pro', vendor: 'Move', category: 'sport', subcategory: 'Фітнес', price: 119900, visual: 'sport', available: true, rating: 4.4, reviewCount: 22, sku: 'MOV-MAT-PRO', description: 'Щільний нековзний килимок для домашніх тренувань, йоги та розтяжки.', specs: [['Товщина', '8 мм'], ['Довжина', '183 см'], ['Матеріал', 'TPE'], ['Вага', '900 г']], tones: ['#dbeafe', '#dcfce7', '#e0e7ff'] },
  { id: 'face-care', handle: 'face-care', title: 'Набір догляду за обличчям Daily', vendor: 'PureSkin', category: 'beauty', subcategory: 'Догляд', price: 189900, visual: 'beauty', available: true, rating: 4.6, reviewCount: 31, sku: 'PUR-DAILY-SET', description: 'Базовий набір для очищення, зволоження та щоденного захисту шкіри.', specs: [['Тип шкіри', 'Усі типи'], ['Кількість', '3 засоби'], ['Використання', 'Щоденне'], ['Країна', 'Україна']], tones: ['#fce7f3', '#fae8ff', '#dbeafe'] },
  { id: 'garden-lamp', handle: 'garden-lamp', title: 'Садовий світильник Solar', vendor: 'HomeLight', category: 'home', subcategory: 'Сад', price: 89900, visual: 'home', available: true, rating: 4.3, reviewCount: 17, sku: 'HOM-SOLAR-4', description: 'Комплект автономних садових світильників із сонячними панелями.', specs: [['Кількість', '4 шт.'], ['Захист', 'IP65'], ['Світло', 'Тепле'], ['Живлення', 'Сонячна панель']], tones: ['#dcfce7', '#dbeafe', '#fef3c7'] },
];

export const demoProducts: readonly Product[] = seeds.map(({ price, compareAtPrice, specs, tones, ...product }) => ({
  ...product,
  price: { amountMinor: price, currency: 'UAH' },
  stock: product.available ? 5 : 0,
  variants: [{id:product.id,title:product.id==='iphone-15'?'Синій титан, 128 ГБ':'Стандартний',sku:product.sku,price:{amountMinor:price,currency:'UAH'},stock:product.available?5:0,mediaIndex:0},...(product.id==='iphone-15'?[{id:'iphone-15-black',productTitle:'Apple iPhone 15 Pro 256GB',title:'Чорний титан, 256 ГБ',sku:'APP-IP15P-256-BLK',price:{amountMinor:4599900,currency:'UAH' as const},stock:2,mediaIndex:1},{id:'iphone-15-silver',productTitle:'Apple iPhone 15 Pro 256GB',title:'Сріблястий, 256 ГБ',sku:'APP-IP15P-256-SLV',price:{amountMinor:4599900,currency:'UAH' as const},stock:0,mediaIndex:2}]:[])],
  compareAtPrice: compareAtPrice ? { amountMinor: compareAtPrice, currency: 'UAH' } : undefined,
  gallery: tones.map((tone, index) => ({ id: `${product.id}-${index + 1}`, label: `${product.title} — вигляд ${index + 1}`, tone })),
  specifications: specs.map(([label, value]) => ({ label, value })),
  reviews: product.reviewCount ? [
    { id: `${product.id}-review-1`, author: 'Олена', rating: Math.round(product.rating), text: 'Товар відповідає опису. Зручно користуватися щодня.', date: '2026-09-18' },
    { id: `${product.id}-review-2`, author: 'Андрій', rating: Math.max(4, Math.round(product.rating) - 1), text: 'Якісна демонстраційна позиція, пакування акуратне.', date: '2026-08-29' },
  ] : [],
}));
