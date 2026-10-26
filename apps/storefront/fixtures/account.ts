import type {
  AccountAddress,
  AccountFixtureSet,
  AccountOrderDetail,
  AccountOrderLine,
  AccountProfile,
  AccountReview,
  AccountWishlistItem,
} from '@/domain/account/account';
import { demoProducts } from '@/fixtures/catalog';
import type { Money, ProductSummary } from '@/services/contracts/catalog';

function getProduct(handle: string): ProductSummary {
  const product = demoProducts.find((candidate) => candidate.handle === handle);
  if (!product) throw new Error(`Missing deterministic account fixture product: ${handle}`);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    category: product.category,
    subcategory: product.subcategory,
    price: { ...product.price },
    compareAtPrice: product.compareAtPrice ? { ...product.compareAtPrice } : undefined,
    visual: product.visual,
    available: product.available,
    rating: product.rating,
    reviewCount: product.reviewCount,
  };
}

function orderLine(product: ProductSummary, quantity: number): AccountOrderLine {
  return {
    id: `line-${product.id}`,
    product,
    quantity,
    lineTotal: { amountMinor: product.price.amountMinor * quantity, currency: 'UAH' },
  };
}

function order(
  id: string,
  number: string,
  placedAt: string,
  status: AccountOrderDetail['status'],
  items: readonly AccountOrderLine[],
): AccountOrderDetail {
  const total: Money = {
    amountMinor: items.reduce((sum, item) => sum + item.lineTotal.amountMinor, 0),
    currency: 'UAH',
  };

  return {
    id,
    number,
    placedAt,
    status,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total,
    items,
  };
}

const iphone = getProduct('iphone-15');
const lenovo = getProduct('lenovo-ideapad');
const headphones = getProduct('sony-headphones');
const coffeeMachine = getProduct('delonghi');
const watch = getProduct('apple-watch');
const vacuum = getProduct('dyson');
const consoleProduct = getProduct('console');
const runningShoes = getProduct('running-shoes');

export const demoAccountProfile: AccountProfile = {
  firstName: 'Олена',
  lastName: 'Коваль',
  email: 'olena@example.test',
  maskedPhone: '+380 67 *** ** 67',
  birthday: '1992-04-18',
  gender: 'female',
};

export const demoAccountOrders: readonly AccountOrderDetail[] = [
  order('demo-order-006', 'BZ-DEMO-006', '2026-10-18T10:30:00+03:00', 'expected', [orderLine(vacuum, 1)]),
  order('demo-order-005', 'BZ-DEMO-005', '2026-10-02T16:10:00+03:00', 'shipped', [orderLine(lenovo, 1)]),
  order('demo-order-004', 'BZ-DEMO-004', '2026-09-20T12:45:00+03:00', 'delivered', [orderLine(iphone, 1), orderLine(headphones, 2)]),
  order('demo-order-003', 'BZ-DEMO-003', '2026-09-03T09:05:00+03:00', 'returned', [orderLine(coffeeMachine, 1)]),
  order('demo-order-002', 'BZ-DEMO-002', '2026-08-14T18:20:00+03:00', 'canceled', [orderLine(consoleProduct, 1)]),
  order('demo-order-001', 'BZ-DEMO-001', '2026-07-28T11:15:00+03:00', 'delivered', [orderLine(watch, 1)]),
];

export const demoAccountWishlist: readonly AccountWishlistItem[] = [
  { id: 'wishlist-iphone', product: iphone, addedAt: '2026-10-21T12:00:00+03:00' },
  { id: 'wishlist-shoes', product: runningShoes, addedAt: '2026-10-19T08:30:00+03:00' },
  { id: 'wishlist-headphones', product: headphones, addedAt: '2026-10-11T17:15:00+03:00' },
  { id: 'wishlist-lenovo', product: lenovo, addedAt: '2026-09-28T09:45:00+03:00' },
  { id: 'wishlist-watch', product: watch, addedAt: '2026-09-12T14:10:00+03:00' },
];

export const demoAccountReviews: readonly AccountReview[] = [
  {
    id: 'account-review-iphone',
    product: iphone,
    rating: 5,
    text: 'Зручний смартфон, камера та швидкодія відповідають очікуванням.',
    createdAt: '2026-09-25',
    updatedAt: '2026-09-25',
  },
  {
    id: 'account-review-headphones',
    product: headphones,
    rating: 4,
    text: 'Шумозаглушення працює добре, навушники комфортні для щоденного використання.',
    createdAt: '2026-09-12',
    updatedAt: '2026-09-12',
  },
];

export const demoAccountAddresses: readonly AccountAddress[] = [
  {
    id: 'demo-address-1',
    label: 'Дім',
    recipientName: 'Олена Коваль',
    deliveryMethod: 'nova-poshta',
    city: 'Київ',
    location: 'Відділення № 42',
    isDefault: true,
  },
  {
    id: 'demo-address-2',
    label: 'Робота',
    recipientName: 'Олена Коваль',
    deliveryMethod: 'meest',
    city: 'Київ',
    location: 'Поштомат № 18',
    isDefault: false,
  },
];

export const demoAccountFixtures: AccountFixtureSet = {
  profile: demoAccountProfile,
  orders: demoAccountOrders,
  wishlist: demoAccountWishlist,
  reviews: demoAccountReviews,
  addresses: demoAccountAddresses,
  paymentMethods: [],
};
