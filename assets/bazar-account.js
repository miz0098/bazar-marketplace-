(() => {
  const SELECTOR = '[data-bazar-account-module]';
  const AUTH_STORAGE_KEY = 'bazarAuth';
  const ROUTES = [
    '/profile',
    '/profile/orders',
    '/profile/wishlist',
    '/profile/messages',
    '/profile/reviews',
    '/profile/personal-data',
    '/profile/addresses',
    '/profile/payment-methods',
    '/profile/support',
  ];
  const ANIMATION_DURATION = 190;
  const PAGE_SIZE = 5;
  const WISHLIST_PAGE_SIZE = 12;
  const PINNED_CHATS_STORAGE_KEY = 'bazarPinnedChats';
  const MESSAGE_CONTEXT_MENU_WIDTH = 232;
  const MESSAGE_CONTEXT_MENU_HEIGHT = 176;
  const ORDER_STATUS_TABS = [
    ['all', 'Усі замовлення'],
    ['expected', 'Очікуються'],
    ['shipped', 'Відправлено'],
    ['delivered', 'Доставлено'],
    ['canceled', 'Скасовано'],
    ['returned', 'Повернено'],
  ];
  const labels = {
    overview: 'Огляд',
    orders: 'Мої замовлення',
    wishlist: 'Обране',
    messages: 'Повідомлення',
    reviews: 'Мої відгуки',
    profile: 'Особисті дані',
    addresses: 'Улюблені адреси',
    payments: 'Платіжні методи',
    support: 'BAZAR-підтримка',
  };

  const icon = (name) => {
    const paths = {
      orders: '<path d="M6 3h12l1 18H5L6 3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M9 7a3 3 0 0 0 6 0M8.5 13h7M8.5 17h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      pending: '<path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      messages: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M7.5 9.5h9M7.5 13h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      reviews: '<path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      address: '<path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      payment: '<rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M7 15h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      support: '<path d="M5 13a7 7 0 0 1 14 0v2a3 3 0 0 1-3 3h-2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/><path d="M5 13v3a2 2 0 0 0 2 2h1v-7H7a2 2 0 0 0-2 2ZM19 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2ZM10.5 20h3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      copy: '<rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 16V7a2 2 0 0 1 2-2h9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      store: '<path d="M4 10h16l-1-5H5l-1 5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M6 10v9h12v-9M9 19v-5h6v5" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      shield: '<path d="M12 3 20 6v5.7c0 4.4-3.1 7.7-8 9.3-4.9-1.6-8-4.9-8-9.3V6l8-3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      truck: '<path d="M3 6h11v9H3V6ZM14 10h4l3 3v2h-7v-5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><circle cx="7" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      receipt: '<path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M9 8h6M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      heart: '<path d="M20.2 5.1a5.4 5.4 0 0 0-7.6 0l-.6.6-.6-.6a5.4 5.4 0 0 0-7.6 7.6L12 20.9l8.2-8.2a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      heartFilled: '<path d="M20.2 5.1a5.4 5.4 0 0 0-7.6 0l-.6.6-.6-.6a5.4 5.4 0 0 0-7.6 7.6L12 20.9l8.2-8.2a5.4 5.4 0 0 0 0-7.6Z" fill="currentColor"/>',
      box: '<path d="m4 7 8-4 8 4-8 4-8-4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M4 7v10l8 4 8-4V7M12 11v10" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      cart: '<path d="M4 5h2l2 11h9l2-8H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><circle cx="10" cy="20" r="1.2" fill="currentColor"/><circle cx="17" cy="20" r="1.2" fill="currentColor"/>',
      headphones: '<path d="M5 13a7 7 0 0 1 14 0v5a2 2 0 0 1-2 2h-2v-7h4M5 13h4v7H7a2 2 0 0 1-2-2v-5Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      coffee: '<path d="M6 8h10v6a4 4 0 0 1-4 4H9a3 3 0 0 1-3-3V8Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M16 10h2a2 2 0 0 1 0 4h-2M8 5v1M12 4v2M15 5v1M6 20h10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      laptop: '<path d="M5 5h14v10H5V5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M3 19h18l-2-4H5l-2 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      shoe: '<path d="M4 15.5c2.8.4 4.9-.5 6.2-3.4l1.1-2.4 4.8 3.4c1.2.9 2.5 1.3 3.9 1.3V18H4v-2.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M11 12.5h3.5M13 14h3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      stroller: '<path d="M5 10a6 6 0 0 1 12 0v3H5v-3ZM5 13h14M16 13l3 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><circle cx="8" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      edit: '<path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="m14.5 6 3.5 3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      phone: '<path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 17h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      warning: '<path d="M12 4 3 20h18L12 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M12 10v4M12 17h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.2"/>',
      pin: '<path d="m14 4 6 6-3 1-4.5 4.5V20L4 11.5h4.5L13 7l1-3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      paperclip: '<path d="m21 11.5-8.5 8.5a5.2 5.2 0 0 1-7.4-7.4l9-9a3.5 3.5 0 0 1 5 5l-9 9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      send: '<path d="M4 11.5 20 4l-7.5 16-2-6.5L4 11.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="m10.5 13.5 4-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      arrowLeft: '<path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"/>',
      check: '<path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
    };

    return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${paths[name] || paths.box}</svg>`;
  };

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const localizeStatus = (value = '', fallback = 'В обробці') => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    const normalized = raw.toLowerCase();
    const map = {
      paid: 'Оплачено',
      authorized: 'Авторизовано',
      pending: 'Очікує',
      refunded: 'Повернено',
      voided: 'Скасовано',
      fulfilled: 'Виконано',
      unfulfilled: 'В обробці',
      partial: 'Частково виконано',
      'partially fulfilled': 'Частково виконано',
      restocked: 'Повернено на склад',
      open: 'Відкрито',
      waiting: 'Очікує',
      answered: 'Відповідь',
      closed: 'Закрито',
    };

    return map[normalized] || raw;
  };

  const normalizeRoute = (path) => {
    const clean = (path || '/profile').replace(/\/$/, '');
    if (clean === '' || clean === '/profile') return '/profile';
    if (clean.startsWith('/profile/orders/')) return clean;
    return ROUTES.includes(clean) ? clean : '/profile';
  };

  const routeLabel = (route) => {
    if (route.startsWith('/profile/orders/')) return 'Деталі замовлення';
    if (route === '/profile/orders') return labels.orders;
    if (route === '/profile/wishlist') return labels.wishlist;
    if (route === '/profile/messages') return labels.messages;
    if (route === '/profile/reviews') return labels.reviews;
    if (route === '/profile/personal-data') return labels.profile;
    if (route === '/profile/addresses') return labels.addresses;
    if (route === '/profile/payment-methods') return labels.payments;
    if (route === '/profile/support') return labels.support;
    return labels.overview;
  };

  const formatQuantityLabel = (count = 0) => {
    const value = Number(count || 0);
    if (value === 1) return '1 товар';
    if (value > 1 && value < 5) return `${value} товари`;
    return `${value} товарів`;
  };

  const formatMoneyLabel = (value) => `${new Intl.NumberFormat('uk-UA').format(Math.round(value))} грн`;

  const getMoneyValue = (label = '') => {
    const normalized = String(label).replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
    return Number.parseFloat(normalized) || 0;
  };

  const getWishlistVariantId = (item = {}) => {
    const variantId = item.variantId || item.variant_id || item.selectedVariantId || item.variant?.id || '';
    if (variantId) return variantId;

    return /^\d+$/.test(String(item.id || '')) ? item.id : '';
  };

  const getWishlistProductHandle = (item = {}) => {
    if (item.productHandle) return item.productHandle;

    const rawUrl = String(item.url || item.productUrl || '');
    const match = rawUrl.match(/\/products\/([^/?#]+)/);
    if (match?.[1]) return match[1];

    return '';
  };

  const normalizeCartVariantId = (variantId = '') => {
    const raw = String(variantId || '').trim();
    const match = raw.match(/(\d+)$/);
    return match?.[1] || '';
  };

  const divideMoneyLabel = (label = '', quantity = 1) => {
    const value = getMoneyValue(label);
    const count = Number(quantity || 1);
    if (!value || count <= 1) return label;
    return formatMoneyLabel(value / count);
  };

  const normalizeOrderStatus = (order = {}) => {
    const raw = `${order.fulfillmentStatus || ''} ${order.financialStatus || ''}`.toLowerCase();

    if (raw.includes('cancel') || raw.includes('скас')) return 'canceled';
    if (raw.includes('refund') || raw.includes('return') || raw.includes('повер')) return 'returned';
    if (raw.includes('deliver') || raw.includes('fulfilled') || raw.includes('достав') || raw.includes('викон')) return 'delivered';
    if (raw.includes('ship') || raw.includes('відправ')) return 'shipped';
    return 'expected';
  };

  const getOrderStatusLabel = (status) => {
    const found = ORDER_STATUS_TABS.find(([value]) => value === status);
    if (!found || status === 'all') return 'Очікується';
    return found[1].replace('Очікуються', 'Очікується');
  };

  class AccountProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.customer = data.customer || {};
    }

    getProfile() {
      return { ...this.customer };
    }

    saveProfile(profile) {
      this.customer = { ...this.customer, ...profile };
      return this.getProfile();
    }
  }

  class OrderProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.orders = data.orders || [];
    }

    getPlaceholderOrders() {
      // TODO: Replace placeholder orders with api.bazar orders.
      return [
        {
          id: 'demo-bz-250526-1247',
          productTitle: 'Apple iPhone 15 Pro 128GB',
          orderNumber: 'BZ-250526-1247',
          dateTime: '28 травня 2026, 14:30',
          status: 'delivered',
          total: '42 696 грн',
          quantity: '3 товари',
          imageAlt: 'Apple iPhone 15 Pro 128GB',
        },
        {
          id: 'demo-bz-250526-1248',
          productTitle: 'Ноутбук Lenovo IdeaPad Slim 5',
          orderNumber: 'BZ-250526-1248',
          dateTime: '29 травня 2026, 10:15',
          status: 'shipped',
          total: '31 999 грн',
          quantity: '1 товар',
          imageAlt: 'Ноутбук Lenovo IdeaPad Slim 5',
        },
        {
          id: 'demo-bz-250526-1249',
          productTitle: 'Навушники Sony WH-1000XM5',
          orderNumber: 'BZ-250526-1249',
          dateTime: '30 травня 2026, 18:05',
          status: 'expected',
          total: '14 499 грн',
          quantity: '2 товари',
          imageAlt: 'Навушники Sony WH-1000XM5',
        },
        {
          id: 'demo-bz-250526-1250',
          productTitle: 'Кавоварка DeLonghi Magnifica',
          orderNumber: 'BZ-250526-1250',
          dateTime: '31 травня 2026, 09:40',
          status: 'returned',
          total: '18 250 грн',
          quantity: '1 товар',
          imageAlt: 'Кавоварка DeLonghi Magnifica',
        },
        {
          id: 'demo-bz-250526-1251',
          productTitle: 'Смартгодинник Apple Watch Series 9',
          orderNumber: 'BZ-250526-1251',
          dateTime: '01 червня 2026, 12:20',
          status: 'canceled',
          total: '16 899 грн',
          quantity: '1 товар',
          imageAlt: 'Смартгодинник Apple Watch Series 9',
        },
        {
          id: 'demo-bz-250526-1252',
          productTitle: 'Планшет Samsung Galaxy Tab S9',
          orderNumber: 'BZ-250526-1252',
          dateTime: '02 червня 2026, 16:45',
          status: 'delivered',
          total: '27 499 грн',
          quantity: '2 товари',
          imageAlt: 'Планшет Samsung Galaxy Tab S9',
        },
        {
          id: 'demo-bz-250526-1253',
          productTitle: 'Пилосос Dyson V15 Detect',
          orderNumber: 'BZ-250526-1253',
          dateTime: '03 червня 2026, 11:10',
          status: 'expected',
          total: '24 999 грн',
          quantity: '1 товар',
          imageAlt: 'Пилосос Dyson V15 Detect',
        },
      ];
    }

    mapOrderForScreen(order) {
      const firstProduct = order.products?.[0] || {};
      const itemsCount = Number(order.itemsCount || firstProduct.quantity || 0);
      const status = normalizeOrderStatus(order);

      return {
        id: order.id || order.name,
        productTitle: firstProduct.title || order.name || `Замовлення ${order.orderNumber || ''}`,
        orderNumber: order.name || `BZ-${order.orderNumber || ''}`,
        dateTime: order.date || 'Дата уточнюється',
        status,
        total: order.total || '',
        quantity: formatQuantityLabel(itemsCount),
        image: firstProduct.image || '',
        imageAlt: firstProduct.title || order.name || 'Товар BAZAR',
        sourceOrder: order,
      };
    }

    getScreenOrders() {
      return this.orders.map((order) => this.mapOrderForScreen(order));
    }

    listForOrdersScreen({ status = 'all', page = 1 } = {}) {
      const orders = this.getScreenOrders();
      const filtered = status === 'all' ? orders : orders.filter((order) => order.status === status);
      const visibleCount = Math.max(1, page) * PAGE_SIZE;

      return {
        items: filtered.slice(0, visibleCount),
        total: filtered.length,
        allTotal: orders.length,
        page: Math.max(1, page),
        hasMore: visibleCount < filtered.length,
      };
    }

    getDetail(id, profile = {}) {
      // TODO: Replace placeholder detail fields with api.bazar orders.
      const order = this.get(id);
      if (!order) return null;

      const status = normalizeOrderStatus(order);
      const activeStep = this.getTimelineActiveStep(status);
      const orderNumber = order.name || order.orderNumber || `BZ-${order.id || ''}`;
      const orderDate = order.date || '28 травня 2026, 14:30';
      const products = (order.products || []).map((product, index) => {
        const quantity = Number(product.quantity || 1);
        const totalPrice = product.price || order.total || '';

        return {
          id: product.id || `${orderNumber}-${index}`,
          title: product.title || 'Товар BAZAR',
          image: product.image || '',
          quantity,
          quantityLabel: formatQuantityLabel(quantity),
          unitPrice: product.unitPrice || divideMoneyLabel(totalPrice, quantity),
          totalPrice,
        };
      });

      return {
        id: order.id,
        number: orderNumber,
        date: orderDate,
        status,
        total: order.total || '',
        protectionLabel: 'Під захистом BAZAR',
        sourceLabel: 'Замовлення на BAZAR',
        products,
        delivery: {
          carrier: order.delivery?.carrier || 'Нова пошта',
          city: order.delivery?.city || 'м. Київ',
          address: order.delivery?.address || 'відділення №1',
          tracking: order.tracking || order.delivery?.tracking || '20400000000000',
        },
        payment: {
          method: order.payment?.method || 'Apple Pay',
          status: localizeStatus(order.financialStatus, 'Сплачено'),
          amount: order.total || '',
        },
        timeline: this.getTimeline(orderDate, activeStep),
        seller: {
          name: order.seller?.name || 'Офіційний продавець BAZAR',
          handle: order.seller?.handle || 'bazar-official',
          rating: order.seller?.rating || '4.9',
          positiveReviews: order.seller?.positiveReviews || '98%',
          totalOrders: order.seller?.totalOrders || '12 480 замовлень',
        },
      };
    }

    getTimelineActiveStep(status) {
      const map = {
        expected: 2,
        shipped: 3,
        delivered: 5,
        canceled: 1,
        returned: 5,
      };

      return map[status] ?? 2;
    }

    getTimeline(orderDate, activeStep) {
      const statuses = [
        ['Оформлено', orderDate],
        ['Оплачено', orderDate],
        ['Комплектується', activeStep >= 2 ? orderDate : 'Очікується'],
        ['Відправлено', activeStep >= 3 ? '29 травня 2026, 09:20' : 'Очікується'],
        ['Доставляється', activeStep >= 4 ? '29 травня 2026, 18:45' : 'Очікується'],
        ['Доставлено', activeStep >= 5 ? '30 травня 2026, 12:10' : 'Очікується'],
        ['Отримано', activeStep >= 6 ? '30 травня 2026, 12:30' : 'Очікується'],
      ];

      return statuses.map(([label, date], index) => ({
        label,
        date,
        state: index < activeStep ? 'complete' : index === activeStep ? 'active' : 'pending',
      }));
    }

    list({ filter = 'all', search = '', sort = 'newest', page = 1 } = {}) {
      const query = search.trim().toLowerCase();
      const now = Date.now() / 1000;
      let filtered = this.orders.filter((order) => {
        const createdAt = Number(order.createdAt || 0);
        const text = `${order.name} ${order.orderNumber} ${order.total}`.toLowerCase();
        if (query && !text.includes(query)) return false;
        if (filter === 'today') return now - createdAt <= 86400;
        if (filter === '7') return now - createdAt <= 7 * 86400;
        if (filter === '30') return now - createdAt <= 30 * 86400;
        if (filter === 'year') return new Date(createdAt * 1000).getFullYear() === new Date().getFullYear();
        return true;
      });

      filtered = filtered.sort((a, b) => {
        if (sort === 'oldest') return Number(a.createdAt || 0) - Number(b.createdAt || 0);
        if (sort === 'highest') return Number(b.totalValue || 0) - Number(a.totalValue || 0);
        if (sort === 'lowest') return Number(a.totalValue || 0) - Number(b.totalValue || 0);
        return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;

      return {
        items: filtered.slice(start, start + PAGE_SIZE),
        total: filtered.length,
        page: currentPage,
        totalPages,
      };
    }

    get(id) {
      const order = this.orders.find((item) => String(item.id) === String(id) || String(item.name) === String(id));
      if (order) return order;

      const screenOrder = this.getPlaceholderOrders().find((item) => String(item.id) === String(id));
      if (!screenOrder) return null;
      const quantity = parseInt(screenOrder.quantity, 10) || 1;

      return {
        id: screenOrder.id,
        name: screenOrder.orderNumber,
        orderNumber: screenOrder.orderNumber,
        date: screenOrder.dateTime,
        financialStatus: 'Сплачено',
        fulfillmentStatus: getOrderStatusLabel(screenOrder.status),
        total: screenOrder.total,
        totalValue: 0,
        itemsCount: quantity,
        products: [
          {
            title: screenOrder.productTitle,
            quantity,
            price: screenOrder.total,
            image: '',
          },
        ],
      };
    }
  }

  class WishlistProvider {
    constructor(data) {
      // TODO: replace wishlist provider with api.bazar wishlist endpoint.
      this.store = window.BazarWishlistStore || null;
      this.items = Array.isArray(data.wishlist) ? data.wishlist : [];
      this.store?.hydrate(this.items);
    }

    list({ search = '', sort = 'newest' } = {}) {
      if (this.store) return this.store.list({ search, sort });

      const query = search.trim().toLowerCase();

      return [...this.items]
        .filter((item) => !query || `${item.title || ''} ${item.vendor || ''}`.toLowerCase().includes(query))
        .sort((a, b) => {
          if (sort === 'price-high') return Number(b.priceValue || 0) - Number(a.priceValue || 0);
          if (sort === 'price-low') return Number(a.priceValue || 0) - Number(b.priceValue || 0);
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
    }

    get(id) {
      if (this.store) return this.store.get(id);

      return this.items.find((item) => String(item.id || item.handle || '') === String(id));
    }

    remove(id) {
      if (this.store) {
        this.store.remove(id);
        return;
      }

      this.items = this.items.filter((item) => String(item.id || item.handle || '') !== String(id));
    }

    bulkRemove(ids) {
      if (this.store) {
        this.store.bulkRemove(ids);
        return;
      }

      this.items = this.items.filter((item) => !ids.includes(String(item.id)));
    }
  }

  class ChatProvider {
    constructor(data) {
      // TODO: replace placeholder chats with api.bazar messages endpoint.
      // TODO: connect seller chats to api.bazar.
      // TODO: connect support chats to api.bazar.
      this.chats = Array.isArray(data.chats) ? data.chats : this.getDemoChats();
      const storedPins = this.readPinnedIds();
      const initialPins = storedPins ?? this.chats.filter((chat) => chat.pinned).map((chat) => String(chat.id));
      this.pinnedIds = new Set(initialPins);
      this.applyPinnedState();
    }

    getDemoChats() {
      const now = Date.now();

      return [
        {
          id: 'bazar-system',
          type: 'system',
          title: 'BAZAR',
          label: 'Системні повідомлення',
          avatarIcon: 'shield',
          pinned: true,
          canReply: false,
          unreadCount: 2,
          time: '09:24',
          updatedAt: now - 12 * 60 * 1000,
          lastMessage: 'Ваш акаунт успішно захищено. Ми повідомимо про важливі зміни.',
          messages: [
            {
              id: 'sys-1',
              text: 'Вітаємо у BAZAR. Тут зʼявлятимуться важливі повідомлення про акаунт і покупки.',
              time: '09:10',
              direction: 'incoming',
            },
            {
              id: 'sys-2',
              text: 'Ваш акаунт успішно захищено. Ми повідомимо про важливі зміни.',
              time: '09:24',
              direction: 'incoming',
              unread: true,
            },
          ],
        },
        {
          id: 'seller-techstore',
          type: 'seller',
          title: 'Продавець: TechStore',
          label: 'Продавець',
          avatarIcon: 'store',
          canReply: true,
          unreadCount: 1,
          time: 'Вчора',
          updatedAt: now - 26 * 60 * 60 * 1000,
          lastMessage: 'Можемо відправити сьогодні до 18:00.',
          messages: [
            {
              id: 'seller-1',
              text: 'Добрий день. Чи є iPhone 15 Pro у синьому кольорі?',
              time: '15:42',
              direction: 'outgoing',
            },
            {
              id: 'seller-2',
              text: 'Так, є в наявності. Можемо відправити сьогодні до 18:00.',
              time: '15:48',
              direction: 'incoming',
              unread: true,
            },
          ],
        },
        {
          id: 'order-bz-250526-1247',
          type: 'order',
          title: 'Замовлення № BZ-250526-1247',
          label: 'Замовлення',
          avatarIcon: 'receipt',
          canReply: true,
          unreadCount: 0,
          time: '28 трав.',
          updatedAt: now - 5 * 24 * 60 * 60 * 1000,
          lastMessage: 'Посилка доставлена у відділення Нової пошти.',
          messages: [
            {
              id: 'order-1',
              text: 'Замовлення оформлено та передано продавцю.',
              time: '14:30',
              direction: 'incoming',
            },
            {
              id: 'order-2',
              text: 'Оплату отримано. Посилка готується до відправлення.',
              time: '14:34',
              direction: 'incoming',
            },
            {
              id: 'order-3',
              text: 'Посилка доставлена у відділення Нової пошти.',
              time: '12:10',
              direction: 'incoming',
            },
          ],
        },
        {
          id: 'bazar-support',
          type: 'support',
          title: 'BAZAR-підтримка',
          label: 'Підтримка',
          avatarIcon: 'headphones',
          canReply: true,
          unreadCount: 3,
          time: 'Пн',
          updatedAt: now - 7 * 24 * 60 * 60 * 1000,
          lastMessage: 'Ми перевірили звернення і вже підготували відповідь.',
          messages: [
            {
              id: 'support-1',
              text: 'Опишіть, будь ласка, що саме потрібно уточнити щодо замовлення.',
              time: '11:20',
              direction: 'incoming',
            },
            {
              id: 'support-2',
              text: 'Хочу уточнити умови повернення товару.',
              time: '11:27',
              direction: 'outgoing',
            },
            {
              id: 'support-3',
              text: 'Ми перевірили звернення і вже підготували відповідь.',
              time: '11:35',
              direction: 'incoming',
              unread: true,
            },
          ],
        },
      ];
    }

    readPinnedIds() {
      try {
        const raw = window.localStorage?.getItem(PINNED_CHATS_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : null;
      } catch (_error) {
        return null;
      }
    }

    persistPinnedIds() {
      try {
        window.localStorage?.setItem(PINNED_CHATS_STORAGE_KEY, JSON.stringify([...this.pinnedIds]));
      } catch (_error) {
        // TODO: move pinned chats persistence to api.bazar.
      }
    }

    applyPinnedState() {
      this.chats = this.chats.map((chat) => ({
        ...chat,
        pinned: this.pinnedIds.has(String(chat.id)),
      }));
    }

    sortChats(chats = this.chats) {
      return [...chats].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
      });
    }

    list() {
      this.applyPinnedState();
      return this.sortChats();
    }

    get(id) {
      this.applyPinnedState();
      return this.chats.find((chat) => String(chat.id) === String(id)) || null;
    }

    pin(id) {
      this.pinnedIds.add(String(id));
      this.persistPinnedIds();
      this.applyPinnedState();
    }

    unpin(id) {
      this.pinnedIds.delete(String(id));
      this.persistPinnedIds();
      this.applyPinnedState();
    }

    markRead(id) {
      this.chats = this.chats.map((chat) => {
        if (String(chat.id) !== String(id)) return chat;

        return {
          ...chat,
          unreadCount: 0,
          messages: (chat.messages || []).map((message) => ({ ...message, unread: false })),
        };
      });
    }

    delete(id) {
      this.chats = this.chats.filter((chat) => String(chat.id) !== String(id));
      this.pinnedIds.delete(String(id));
      this.persistPinnedIds();
    }

    unreadCount() {
      return this.chats.reduce((total, chat) => total + Number(chat.unreadCount || 0), 0);
    }

    send(id, text) {
      const messageText = String(text || '').trim();
      if (!messageText) return null;

      const now = Date.now();
      const date = new Date(now);
      const time = date.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      });

      let sentMessage = null;

      this.chats = this.chats.map((chat) => {
        if (String(chat.id) !== String(id) || chat.canReply === false) return chat;

        sentMessage = {
          id: `local-${now}`,
          text: messageText,
          time,
          direction: 'outgoing',
        };

        return {
          ...chat,
          lastMessage: messageText,
          time,
          updatedAt: now,
          messages: [...(chat.messages || []), sentMessage],
        };
      });

      return sentMessage;
    }
  }

  class MessageProvider {
    constructor(chatProvider) {
      // TODO: replace placeholder chats with api.bazar messages endpoint.
      this.chatProvider = chatProvider;
    }

    list(chatId) {
      return this.chatProvider.get(chatId)?.messages || [];
    }

    send(chatId, text) {
      return this.chatProvider.send(chatId, text);
    }
  }

  class NotificationProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.notifications = data.notifications || data.messages || [];
    }

    list(category = 'all') {
      return this.notifications.filter((item) => category === 'all' || item.category === category);
    }

    unreadCount() {
      return this.notifications.filter((item) => item.unread).length;
    }

    markAllRead() {
      this.notifications = this.notifications.map((item) => ({ ...item, unread: false }));
    }
  }

  class ReviewProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.reviews = data.reviews || [];
    }

    list() {
      return this.reviews;
    }

    delete(id) {
      this.reviews = this.reviews.filter((review) => String(review.id) !== String(id));
    }
  }

  class AddressProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.addresses = data.addresses || [];
    }

    list() {
      return this.addresses;
    }
  }

  class PaymentProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.methods = data.paymentMethods || [];
    }

    list() {
      return this.methods;
    }
  }

  class SupportProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.tickets = data.supportTickets || [];
    }

    list() {
      return this.tickets;
    }
  }

  const readProviderData = () => {
    const node = document.getElementById('BazarAccountProviderData');
    if (!node) return {};

    try {
      return JSON.parse(node.textContent || '{}');
    } catch (error) {
      return { providerError: error };
    }
  };

  const getAvailableStorages = () =>
    ['localStorage', 'sessionStorage'].map((name) => {
      try {
        return window[name];
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

  const readLocalAuthState = () => {
    // TODO: replace localStorage auth state with api.bazar session/JWT.
    if (window.BazarAuthState?.read) {
      return window.BazarAuthState.read();
    }

    for (const storage of getAvailableStorages()) {
      try {
        const raw = storage.getItem(AUTH_STORAGE_KEY);
        if (!raw) continue;

        const parsed = JSON.parse(raw);
        if (parsed?.isAuthenticated === true) return parsed;
      } catch (error) {
        continue;
      }
    }

    return null;
  };

  const clearLocalAuthState = () => {
    // TODO: replace localStorage auth state with api.bazar session/JWT.
    if (window.BazarAuthState?.clear) {
      window.BazarAuthState.clear();
    } else {
      getAvailableStorages().forEach((storage) => {
        try {
          storage.removeItem(AUTH_STORAGE_KEY);
        } catch (error) {
          // Ignore unavailable storage.
        }
      });
    }

    window.BazarAuthState?.updateHeaderToLogin?.();
  };

  const writeLocalAuthState = (payload = {}) => {
    // TODO: replace localStorage auth state with api.bazar session/JWT.
    if (window.BazarAuthState?.write) {
      return window.BazarAuthState.write(payload);
    }

    const authState = {
      isAuthenticated: true,
      phone: payload.phone || '',
      firstName: payload.firstName || '',
      source: 'bazar-phone-auth',
    };

    getAvailableStorages().forEach((storage) => {
      try {
        storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
      } catch (error) {
        // Ignore unavailable storage.
      }
    });

    return authState;
  };

  const mergeLocalAuthData = (data, localAuth) => {
    if (!localAuth?.isAuthenticated) return data;

    const customer = data.customer || {};
    const firstName = customer.firstName || localAuth.firstName || '';
    const phone = customer.phone || localAuth.phone || '';

    return {
      ...data,
      session: {
        ...(data.session || {}),
        isAuthenticated: true,
        source: data.session?.source || localAuth.source || 'bazar-phone-auth',
      },
      customer: {
        ...customer,
        firstName,
        phone,
        displayName: customer.displayName || firstName || phone || 'Покупець BAZAR',
      },
    };
  };

  const pageHead = (kicker, title, text, actions = '') => `
    <header class="bazar-account-page-head">
      <div>
        <p class="bazar-account-kicker">${escapeHtml(kicker)}</p>
        <h2 class="bazar-account-page-title">${escapeHtml(title)}</h2>
        ${text ? `<p class="bazar-account-page-text">${escapeHtml(text)}</p>` : ''}
      </div>
      ${actions ? `<div class="bazar-account-page-actions">${actions}</div>` : ''}
    </header>
  `;

  const statCard = (route, iconName, value, label) => `
    <a class="bazar-account-stat-card" href="${route}" data-account-route="${route}">
      <span class="bazar-account-stat-card__icon">${icon(iconName)}</span>
      <span>
        <span class="bazar-account-stat-card__value">${escapeHtml(value)}</span>
        <span class="bazar-account-stat-card__label">${escapeHtml(label)}</span>
      </span>
    </a>
  `;

  const emptyState = (iconName, title, text, action = '') => `
    <div class="bazar-account-empty">
      <span class="bazar-account-empty__icon">${icon(iconName)}</span>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      ${action}
    </div>
  `;

  const errorState = () => `
    <div class="bazar-account-error" role="alert">
      <span class="bazar-account-empty__icon">${icon('warning')}</span>
      <h2>З'єднання втрачено</h2>
      <p>Не вдалося оновити дані акаунта. Перевірте підключення та спробуйте ще раз.</p>
      <button class="bazar-account-button bazar-account-button--primary" type="button" data-account-action="retry">Спробувати ще раз</button>
    </div>
  `;

  const skeleton = () => `
    <div class="bazar-account-loading" role="status" aria-live="polite">
      <span class="bazar-account-skeleton bazar-account-skeleton--title"></span>
      <span class="bazar-account-skeleton bazar-account-skeleton--line"></span>
      <div class="bazar-account-skeleton-grid">
        <span class="bazar-account-skeleton bazar-account-skeleton--card"></span>
        <span class="bazar-account-skeleton bazar-account-skeleton--card"></span>
        <span class="bazar-account-skeleton bazar-account-skeleton--card"></span>
      </div>
    </div>
  `;

  class BazarAccountModule {
    constructor(root) {
      this.root = root;
      this.shell = root.querySelector('[data-account-shell]');
      this.content = root.querySelector('[data-account-content]');
      this.sidebar = root.querySelector('[data-account-sidebar]');
      this.sidebarToggle = root.querySelector('[data-account-sidebar-open]');
      this.sidebarBackdrop = root.querySelector('[data-account-sidebar-backdrop]');
      this.localAuth = readLocalAuthState();
      this.data = mergeLocalAuthData(readProviderData(), this.localAuth);
      this.isAuthenticated = this.data.session?.isAuthenticated === true || this.localAuth?.isAuthenticated === true;
      const chatProvider = new ChatProvider(this.data);
      this.providers = {
        account: new AccountProvider(this.data),
        orders: new OrderProvider(this.data),
        wishlist: new WishlistProvider(this.data),
        chats: chatProvider,
        messages: new MessageProvider(chatProvider),
        notifications: new NotificationProvider(this.data),
        reviews: new ReviewProvider(this.data),
        addresses: new AddressProvider(this.data),
        payments: new PaymentProvider(this.data),
        support: new SupportProvider(this.data),
      };
      this.state = {
        route: normalizeRoute(window.location.pathname),
        orderFilter: 'all',
        orderSearch: '',
        orderSort: 'newest',
        orderPage: 1,
        wishlistSearch: '',
        wishlistSort: 'newest',
        wishlistVisibleCount: WISHLIST_PAGE_SIZE,
        notificationCategory: 'all',
        selectedChatId: '',
        messageContextMenu: null,
        selectedWishlist: [],
        supportView: 'tickets',
        editingReviewId: '',
        profileSaved: false,
        error: Boolean(this.data.providerError),
      };
    }

    init() {
      this.bindEvents();
      this.syncVisibility();

      if (!this.isAuthenticated) {
        return;
      }

      this.render(false);
    }

    bindEvents() {
      this.root.addEventListener('click', (event) => this.handleClick(event));
      this.root.addEventListener('input', (event) => this.handleInput(event));
      this.root.addEventListener('change', (event) => this.handleChange(event));
      this.root.addEventListener('submit', (event) => this.handleSubmit(event));
      this.root.addEventListener('contextmenu', (event) => this.handleContextMenu(event));
      window.addEventListener('popstate', () => {
        this.state.route = normalizeRoute(window.location.pathname);
        this.state.messageContextMenu = null;
        this.render(true, false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          if (this.state.messageContextMenu) {
            this.closeMessageContextMenu();
            return;
          }

          this.closeSidebar();
        }
      });
      document.addEventListener('click', (event) => {
        if (!this.state.messageContextMenu || this.root.contains(event.target)) return;

        this.closeMessageContextMenu();
      });

      window.BazarWishlistStore?.subscribe(() => {
        if (this.state.route === '/profile/wishlist') this.render(false, false);
      });
    }

    syncVisibility() {
      if (this.shell) this.shell.hidden = !this.isAuthenticated;
      if (this.sidebarToggle) this.sidebarToggle.hidden = !this.isAuthenticated;

      if (this.isAuthenticated) {
        window.BazarAuthState?.updateHeaderToProfile?.();
      }
    }

    logout() {
      clearLocalAuthState();
      this.closeSidebar();
      window.location.assign('/');
    }

    handleClick(event) {
      const messageMenuAction = event.target.closest('[data-account-message-menu-action]');
      if (messageMenuAction && this.root.contains(messageMenuAction)) {
        event.preventDefault();
        this.runMessageMenuAction(messageMenuAction.dataset.accountMessageMenuAction, messageMenuAction.dataset.chatId);
        return;
      }

      const chatItem = event.target.closest('[data-account-chat-id]');
      if (this.state.messageContextMenu && !event.target.closest('[data-account-message-menu]') && !chatItem) {
        event.preventDefault();
        this.closeMessageContextMenu();
        return;
      }

      if (chatItem && this.root.contains(chatItem)) {
        event.preventDefault();
        this.state.selectedChatId = chatItem.dataset.accountChatId || '';
        this.state.messageContextMenu = null;
        this.render(false, false);
        return;
      }

      const logoutLink = event.target.closest('[data-account-logout]');
      if (logoutLink && this.root.contains(logoutLink)) {
        event.preventDefault();
        this.logout();
        return;
      }

      const routeLink = event.target.closest('[data-account-route]');
      if (routeLink && this.root.contains(routeLink)) {
        event.preventDefault();
        this.state.messageContextMenu = null;
        this.navigate(routeLink.dataset.accountRoute);
        return;
      }

      const stateButton = event.target.closest('button[data-account-state]');
      if (stateButton && this.root.contains(stateButton)) {
        event.preventDefault();
        this.state[stateButton.dataset.accountState] = stateButton.value;
        if (stateButton.dataset.accountState === 'orderFilter') this.state.orderPage = 1;
        this.render(false, false);
        return;
      }

      const action = event.target.closest('[data-account-action]');
      if (action && this.root.contains(action)) {
        event.preventDefault();
        this.runAction(action.dataset.accountAction, action);
        return;
      }

      if (event.target.closest('[data-account-sidebar-open]')) {
        this.openSidebar();
        return;
      }

      if (event.target.closest('[data-account-sidebar-close]')) {
        this.closeSidebar();
      }
    }

    handleContextMenu(event) {
      if (this.state.route !== '/profile/messages') return;

      const chatItem = event.target.closest('[data-account-chat-id]');
      if (!chatItem || !this.root.contains(chatItem)) return;

      event.preventDefault();

      const contentRect = this.content?.getBoundingClientRect() || { left: 0, top: 0 };
      const maxLeft = Math.max(12, window.innerWidth - MESSAGE_CONTEXT_MENU_WIDTH - 12);
      const maxTop = Math.max(12, window.innerHeight - MESSAGE_CONTEXT_MENU_HEIGHT - 12);
      const left = Math.min(Math.max(12, event.clientX), maxLeft);
      const top = Math.min(Math.max(12, event.clientY), maxTop);

      this.state.messageContextMenu = {
        chatId: chatItem.dataset.accountChatId || '',
        x: left - contentRect.left,
        y: top - contentRect.top,
      };
      this.render(false, false);
    }

    handleInput(event) {
      const input = event.target.closest('[data-account-state]');
      if (!input) return;
      this.state[input.dataset.accountState] = input.value;
      if (input.dataset.accountState === 'orderSearch') this.state.orderPage = 1;
      this.render(false, false, input.dataset.accountState);
    }

    handleChange(event) {
      const field = event.target.closest('[data-account-state]');
      if (!field) return;

      if (field.type === 'checkbox' && 'accountBulkItem' in field.dataset) {
        const id = String(field.value);
        this.state.selectedWishlist = field.checked
          ? [...new Set([...this.state.selectedWishlist, id])]
          : this.state.selectedWishlist.filter((item) => item !== id);
        return;
      }

      this.state[field.dataset.accountState] = field.value;
      if (field.dataset.accountState === 'orderFilter') this.state.orderPage = 1;
      this.render(false, false);
    }

    handleSubmit(event) {
      const form = event.target.closest('[data-account-form]');
      if (!form) return;
      event.preventDefault();

      if (form.dataset.accountForm === 'profile') {
        const formData = new FormData(form);
        const firstName = formData.get('firstName') || '';
        const phone = formData.get('phone') || '';

        this.providers.account.saveProfile({
          firstName,
          lastName: formData.get('lastName') || '',
          phone,
          email: formData.get('email') || '',
          birthday: formData.get('birthday') || '',
          gender: formData.get('gender') || '',
        });

        if (this.localAuth?.isAuthenticated) {
          this.localAuth = writeLocalAuthState({
            firstName,
            phone: phone || this.localAuth.phone,
          });
        }

        this.state.profileSaved = true;
        this.render(false, false);
      }

      if (form.dataset.accountForm === 'message') {
        const formData = new FormData(form);
        const text = formData.get('message') || '';

        this.providers.messages.send(this.state.selectedChatId, text);
        this.render(false, false);
      }
    }

    runAction(action, element) {
      if (action === 'retry') {
        this.state.error = false;
        this.render(true, false);
      }

      if (action === 'order-page') {
        this.state.orderPage = Number(element.dataset.page || 1);
        this.render(false, false);
      }

      if (action === 'copy-text') {
        const text = element.dataset.copyText || '';
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
      }

      if (action === 'seller-chat') {
        // TODO: connect seller chat to api.bazar seller chat integration.
        return;
      }

      if (action === 'mark-all-read') {
        this.providers.notifications.markAllRead();
        this.render(false, false);
      }

      if (action === 'wishlist-remove') {
        this.removeWishlistItem(element.dataset.id, element);
      }

      if (action === 'wishlist-bulk-remove') {
        this.providers.wishlist.bulkRemove(this.state.selectedWishlist);
        this.state.selectedWishlist = [];
        this.render(false, false);
      }

      if (action === 'wishlist-show-more') {
        this.state.wishlistVisibleCount += WISHLIST_PAGE_SIZE;
        this.render(false, false);
      }

      if (action === 'wishlist-add-cart') {
        this.addWishlistItemToCart(element.dataset.id, element);
      }

      if (action === 'review-delete') {
        this.providers.reviews.delete(element.dataset.id);
        this.render(false, false);
      }

      if (action === 'review-edit') {
        this.state.editingReviewId = element.dataset.id || '';
        this.render(false, false);
      }

      if (action === 'review-save' || action === 'review-cancel') {
        this.state.editingReviewId = '';
        this.render(false, false);
      }

      if (action === 'support-view') {
        this.state.supportView = element.dataset.view || 'tickets';
        this.render(false, false);
      }

      if (action === 'messages-back') {
        this.state.selectedChatId = '';
        this.state.messageContextMenu = null;
        this.render(false, false);
      }
    }

    closeMessageContextMenu() {
      this.state.messageContextMenu = null;
      this.render(false, false);
    }

    runMessageMenuAction(action, chatId) {
      const chat = this.providers.chats.get(chatId);
      if (!chat) {
        this.closeMessageContextMenu();
        return;
      }

      if (action === 'pin') this.providers.chats.pin(chatId);
      if (action === 'unpin') this.providers.chats.unpin(chatId);
      if (action === 'read') this.providers.chats.markRead(chatId);
      if (action === 'delete') {
        this.providers.chats.delete(chatId);
        if (String(this.state.selectedChatId) === String(chatId)) this.state.selectedChatId = '';
      }

      this.state.messageContextMenu = null;
      this.render(false, false);
    }

    removeWishlistItem(id, element) {
      const card = element.closest('[data-wishlist-card]');
      element.setAttribute('aria-pressed', 'false');
      element.innerHTML = icon('heart');

      const finish = () => {
        this.providers.wishlist.remove(id);
        this.state.selectedWishlist = this.state.selectedWishlist.filter((item) => item !== String(id));
        this.render(false, false);
      };

      if (!card) {
        finish();
        return;
      }

      card.classList.add('is-removing');
      card.addEventListener('animationend', finish, { once: true });
      window.setTimeout(() => {
        if (card.isConnected) finish();
      }, 260);
    }

    async addWishlistItemToCart(id, button) {
      const item = this.providers.wishlist.get(id);
      const variantId = normalizeCartVariantId(getWishlistVariantId(item) || (await this.fetchWishlistVariantId(item)));

      if (!variantId) {
        this.showWishlistToast('Товар тимчасово недоступний для кошика', 'error');
        return;
      }

      button.classList.add('is-loading');
      button.disabled = true;

      try {
        const addResponse = await fetch(window.Theme?.routes?.cart_add_url || '/cart/add.js', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: Number(variantId),
            quantity: 1,
          }),
        });

        if (!addResponse.ok) throw new Error('Cart add failed');
        await addResponse.json();

        const cartResponse = await fetch('/cart.js', {
          headers: {
            Accept: 'application/json',
          },
        });
        const cart = cartResponse.ok ? await cartResponse.json() : null;
        const itemCount = Number(cart?.item_count || cart?.totalQuantity || 0);

        this.updateHeaderCartCount(itemCount);
        this.showWishlistToast('Товар додано в кошик', 'success');
      } catch (_error) {
        this.showWishlistToast('Не вдалося додати товар у кошик', 'error');
      } finally {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }

    async fetchWishlistVariantId(item) {
      const handle = getWishlistProductHandle(item);
      if (!handle) return '';

      try {
        const response = await fetch(`/products/${encodeURIComponent(handle)}.js`, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok) return '';

        const product = await response.json();
        const variant = product.variants?.find((candidate) => candidate.available) || product.variants?.[0];
        return variant?.id || '';
      } catch (_error) {
        return '';
      }
    }

    updateHeaderCartCount(itemCount) {
      document.querySelectorAll('.bazar-header-action--cart').forEach((cartAction) => {
        let badge = cartAction.querySelector('.bazar-header-action__badge');

        if (itemCount > 0 && !badge) {
          badge = document.createElement('span');
          badge.className = 'bazar-header-action__badge';
          cartAction.appendChild(badge);
        }

        if (badge) {
          badge.textContent = String(itemCount);
          badge.hidden = itemCount <= 0;
        }

        cartAction.setAttribute('aria-label', itemCount > 0 ? `Кошик: ${itemCount}` : 'Кошик');
      });

      const cartIcon = document.querySelector('cart-icon');
      if (typeof cartIcon?.renderCartBubble === 'function') cartIcon.renderCartBubble(itemCount);
    }

    showWishlistToast(message, type = 'success') {
      if (typeof window.showToast === 'function') {
        window.showToast({ type, message });
      }
    }

    navigate(route) {
      const nextRoute = normalizeRoute(route);
      this.state.route = nextRoute;
      this.closeSidebar();
      if (window.location.pathname !== nextRoute) {
        window.history.pushState({ route: nextRoute }, '', nextRoute);
      }
      this.render(true, true);
    }

    openSidebar() {
      this.root.classList.add('is-sidebar-open');
      if (this.sidebarBackdrop) this.sidebarBackdrop.hidden = false;
      if (this.sidebarToggle) this.sidebarToggle.setAttribute('aria-expanded', 'true');
    }

    closeSidebar() {
      this.root.classList.remove('is-sidebar-open');
      if (this.sidebarBackdrop) this.sidebarBackdrop.hidden = true;
      if (this.sidebarToggle) this.sidebarToggle.setAttribute('aria-expanded', 'false');
    }

    render(withTransition = true, focusContent = false, restoreStateName = '') {
      this.updateSidebar();

      const paint = () => {
        this.content.innerHTML = this.state.error ? errorState() : this.renderRoute();
        this.content.classList.remove('is-transitioning');
        requestAnimationFrame(() => this.content.classList.add('is-ready'));

        if (restoreStateName) {
          const field = this.content.querySelector(`[data-account-state="${restoreStateName}"]`);
          if (field) {
            field.focus();
            const length = field.value.length;
            if (typeof field.setSelectionRange === 'function') field.setSelectionRange(length, length);
          }
        } else if (focusContent) {
          this.content.focus({ preventScroll: true });
        }
      };

      if (!withTransition) {
        paint();
        return;
      }

      this.content.classList.remove('is-ready');
      this.content.classList.add('is-transitioning');
      this.content.innerHTML = skeleton();
      window.setTimeout(paint, ANIMATION_DURATION);
    }

    updateSidebar() {
      this.root.querySelectorAll('[data-account-route]').forEach((item) => {
        const route = normalizeRoute(item.dataset.accountRoute);
        const isActive =
          route === this.state.route ||
          (route === '/profile/orders' && this.state.route.startsWith('/profile/orders/'));
        item.classList.toggle('is-active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    }

    renderRoute() {
      const route = this.state.route;
      if (route.startsWith('/profile/orders/')) return this.renderOrderDetails(route.split('/').pop());
      if (route === '/profile/orders') return this.renderOrders();
      if (route === '/profile/wishlist') return this.renderWishlist();
      if (route === '/profile/messages') return this.renderMessages();
      if (route === '/profile/reviews') return this.renderReviews();
      if (route === '/profile/personal-data') return this.renderProfile();
      if (route === '/profile/addresses') return this.renderAddresses();
      if (route === '/profile/payment-methods') return this.renderPayments();
      if (route === '/profile/support') return this.renderSupport();
      return this.renderOverview();
    }

    renderOverview() {
      const profile = this.providers.account.getProfile();
      const orders = this.providers.orders.list({ page: 1 });
      const pending = this.providers.orders.orders.filter((order) =>
        localizeStatus(order.fulfillmentStatus, 'В обробці').toLowerCase().includes('оброб')
      );
      const unreadMessages = this.providers.notifications.unreadCount();
      const reviews = this.providers.reviews.list();

      return `
        ${pageHead(
          'Особистий кабінет',
          `Вітаємо, ${profile.firstName || profile.displayName || 'покупцю'}`,
          'Керуйте замовленнями, обраним, адресами, платежами та зверненнями до підтримки BAZAR.'
        )}
        <section class="bazar-account-stats-grid" aria-label="Швидка статистика">
          ${statCard('/profile/orders', 'orders', String(this.providers.orders.orders.length), 'Замовлення')}
          ${statCard('/profile/orders', 'pending', String(pending.length), 'Очікують')}
          ${statCard('/profile/messages', 'messages', String(unreadMessages), 'Повідомлення')}
          ${statCard('/profile/reviews', 'reviews', String(reviews.length), 'Відгуки')}
        </section>
        <div class="bazar-account-section-grid">
          <section class="bazar-account-card">
            <div class="bazar-account-card__head">
              <div>
                <h3 class="bazar-account-card__title">Останні замовлення</h3>
                <p class="bazar-account-card__text">Швидкий доступ до історії покупок.</p>
              </div>
              <a class="bazar-account-button bazar-account-button--secondary" href="/profile/orders" data-account-route="/profile/orders">Усі замовлення</a>
            </div>
            ${orders.items.length ? `<div class="bazar-account-list">${orders.items.slice(0, 3).map((order) => this.renderOrderCard(order)).join('')}</div>` : emptyState('orders', 'Замовлень ще немає', 'Після першої покупки історія зʼявиться тут.')}
          </section>
          <aside class="bazar-account-panel">
            <div class="bazar-account-card__head">
              <div>
                <h3 class="bazar-account-card__title">Профіль покупця</h3>
                <p class="bazar-account-card__text">${escapeHtml(profile.email || 'Електронну пошту ще не додано')}</p>
              </div>
              <span class="bazar-account-card__icon">${icon('user')}</span>
            </div>
            <p class="bazar-account-panel__text">Телефон: ${escapeHtml(profile.phone || 'потрібно додати')}</p>
            <div class="bazar-account-form-actions">
              <a class="bazar-account-button bazar-account-button--primary" href="/profile/personal-data" data-account-route="/profile/personal-data">Редагувати</a>
              <a class="bazar-account-button bazar-account-button--ghost" href="/profile/addresses" data-account-route="/profile/addresses">Адреси</a>
            </div>
          </aside>
        </div>
      `;
    }

    renderOrders() {
      const result = this.providers.orders.listForOrdersScreen({
        status: this.state.orderFilter,
        page: this.state.orderPage,
      });

      return `
        <section class="bazar-account-orders-screen" aria-label="Мої замовлення">
          ${this.renderOrderStatusTabs()}
          ${
            result.items.length
              ? `<div class="bazar-account-orders-list">${result.items.map((order) => this.renderOrderScreenRow(order)).join('')}</div>`
              : this.renderOrdersEmptyState(result)
          }
          ${result.hasMore ? `<button class="bazar-account-orders-more" type="button" data-account-action="order-page" data-page="${result.page + 1}">Показати ще</button>` : ''}
        </section>
      `;
    }

    renderOrdersEmptyState(result) {
      const hasAnyOrders = result.allTotal > 0;
      const title = hasAnyOrders ? 'Замовлень у цьому статусі поки немає' : 'У вас ще немає замовлень';
      const text = hasAnyOrders
        ? 'Коли замовлення отримає цей статус, воно зʼявиться в цьому розділі.'
        : 'Перейдіть до каталогу, щоб знайти товари та оформити перше замовлення на BAZAR.';

      return `
        <div class="bazar-account-orders-empty">
          <span class="bazar-account-orders-empty__icon">${icon('box')}</span>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(text)}</p>
          ${
            hasAnyOrders
              ? ''
              : '<a class="bazar-account-button bazar-account-button--primary" href="/collections">Перейти до каталогу</a>'
          }
        </div>
      `;
    }

    renderOrderStatusTabs() {
      return `
        <div class="bazar-account-order-tabs" role="tablist" aria-label="Статуси замовлень">
          ${ORDER_STATUS_TABS.map(([value, label]) => {
            const active = this.state.orderFilter === value;

            return `
              <button
                class="bazar-account-order-tab ${active ? 'is-active' : ''}"
                type="button"
                role="tab"
                aria-selected="${active ? 'true' : 'false'}"
                data-account-state="orderFilter"
                value="${escapeHtml(value)}"
              >
                ${escapeHtml(label)}
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    renderOrderScreenRow(order) {
      const detailRoute = `/profile/orders/${encodeURIComponent(order.id || order.orderNumber)}`;
      const statusLabel = getOrderStatusLabel(order.status);

      return `
        <article class="bazar-account-order-row">
          <div class="bazar-account-order-row__product">
            ${this.renderOrderScreenImage(order)}
            <div class="bazar-account-order-row__info">
              <h3>${escapeHtml(order.productTitle || 'Товар BAZAR')}</h3>
              <p>${escapeHtml(order.orderNumber || '')}</p>
              <p>${escapeHtml(order.dateTime || '')}</p>
            </div>
          </div>
          <div class="bazar-account-order-row__status">
            <span class="bazar-account-order-status bazar-account-order-status--${escapeHtml(order.status || 'expected')}">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="bazar-account-order-row__summary">
            <strong>${escapeHtml(order.total || '')}</strong>
            <span>${escapeHtml(order.quantity || '')}</span>
          </div>
          <a class="bazar-account-order-row__details" href="${detailRoute}" data-account-route="${detailRoute}">
            Деталі
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </a>
        </article>
      `;
    }

    renderOrderScreenImage(order) {
      if (order.image) {
        return `
          <span class="bazar-account-order-row__image">
            <img src="${escapeHtml(order.image)}" alt="${escapeHtml(order.imageAlt || order.productTitle || 'Товар')}" loading="lazy">
          </span>
        `;
      }

      return `
        <span class="bazar-account-order-row__image bazar-account-order-row__image--fallback" aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <rect x="18" y="8" width="28" height="48" rx="7" fill="#ffffff" stroke="#2962ff" stroke-width="3"/>
            <rect x="23" y="15" width="18" height="30" rx="3" fill="#edf3ff"/>
            <circle cx="32" cy="50" r="2.5" fill="#2962ff"/>
          </svg>
        </span>
      `;
    }

    renderOrderCard(order) {
      const detailRoute = `/profile/orders/${encodeURIComponent(order.id || order.name)}`;
      return `
        <article class="bazar-account-order-card">
          <div>
            <h3 class="bazar-account-order-card__title">${escapeHtml(order.name || `Замовлення ${order.orderNumber || ''}`)}</h3>
            <div class="bazar-account-order-card__meta">
              <span class="bazar-account-pill">${escapeHtml(order.date || '')}</span>
              <span class="bazar-account-pill bazar-account-pill--orange">${escapeHtml(localizeStatus(order.financialStatus, 'Очікує оплати'))}</span>
              <span class="bazar-account-pill bazar-account-pill--blue">${escapeHtml(localizeStatus(order.fulfillmentStatus, 'В обробці'))}</span>
              <span class="bazar-account-pill">${escapeHtml(String(order.itemsCount || 0))} товарів</span>
            </div>
          </div>
          <div>
            <p class="bazar-account-order-card__total">${escapeHtml(order.total || '')}</p>
            <a class="bazar-account-button bazar-account-button--secondary" href="${detailRoute}" data-account-route="${detailRoute}">Деталі</a>
          </div>
        </article>
      `;
    }

    renderOrderDetails(encodedId) {
      const detail = this.providers.orders.getDetail(decodeURIComponent(encodedId), this.providers.account.getProfile());
      if (!detail) {
        return `
          ${pageHead('Замовлення', 'Замовлення не знайдено', 'Можливо, воно було оновлене або недоступне для поточної сесії.')}
          ${emptyState('orders', 'Немає даних замовлення', 'Поверніться до списку замовлень і спробуйте ще раз.', '<a class="bazar-account-button bazar-account-button--primary" href="/profile/orders" data-account-route="/profile/orders">До замовлень</a>')}
        `;
      }

      return `
        <section class="bazar-account-order-detail" aria-labelledby="BazarOrderDetailTitle">
          <header class="bazar-account-order-detail__header">
            <a class="bazar-account-order-detail__back" href="/profile/orders" data-account-route="/profile/orders">
              <span aria-hidden="true">←</span>
              Назад
            </a>
            <div class="bazar-account-order-detail__title-row">
              <h2 id="BazarOrderDetailTitle">Замовлення № ${escapeHtml(detail.number)}</h2>
              <button
                class="bazar-account-copy-button"
                type="button"
                data-account-action="copy-text"
                data-copy-text="${escapeHtml(detail.number)}"
                aria-label="Скопіювати номер замовлення"
              >
                ${icon('copy')}
              </button>
            </div>
          </header>

          <div class="bazar-account-order-detail__grid">
            <div class="bazar-account-order-detail__main">
              ${this.renderOrderDetailProductCard(detail)}
              <div class="bazar-account-order-detail-info-row">
                ${this.renderOrderDelivery(detail.delivery)}
                ${this.renderOrderPayment(detail.payment)}
              </div>
            </div>
            <aside class="bazar-account-order-detail__side">
              ${this.renderOrderDetailTimeline(detail.timeline)}
              ${this.renderOrderSeller(detail.seller)}
            </aside>
          </div>
        </section>
      `;
    }

    renderOrderDetailProductCard(detail) {
      return `
        <section class="bazar-account-order-detail-card">
          <div class="bazar-account-order-detail-card__top">
            <span class="bazar-account-order-source">${escapeHtml(detail.sourceLabel)}</span>
            <span class="bazar-account-order-protection">${icon('shield')}${escapeHtml(detail.protectionLabel)}</span>
          </div>
          <div class="bazar-account-order-detail-products">
            ${
              detail.products.length
                ? detail.products.map((product) => this.renderOrderDetailProduct(product)).join('')
                : emptyState('box', 'Товари недоступні', 'Дані позицій будуть отримані після оновлення провайдера.')
            }
          </div>
          <div class="bazar-account-order-detail-actions">
            <button class="bazar-account-button bazar-account-button--secondary" type="button">Додати відгук</button>
          </div>
        </section>
      `;
    }

    renderOrderDetailProduct(product) {
      return `
        <article class="bazar-account-order-detail-product">
          <span class="bazar-account-order-detail-product__image">
            ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy">` : icon('box')}
          </span>
          <div class="bazar-account-order-detail-product__info">
            <h3>${escapeHtml(product.title)}</h3>
            <p>${escapeHtml(product.quantityLabel)}</p>
          </div>
          <div class="bazar-account-order-detail-product__price">
            <span>${escapeHtml(product.unitPrice)}</span>
            <strong>${escapeHtml(product.totalPrice)}</strong>
          </div>
        </article>
      `;
    }

    renderOrderDelivery(delivery) {
      return `
        <section class="bazar-account-order-detail-card">
          <h3 class="bazar-account-order-detail-card__title">Доставка</h3>
          <div class="bazar-account-order-info-lead">
            <span class="bazar-account-order-info-lead__icon">${icon('truck')}</span>
            <div>
              <strong>${escapeHtml(delivery.carrier)}</strong>
            </div>
          </div>
          <dl class="bazar-account-order-detail-list">
            <div>
              <dt>Адреса</dt>
              <dd>${escapeHtml(delivery.city)}, ${escapeHtml(delivery.address)}</dd>
            </div>
            <div>
              <dt>ТТН</dt>
              <dd>
                ${escapeHtml(delivery.tracking)}
                <button
                  class="bazar-account-copy-button bazar-account-copy-button--inline"
                  type="button"
                  data-account-action="copy-text"
                  data-copy-text="${escapeHtml(delivery.tracking)}"
                  aria-label="Скопіювати номер ТТН"
                >
                  ${icon('copy')}
                </button>
              </dd>
            </div>
          </dl>
        </section>
      `;
    }

    renderOrderPayment(payment) {
      return `
        <section class="bazar-account-order-detail-card">
          <h3 class="bazar-account-order-detail-card__title">Оплата</h3>
          <div class="bazar-account-order-info-lead">
            <span class="bazar-account-order-info-lead__icon">${icon('payment')}</span>
            <div>
              <strong>${escapeHtml(payment.method)}</strong>
            </div>
          </div>
          <div class="bazar-account-order-payment-lines">
            <span>${escapeHtml(payment.status)}</span>
            ${payment.amount ? `<strong>${escapeHtml(payment.amount)}</strong>` : ''}
          </div>
        </section>
      `;
    }

    renderOrderDetailTimeline(timeline) {
      return `
        <section class="bazar-account-order-detail-card bazar-account-order-detail-card--side">
          <h3 class="bazar-account-order-detail-card__title">Статус замовлення</h3>
          <ol class="bazar-account-order-timeline">
            ${timeline.map((item) => `
              <li class="bazar-account-order-timeline__item is-${escapeHtml(item.state)}">
                <span class="bazar-account-order-timeline__dot" aria-hidden="true"></span>
                <span class="bazar-account-order-timeline__line" aria-hidden="true"></span>
                <span>
                  <strong>${escapeHtml(item.label)}</strong>
                  <small>${escapeHtml(item.date)}</small>
                </span>
              </li>
            `).join('')}
          </ol>
        </section>
      `;
    }

    renderOrderSeller(seller) {
      // TODO: connect seller page route to api.bazar seller catalog.
      return `
        <section class="bazar-account-order-detail-card bazar-account-order-detail-card--side">
          <h3 class="bazar-account-order-detail-card__title">Продавець</h3>
          <div class="bazar-account-seller">
            <span class="bazar-account-seller__avatar">${icon('store')}</span>
            <div>
              <a class="bazar-account-seller__name" href="/seller/${escapeHtml(seller.handle)}">${escapeHtml(seller.name)}</a>
              <p>${escapeHtml(seller.totalOrders)}</p>
            </div>
          </div>
          <div class="bazar-account-seller-stats">
            <span>★ <strong>${escapeHtml(seller.rating)}</strong> · ${escapeHtml(seller.positiveReviews)} позитивних відгуків</span>
          </div>
          <div class="bazar-account-order-detail-actions">
            <button class="bazar-account-button bazar-account-button--secondary" type="button" data-account-action="seller-chat">Звʼязатись з продавцем</button>
            <button class="bazar-account-button bazar-account-button--ghost" type="button">Відгуки про продавця</button>
          </div>
        </section>
      `;
    }

    renderWishlist() {
      const items = this.providers.wishlist.list({
        search: this.state.wishlistSearch,
        sort: this.state.wishlistSort,
      });
      const visibleCount = Math.max(WISHLIST_PAGE_SIZE, this.state.wishlistVisibleCount);
      const visibleItems = items.slice(0, visibleCount);
      const hasMore = visibleItems.length < items.length;

      return `
        <section class="bazar-account-wishlist-screen" aria-label="Обране">
          ${items.length ? this.renderWishlistGrid(visibleItems, hasMore) : this.renderWishlistEmpty()}
        </section>
      `;
    }

    renderMessages() {
      const chats = this.providers.chats.list();
      const selectedChat = this.state.selectedChatId ? this.providers.chats.get(this.state.selectedChatId) : null;

      return `
        <section class="bazar-account-messages-screen${selectedChat ? ' is-conversation-open' : ''}" aria-label="Повідомлення">
          ${
            chats.length
              ? `
                <div class="bazar-account-messages-module">
                  <aside class="bazar-account-chat-list" aria-label="Список чатів">
                    <div class="bazar-account-chat-list__head">
                      <h3>Чати</h3>
                    </div>
                    <div class="bazar-account-chat-list__items">
                      ${chats.map((chat) => this.renderChatItem(chat, selectedChat?.id)).join('')}
                    </div>
                  </aside>
                  <div class="bazar-account-conversation">
                    ${selectedChat ? this.renderConversation(selectedChat) : this.renderNoChatSelected()}
                  </div>
                </div>
                ${this.renderMessageContextMenu()}
              `
              : this.renderMessagesEmpty()
          }
        </section>
      `;
    }

    renderMessagesEmpty() {
      return `
        <div class="bazar-account-empty bazar-account-messages-empty">
          <span class="bazar-account-empty__icon">${icon('messages')}</span>
          <h2>У вас ще немає повідомлень</h2>
          <p>Тут зʼявлятимуться повідомлення від BAZAR, продавців та підтримки.</p>
          <a class="bazar-account-button bazar-account-button--primary" href="/collections">До каталогу</a>
        </div>
      `;
    }

    renderNoChatSelected() {
      return `
        <div class="bazar-account-conversation-empty">
          <span class="bazar-account-empty__icon">${icon('messages')}</span>
          <h3>Оберіть чат</h3>
          <p>Виберіть діалог зі списку, щоб переглянути повідомлення.</p>
        </div>
      `;
    }

    renderChatItem(chat, selectedId = '') {
      const isActive = String(chat.id) === String(selectedId);
      const unreadCount = Number(chat.unreadCount || 0);

      return `
        <button
          class="bazar-account-chat-item${isActive ? ' is-active' : ''}${unreadCount ? ' has-unread' : ''}"
          type="button"
          data-account-chat-id="${escapeHtml(chat.id)}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        >
          ${this.renderChatAvatar(chat)}
          <span class="bazar-account-chat-item__content">
            <span class="bazar-account-chat-item__title">${escapeHtml(chat.title || 'Чат')}</span>
            <span class="bazar-account-chat-item__preview">${escapeHtml(chat.lastMessage || '')}</span>
          </span>
          <span class="bazar-account-chat-item__meta">
            <span class="bazar-account-chat-item__time">${escapeHtml(chat.time || '')}</span>
            ${unreadCount ? `<span class="bazar-account-chat-item__unread">${unreadCount}</span>` : ''}
          </span>
        </button>
      `;
    }

    renderChatAvatar(chat) {
      return `
        <span class="bazar-account-chat-avatar bazar-account-chat-avatar--${escapeHtml(chat.type || 'system')}">
          ${icon(chat.avatarIcon || 'messages')}
          ${chat.pinned ? `<span class="bazar-account-chat-avatar__pin" aria-label="Закріплено">${icon('pin')}</span>` : ''}
        </span>
      `;
    }

    renderConversation(chat) {
      const messages = this.providers.messages.list(chat.id);

      return `
        <article class="bazar-account-conversation__panel" aria-label="Діалог ${escapeHtml(chat.title || '')}">
          <header class="bazar-account-conversation__head">
            <button class="bazar-account-icon-button bazar-account-conversation__back" type="button" data-account-action="messages-back" aria-label="Назад до чатів">${icon('arrowLeft')}</button>
            ${this.renderChatAvatar(chat)}
            <div>
              <h3>${escapeHtml(chat.title || 'Чат')}</h3>
              <p>${escapeHtml(chat.label || 'Повідомлення')}</p>
            </div>
          </header>
          <div class="bazar-account-conversation__messages" role="log" aria-live="polite">
            ${this.renderChatMessages(messages)}
          </div>
          ${this.renderConversationInput(chat)}
        </article>
      `;
    }

    renderChatMessages(messages = []) {
      let unreadDividerRendered = false;

      return messages
        .map((message) => {
          const isUnread = Boolean(message.unread);
          const divider = isUnread && !unreadDividerRendered ? '<div class="bazar-account-message-divider">Нові повідомлення</div>' : '';
          if (isUnread) unreadDividerRendered = true;

          return `
            ${divider}
            <div class="bazar-account-message-bubble bazar-account-message-bubble--${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}">
              <p>${escapeHtml(message.text || '')}</p>
              <time>${escapeHtml(message.time || '')}</time>
            </div>
          `;
        })
        .join('');
    }

    renderConversationInput(chat) {
      if (chat.canReply === false) {
        return `
          <div class="bazar-account-conversation__disabled">
            На це повідомлення не можна відповісти
          </div>
        `;
      }

      return `
        <form class="bazar-account-message-form" data-account-form="message">
          <button class="bazar-account-icon-button" type="button" aria-label="Додати файл">${icon('paperclip')}</button>
          <label class="bazar-account-visually-hidden" for="BazarAccountMessageInput">Повідомлення</label>
          <input id="BazarAccountMessageInput" name="message" type="text" autocomplete="off" placeholder="Напишіть повідомлення..." required>
          <button class="bazar-account-button bazar-account-button--primary" type="submit" aria-label="Надіслати повідомлення">${icon('send')}</button>
        </form>
      `;
    }

    renderMessageContextMenu() {
      const menu = this.state.messageContextMenu;
      if (!menu) return '';

      const chat = this.providers.chats.get(menu.chatId);
      if (!chat) return '';

      return `
        <div
          class="bazar-account-message-menu"
          data-account-message-menu
          style="left: ${Number(menu.x || 12)}px; top: ${Number(menu.y || 12)}px;"
          role="menu"
          aria-label="Дії з чатом"
        >
          <button type="button" role="menuitem" data-account-message-menu-action="${chat.pinned ? 'unpin' : 'pin'}" data-chat-id="${escapeHtml(chat.id)}">
            ${icon('pin')}
            ${chat.pinned ? 'Відкріпити чат' : 'Закріпити чат'}
          </button>
          <button type="button" role="menuitem" data-account-message-menu-action="read" data-chat-id="${escapeHtml(chat.id)}">
            ${icon('check')}
            Позначити як прочитане
          </button>
          <button class="is-danger" type="button" role="menuitem" data-account-message-menu-action="delete" data-chat-id="${escapeHtml(chat.id)}">
            ${icon('trash')}
            Видалити чат
          </button>
        </div>
      `;
    }

    renderNotifications() {
      const unread = this.providers.notifications.unreadCount();
      const items = this.providers.notifications.list(this.state.notificationCategory);
      const tabs = [
        ['all', 'Усі'],
        ['orders', 'Замовлення'],
        ['discounts', 'Знижки'],
        ['system', 'Система'],
        ['support', 'Підтримка'],
      ];

      return `
        ${pageHead('Центр повідомлень', labels.messages, 'Сповіщення про замовлення, знижки, системні події та підтримку.')}
        <section class="bazar-account-card">
          <div class="bazar-account-card__head">
            <div>
              <h3 class="bazar-account-card__title">Повідомлення${unread ? `<span class="bazar-account-unread-badge">${unread}</span>` : ''}</h3>
              <p class="bazar-account-card__text">Непрочитані повідомлення будуть виділені після інтеграції провайдера.</p>
            </div>
            <button class="bazar-account-button bazar-account-button--secondary" type="button" data-account-action="mark-all-read">Позначити всі як прочитані</button>
          </div>
          <div class="bazar-account-notification-tabs">
            ${tabs.map(([value, label]) => this.renderFilter('notificationCategory', value, label)).join('')}
          </div>
          ${
            items.length
              ? `<div class="bazar-account-list">${items.map((item) => this.renderNotification(item)).join('')}</div>`
              : emptyState('messages', 'Нових повідомлень немає', 'Сповіщення про замовлення, акції та підтримку зʼявляться тут.')
          }
        </section>
      `;
    }

    renderReviews() {
      const reviews = this.providers.reviews.list();
      return `
        ${pageHead('Враження від покупок', labels.reviews, 'Редагуйте оцінки, видаляйте відгуки та готуйте фото-додатки для майбутньої інтеграції.')}
        <section class="bazar-account-card">
          ${
            reviews.length
              ? `<div class="bazar-account-list">${reviews.map((review) => this.renderReview(review)).join('')}</div>`
              : emptyState('reviews', 'Відгуків ще немає', 'Після покупки товарів тут можна буде оцінити досвід і додати фото.')
          }
          <div class="bazar-account-panel" style="margin-top: 16px;">
            <h3 class="bazar-account-panel__title">Шаблон майбутнього відгуку</h3>
            <p class="bazar-account-panel__text">Оцінка: <span class="bazar-account-stars">★★★★★</span></p>
            <p class="bazar-account-panel__text">Фото-додатки: місце для майбутнього завантаження.</p>
          </div>
        </section>
      `;
    }

    renderProfile() {
      const profile = this.providers.account.getProfile();
      const initials = `${profile.firstName || ''}${profile.lastName || ''}`.trim().slice(0, 2).toUpperCase() || 'B';
      return `
        ${pageHead('Профіль', labels.profile, 'Оновіть персональні дані для швидшого оформлення замовлень.')}
        <section class="bazar-account-card">
          <div class="bazar-account-profile-layout">
            <aside>
              <div class="bazar-account-profile-avatar" aria-label="Аватар профілю">${escapeHtml(initials)}</div>
              <p class="bazar-account-card__text" style="margin-top: 12px;">Аватар буде синхронізований після майбутнього оновлення профілю.</p>
            </aside>
            <form class="bazar-account-form-grid" data-account-form="profile">
              <label class="bazar-account-field">
                <span>Ім'я</span>
                <input name="firstName" value="${escapeHtml(profile.firstName || '')}" autocomplete="given-name">
              </label>
              <label class="bazar-account-field">
                <span>Прізвище</span>
                <input name="lastName" value="${escapeHtml(profile.lastName || '')}" autocomplete="family-name">
              </label>
              <label class="bazar-account-field">
                <span>Телефон</span>
                <input name="phone" value="${escapeHtml(profile.phone || '')}" autocomplete="tel">
              </label>
              <label class="bazar-account-field">
                <span>Електронна пошта</span>
                <input name="email" type="email" value="${escapeHtml(profile.email || '')}" autocomplete="email">
              </label>
              <label class="bazar-account-field">
                <span>Дата народження</span>
                <input name="birthday" type="date" value="${escapeHtml(profile.birthday || '')}">
              </label>
              <label class="bazar-account-field">
                <span>Стать</span>
                <select name="gender">
                  ${this.option('', 'Не вказано', profile.gender || '')}
                  ${this.option('female', 'Жіноча', profile.gender || '')}
                  ${this.option('male', 'Чоловіча', profile.gender || '')}
                  ${this.option('other', 'Інше', profile.gender || '')}
                </select>
              </label>
              <div class="bazar-account-form-actions">
                <button class="bazar-account-button bazar-account-button--primary" type="submit">Зберегти</button>
                ${this.state.profileSaved ? '<span class="bazar-account-pill bazar-account-pill--green">Зміни збережено локально</span>' : ''}
              </div>
            </form>
          </div>
        </section>
      `;
    }

    renderAddresses() {
      const addresses = this.providers.addresses.list();
      return `
        ${pageHead('Доставка', labels.addresses, 'Керуйте кількома адресами, типами доставки та адресою за замовчуванням.', '<button class="bazar-account-button bazar-account-button--primary" type="button">' + icon('plus') + 'Додати адресу</button>')}
        ${
          addresses.length
            ? `<section class="bazar-account-address-grid">${addresses.map((address) => this.renderAddress(address)).join('')}</section>`
            : emptyState('address', 'Адрес ще немає', 'Додайте адресу Нової Пошти, Укрпошти або курʼєрської доставки.')
        }
        <section class="bazar-account-panel" style="margin-top: 18px;">
          <h3 class="bazar-account-panel__title">Валідація адреси</h3>
          <p class="bazar-account-panel__text">Перевірка відділень, індексів і курʼєрських зон буде підключена на наступному етапі.</p>
        </section>
      `;
    }

    renderPayments() {
      const savedCards = this.providers.payments.list();
      return `
        ${pageHead('Оплата', labels.payments, 'Керуйте способами оплати, збереженими картками та основним методом оплати.')}
        <section class="bazar-account-payment-grid">
          ${this.renderPaymentPlaceholder('Apple Pay', 'Готово до підключення')}
          ${this.renderPaymentPlaceholder('Google Pay', 'Готово до підключення')}
          ${this.renderPaymentPlaceholder('Visa', 'Збережені картки')}
          ${this.renderPaymentPlaceholder('Mastercard', 'Картка за замовчуванням')}
        </section>
        <section class="bazar-account-card" style="margin-top: 18px;">
          ${
            savedCards.length
              ? `<div class="bazar-account-list">${savedCards.map((card) => this.renderSavedCard(card)).join('')}</div>`
              : emptyState('payment', 'Збережених карток немає', 'Платіжні методи будуть додані після підключення безпечного платіжного провайдера.')
          }
        </section>
      `;
    }

    renderSupport() {
      const tickets = this.providers.support.list();
      const views = [
        ['tickets', 'Звернення'],
        ['new', 'Нове звернення'],
        ['faq', 'Питання'],
        ['contacts', 'Контакти'],
      ];

      return `
        ${pageHead('Допомога', labels.support, 'Створюйте звернення, переглядайте статуси, відкривайте чат або швидко переходьте в Telegram.')}
        <section class="bazar-account-card">
          <div class="bazar-account-support-tabs">
            ${views.map(([value, label]) => `<button class="bazar-account-filter ${this.state.supportView === value ? 'is-active' : ''}" type="button" data-account-action="support-view" data-view="${value}">${label}</button>`).join('')}
          </div>
          ${this.renderSupportView(tickets)}
        </section>
      `;
    }

    renderSupportView(tickets) {
      if (this.state.supportView === 'new') {
        return `
          <form class="bazar-account-form-grid" data-account-form="support">
            <label class="bazar-account-field">
              <span>Тема</span>
              <input placeholder="Наприклад, питання щодо доставки">
            </label>
            <label class="bazar-account-field">
              <span>Категорія</span>
              <select>
                <option>Замовлення</option>
                <option>Оплата</option>
                <option>Повернення</option>
                <option>Інше</option>
              </select>
            </label>
            <label class="bazar-account-field bazar-account-field--full">
              <span>Повідомлення</span>
              <textarea placeholder="Опишіть ситуацію"></textarea>
            </label>
            <div class="bazar-account-form-actions">
              <button class="bazar-account-button bazar-account-button--primary" type="submit">Створити звернення</button>
              <span class="bazar-account-pill bazar-account-pill--blue">Чат буде доступний</span>
            </div>
          </form>
        `;
      }

      if (this.state.supportView === 'faq') {
        return `
          <div class="bazar-account-support-grid">
            ${this.renderInfoCard('Як відстежити замовлення?', 'Відкрийте деталі замовлення та натисніть “Відстежити”.')}
            ${this.renderInfoCard('Як оформити повернення?', 'Створіть звернення у підтримку або відкрийте розділ “Повернення товару”.')}
            ${this.renderInfoCard('Як змінити адресу?', 'Додайте нову адресу в розділі “Улюблені адреси” та зробіть її основною.')}
            ${this.renderInfoCard('Коли відповідає підтримка?', 'Щодня з 9:00 до 21:00.')}
          </div>
        `;
      }

      if (this.state.supportView === 'contacts') {
        return `
          <div class="bazar-account-support-grid">
            ${this.renderInfoCard('Телефон', '0 800 ХХ ХХ ХХХ')}
            ${this.renderInfoCard('Telegram', '@test_baraz_support')}
            ${this.renderInfoCard('Електронна пошта', 'bazar-test-support@test.ua')}
            ${this.renderInfoCard('Графік', 'Щодня з 9:00 до 21:00')}
          </div>
          <div class="bazar-account-form-actions">
            <a class="bazar-account-button bazar-account-button--primary" href="https://t.me/test_baraz_support">Відкрити Telegram</a>
          </div>
        `;
      }

      const statuses = ['Відкрито', 'Очікує', 'Відповідь', 'Закрито'];
      return `
        <div class="bazar-account-filter-group" aria-label="Статуси звернень">
          ${statuses.map((status) => `<span class="bazar-account-pill bazar-account-pill--blue">${status}</span>`).join('')}
        </div>
        <div style="margin-top: 16px;">
          ${
            tickets.length
              ? `<div class="bazar-account-list">${tickets.map((ticket) => this.renderTicket(ticket)).join('')}</div>`
              : emptyState('support', 'Звернень ще немає', 'Якщо потрібна допомога, створіть звернення або напишіть у Telegram.')
          }
        </div>
      `;
    }

    renderFilter(stateKey, value, label) {
      const active = this.state[stateKey] === value;
      return `
        <button
          class="bazar-account-filter ${active ? 'is-active' : ''}"
          type="button"
          data-account-state="${stateKey}"
          value="${escapeHtml(value)}"
          aria-pressed="${active ? 'true' : 'false'}"
        >${escapeHtml(label)}</button>
      `;
    }

    option(value, label, current) {
      return `<option value="${escapeHtml(value)}" ${String(value) === String(current) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }

    renderWishlistGrid(items, hasMore) {
      return `
        <div class="bazar-account-wishlist-grid">
          ${items.map((item) => this.renderWishlistCard(item)).join('')}
        </div>
        ${
          hasMore
            ? `<div class="bazar-account-wishlist-more">
                <button class="bazar-account-button bazar-account-button--secondary" type="button" data-account-action="wishlist-show-more">Переглянути всі</button>
              </div>`
            : ''
        }
      `;
    }

    renderWishlistEmpty() {
      return emptyState(
        'heart',
        'У вас ще немає обраних товарів',
        'Додавайте товари в обране, щоб швидко повернутися до них пізніше.',
        '<a class="bazar-account-button bazar-account-button--primary" href="/collections">До каталогу</a>'
      );
    }

    renderWishlistCard(item) {
      const id = String(item.id || item.handle || '');
      const title = item.title || 'Товар';
      const price = item.price || (item.priceValue ? formatMoneyLabel(item.priceValue) : '');

      return `
        <article class="bazar-account-wishlist-card is-in-wishlist" data-wishlist-card>
          <div class="bazar-account-wishlist-card__media">
            ${this.renderWishlistVisual(item, title)}
            <button
              class="bazar-account-wishlist-card__heart"
              type="button"
              data-account-action="wishlist-remove"
              data-id="${escapeHtml(id)}"
              aria-label="Прибрати з обраного"
              aria-pressed="true"
            >
              ${icon('heartFilled')}
            </button>
          </div>
          <div class="bazar-account-wishlist-card__body">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(price)}</p>
          </div>
          <button
            class="bazar-account-button bazar-account-button--primary bazar-account-wishlist-card__button"
            type="button"
            data-account-action="wishlist-add-cart"
            data-id="${escapeHtml(id)}"
          >
            ${icon('cart')}У кошик
          </button>
        </article>
      `;
    }

    renderWishlistVisual(item, title) {
      if (item.image) {
        return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(title)}" loading="lazy">`;
      }

      return `<span class="bazar-account-wishlist-card__fallback" aria-hidden="true">${icon(item.visual || 'box')}</span>`;
    }

    renderNotification(item) {
      return `
        <article class="bazar-account-row-card">
          <div>
            <h3 class="bazar-account-row-card__title">${escapeHtml(item.title || 'Повідомлення')}</h3>
            <p class="bazar-account-muted">${escapeHtml(item.text || '')}</p>
          </div>
          ${item.unread ? '<span class="bazar-account-pill bazar-account-pill--orange">Нове</span>' : '<span class="bazar-account-pill">Прочитано</span>'}
        </article>
      `;
    }

    renderReview(review) {
      const stars = '★★★★★'.slice(0, Number(review.rating || 0));
      const isEditing = String(this.state.editingReviewId) === String(review.id || '');
      return `
        <article class="bazar-account-row-card">
          <div>
            <h3 class="bazar-account-row-card__title">${escapeHtml(review.productTitle || 'Товар')}</h3>
            <p class="bazar-account-stars">${stars}</p>
            ${
              isEditing
                ? `<label class="bazar-account-field"><span>Текст відгуку</span><textarea>${escapeHtml(review.text || '')}</textarea></label><p class="bazar-account-muted">Фото-додатки: місце для майбутнього завантаження.</p>`
                : `<p class="bazar-account-muted">${escapeHtml(review.text || '')}</p>`
            }
          </div>
          <div class="bazar-account-form-actions">
            ${
              isEditing
                ? '<button class="bazar-account-button bazar-account-button--primary" type="button" data-account-action="review-save">Зберегти</button><button class="bazar-account-button bazar-account-button--ghost" type="button" data-account-action="review-cancel">Скасувати</button>'
                : `<button class="bazar-account-icon-button" type="button" data-account-action="review-edit" data-id="${escapeHtml(review.id || '')}" aria-label="Редагувати">${icon('edit')}</button>`
            }
            <button class="bazar-account-icon-button" type="button" data-account-action="review-delete" data-id="${escapeHtml(review.id || '')}" aria-label="Видалити">${icon('trash')}</button>
          </div>
        </article>
      `;
    }

    renderAddress(address) {
      return `
        <article class="bazar-account-card">
          <div class="bazar-account-card__head">
            <span class="bazar-account-card__icon">${icon('address')}</span>
            ${address.isDefault ? '<span class="bazar-account-pill bazar-account-pill--green">Основна</span>' : '<span class="bazar-account-pill">Додаткова</span>'}
          </div>
          <h3 class="bazar-account-card__title">${escapeHtml(address.name || 'Адреса доставки')}</h3>
          <p class="bazar-account-card__text">${escapeHtml(address.formatted || [address.city, address.address1, address.address2].filter(Boolean).join(', ') || 'Адресу потрібно уточнити')}</p>
          <div class="bazar-account-order-card__meta">
            <span class="bazar-account-pill bazar-account-pill--blue">${escapeHtml(address.deliveryType || 'Нова Пошта')}</span>
            <span class="bazar-account-pill">Укрпошта</span>
            <span class="bazar-account-pill">Курʼєр</span>
          </div>
        </article>
      `;
    }

    renderPaymentPlaceholder(title, text) {
      return `
        <article class="bazar-account-card">
          <div class="bazar-account-card__head">
            <span class="bazar-account-payment-brand">${escapeHtml(title)}</span>
          <span class="bazar-account-pill bazar-account-pill--blue">Майбутнє</span>
          </div>
          <h3 class="bazar-account-card__title">${escapeHtml(title)}</h3>
          <p class="bazar-account-card__text">${escapeHtml(text)}</p>
        </article>
      `;
    }

    renderSavedCard(card) {
      return `
        <article class="bazar-account-row-card">
          <div>
            <h3 class="bazar-account-row-card__title">${escapeHtml(card.brand || 'Картка')}</h3>
            <p class="bazar-account-muted">•••• ${escapeHtml(card.last4 || '')}</p>
          </div>
          ${card.isDefault ? '<span class="bazar-account-pill bazar-account-pill--green">За замовчуванням</span>' : '<span class="bazar-account-pill">Збережено</span>'}
        </article>
      `;
    }

    renderTicket(ticket) {
      return `
        <article class="bazar-account-row-card">
          <div>
            <h3 class="bazar-account-row-card__title">${escapeHtml(ticket.title || 'Звернення')}</h3>
            <p class="bazar-account-muted">${escapeHtml(ticket.lastMessage || '')}</p>
          </div>
          <span class="bazar-account-pill bazar-account-pill--blue">${escapeHtml(ticket.status || 'Відкрито')}</span>
        </article>
      `;
    }

    renderInfoCard(title, text) {
      return `
        <article class="bazar-account-card">
          <h3 class="bazar-account-card__title">${escapeHtml(title)}</h3>
          <p class="bazar-account-card__text">${escapeHtml(text)}</p>
        </article>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTOR).forEach((root) => {
      if (root.dataset.bazarAccountReady === 'true') return;
      root.dataset.bazarAccountReady = 'true';
      new BazarAccountModule(root).init();
    });
  });
})();
