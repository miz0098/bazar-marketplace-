(() => {
  const SELECTOR = '[data-bazar-account-module]';
  const ROUTES = [
    '/account',
    '/account/orders',
    '/account/wishlist',
    '/account/messages',
    '/account/reviews',
    '/account/profile',
    '/account/addresses',
    '/account/payment-methods',
    '/account/support',
  ];
  const ANIMATION_DURATION = 190;
  const PAGE_SIZE = 5;

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
      heart: '<path d="M20.2 5.1a5.4 5.4 0 0 0-7.6 0l-.6.6-.6-.6a5.4 5.4 0 0 0-7.6 7.6L12 20.9l8.2-8.2a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      box: '<path d="m4 7 8-4 8 4-8 4-8-4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M4 7v10l8 4 8-4V7M12 11v10" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>',
      cart: '<path d="M4 5h2l2 11h9l2-8H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><circle cx="10" cy="20" r="1.2" fill="currentColor"/><circle cx="17" cy="20" r="1.2" fill="currentColor"/>',
      edit: '<path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="m14.5 6 3.5 3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      phone: '<path d="M7 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 17h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>',
      warning: '<path d="M12 4 3 20h18L12 4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M12 10v4M12 17h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.2"/>',
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
    const clean = (path || '/account').replace(/\/$/, '');
    if (clean === '' || clean === '/account') return '/account';
    if (clean.startsWith('/account/orders/')) return clean;
    return ROUTES.includes(clean) ? clean : '/account';
  };

  const routeLabel = (route) => {
    if (route.startsWith('/account/orders/')) return 'Деталі замовлення';
    if (route === '/account/orders') return labels.orders;
    if (route === '/account/wishlist') return labels.wishlist;
    if (route === '/account/messages') return labels.messages;
    if (route === '/account/reviews') return labels.reviews;
    if (route === '/account/profile') return labels.profile;
    if (route === '/account/addresses') return labels.addresses;
    if (route === '/account/payment-methods') return labels.payments;
    if (route === '/account/support') return labels.support;
    return labels.overview;
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
      return this.orders.find((order) => String(order.id) === String(id) || String(order.name) === String(id));
    }
  }

  class WishlistProvider {
    constructor(data) {
      // TODO: Replace Shopify implementation with api.bazar.
      this.items = data.wishlist || [];
    }

    list({ search = '', sort = 'newest' } = {}) {
      const query = search.trim().toLowerCase();
      return this.items
        .filter((item) => !query || `${item.title || ''} ${item.vendor || ''}`.toLowerCase().includes(query))
        .sort((a, b) => {
          if (sort === 'price-high') return Number(b.priceValue || 0) - Number(a.priceValue || 0);
          if (sort === 'price-low') return Number(a.priceValue || 0) - Number(b.priceValue || 0);
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
    }

    remove(id) {
      this.items = this.items.filter((item) => String(item.id) !== String(id));
    }

    bulkRemove(ids) {
      this.items = this.items.filter((item) => !ids.includes(String(item.id)));
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
      this.content = root.querySelector('[data-account-content]');
      this.sidebar = root.querySelector('[data-account-sidebar]');
      this.sidebarToggle = root.querySelector('[data-account-sidebar-open]');
      this.sidebarBackdrop = root.querySelector('[data-account-sidebar-backdrop]');
      this.data = readProviderData();
      this.providers = {
        account: new AccountProvider(this.data),
        orders: new OrderProvider(this.data),
        wishlist: new WishlistProvider(this.data),
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
        notificationCategory: 'all',
        selectedWishlist: [],
        supportView: 'tickets',
        editingReviewId: '',
        profileSaved: false,
        error: Boolean(this.data.providerError),
      };
    }

    init() {
      this.bindEvents();
      this.render(true);
    }

    bindEvents() {
      this.root.addEventListener('click', (event) => this.handleClick(event));
      this.root.addEventListener('input', (event) => this.handleInput(event));
      this.root.addEventListener('change', (event) => this.handleChange(event));
      this.root.addEventListener('submit', (event) => this.handleSubmit(event));
      window.addEventListener('popstate', () => {
        this.state.route = normalizeRoute(window.location.pathname);
        this.render(true, false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.closeSidebar();
      });
    }

    handleClick(event) {
      const routeLink = event.target.closest('[data-account-route]');
      if (routeLink && this.root.contains(routeLink)) {
        event.preventDefault();
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
        this.providers.account.saveProfile({
          firstName: formData.get('firstName') || '',
          lastName: formData.get('lastName') || '',
          phone: formData.get('phone') || '',
          email: formData.get('email') || '',
          birthday: formData.get('birthday') || '',
          gender: formData.get('gender') || '',
        });
        this.state.profileSaved = true;
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

      if (action === 'mark-all-read') {
        this.providers.notifications.markAllRead();
        this.render(false, false);
      }

      if (action === 'wishlist-remove') {
        this.providers.wishlist.remove(element.dataset.id);
        this.render(false, false);
      }

      if (action === 'wishlist-bulk-remove') {
        this.providers.wishlist.bulkRemove(this.state.selectedWishlist);
        this.state.selectedWishlist = [];
        this.render(false, false);
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
          (route === '/account/orders' && this.state.route.startsWith('/account/orders/'));
        item.classList.toggle('is-active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    }

    renderRoute() {
      const route = this.state.route;
      if (route.startsWith('/account/orders/')) return this.renderOrderDetails(route.split('/').pop());
      if (route === '/account/orders') return this.renderOrders();
      if (route === '/account/wishlist') return this.renderWishlist();
      if (route === '/account/messages') return this.renderNotifications();
      if (route === '/account/reviews') return this.renderReviews();
      if (route === '/account/profile') return this.renderProfile();
      if (route === '/account/addresses') return this.renderAddresses();
      if (route === '/account/payment-methods') return this.renderPayments();
      if (route === '/account/support') return this.renderSupport();
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
          ${statCard('/account/orders', 'orders', String(this.providers.orders.orders.length), 'Замовлення')}
          ${statCard('/account/orders', 'pending', String(pending.length), 'Очікують')}
          ${statCard('/account/messages', 'messages', String(unreadMessages), 'Повідомлення')}
          ${statCard('/account/reviews', 'reviews', String(reviews.length), 'Відгуки')}
        </section>
        <div class="bazar-account-section-grid">
          <section class="bazar-account-card">
            <div class="bazar-account-card__head">
              <div>
                <h3 class="bazar-account-card__title">Останні замовлення</h3>
                <p class="bazar-account-card__text">Швидкий доступ до історії покупок.</p>
              </div>
              <a class="bazar-account-button bazar-account-button--secondary" href="/account/orders" data-account-route="/account/orders">Усі замовлення</a>
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
              <a class="bazar-account-button bazar-account-button--primary" href="/account/profile" data-account-route="/account/profile">Редагувати</a>
              <a class="bazar-account-button bazar-account-button--ghost" href="/account/addresses" data-account-route="/account/addresses">Адреси</a>
            </div>
          </aside>
        </div>
      `;
    }

    renderOrders() {
      const result = this.providers.orders.list({
        filter: this.state.orderFilter,
        search: this.state.orderSearch,
        sort: this.state.orderSort,
        page: this.state.orderPage,
      });

      return `
        ${pageHead('Покупки', labels.orders, 'Фільтруйте, шукайте та відкривайте деталі кожного замовлення.')}
        <section class="bazar-account-card">
          <div class="bazar-account-toolbar">
            <div class="bazar-account-filter-group" role="group" aria-label="Фільтр замовлень">
              ${this.renderFilter('orderFilter', 'today', 'Сьогодні')}
              ${this.renderFilter('orderFilter', '7', 'Останні 7 днів')}
              ${this.renderFilter('orderFilter', '30', 'Останні 30 днів')}
              ${this.renderFilter('orderFilter', 'year', 'Цей рік')}
              ${this.renderFilter('orderFilter', 'all', 'Усі')}
            </div>
            <label class="bazar-account-field">
              <span>Пошук замовлень</span>
              <input type="search" value="${escapeHtml(this.state.orderSearch)}" data-account-state="orderSearch" placeholder="Номер або сума">
            </label>
            <label class="bazar-account-field">
              <span>Сортування</span>
              <select data-account-state="orderSort">
                ${this.option('newest', 'Новіші спочатку', this.state.orderSort)}
                ${this.option('oldest', 'Старіші спочатку', this.state.orderSort)}
                ${this.option('highest', 'Найвища сума', this.state.orderSort)}
                ${this.option('lowest', 'Найнижча сума', this.state.orderSort)}
              </select>
            </label>
          </div>
          ${
            result.items.length
              ? `<div class="bazar-account-list">${result.items.map((order) => this.renderOrderCard(order)).join('')}</div>${this.renderPagination(result)}`
              : emptyState('orders', 'Замовлень не знайдено', 'Спробуйте змінити фільтр або пошуковий запит.')
          }
        </section>
      `;
    }

    renderOrderCard(order) {
      const detailRoute = `/account/orders/${encodeURIComponent(order.id || order.name)}`;
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
      const order = this.providers.orders.get(decodeURIComponent(encodedId));
      if (!order) {
        return `
          ${pageHead('Замовлення', 'Замовлення не знайдено', 'Можливо, воно було оновлене або недоступне для поточної сесії.')}
          ${emptyState('orders', 'Немає даних замовлення', 'Поверніться до списку замовлень і спробуйте ще раз.', '<a class="bazar-account-button bazar-account-button--primary" href="/account/orders" data-account-route="/account/orders">До замовлень</a>')}
        `;
      }

      return `
        ${pageHead(
          'Деталі замовлення',
          order.name || `Замовлення ${order.orderNumber || ''}`,
          'Статус, оплата, доставка, товари та дії за замовленням.',
          '<a class="bazar-account-button bazar-account-button--ghost" href="/account/orders" data-account-route="/account/orders">Назад</a>'
        )}
        <div class="bazar-account-detail-grid">
          <section class="bazar-account-card">
            <div class="bazar-account-card__head">
              <div>
                <h3 class="bazar-account-card__title">Товари</h3>
                <p class="bazar-account-card__text">Дані замовлення готові до майбутнього оновлення провайдера.</p>
              </div>
              <span class="bazar-account-pill bazar-account-pill--blue">${escapeHtml(order.total || '')}</span>
            </div>
            ${(order.products || []).length ? order.products.map((product) => this.renderProductRow(product)).join('') : emptyState('box', 'Товари недоступні', 'Дані позицій будуть отримані після оновлення провайдера.')}
          </section>
          <aside class="bazar-account-panel">
            <h3 class="bazar-account-panel__title">Статус замовлення</h3>
            <ul class="bazar-account-timeline" aria-label="Таймлайн замовлення">
              ${this.timelineItem('Замовлення створено', order.date || '')}
              ${this.timelineItem('Оплата', localizeStatus(order.financialStatus, 'Очікує оплати'))}
              ${this.timelineItem('Доставка', localizeStatus(order.fulfillmentStatus, 'В обробці'))}
              ${this.timelineItem('Трекінг', order.tracking || 'Очікуємо номер від служби доставки')}
            </ul>
            <div class="bazar-account-form-actions">
              <button class="bazar-account-button bazar-account-button--secondary" type="button">Завантажити рахунок</button>
              <button class="bazar-account-button bazar-account-button--secondary" type="button">Відстежити</button>
              <button class="bazar-account-button bazar-account-button--ghost" type="button">Повторити</button>
              <a class="bazar-account-button bazar-account-button--primary" href="/account/support" data-account-route="/account/support">Підтримка</a>
            </div>
          </aside>
        </div>
      `;
    }

    renderWishlist() {
      const items = this.providers.wishlist.list({
        search: this.state.wishlistSearch,
        sort: this.state.wishlistSort,
      });

      return `
        ${pageHead('Обране', labels.wishlist, 'Збережені товари з можливістю сортування, пошуку, перенесення в кошик і масових дій.')}
        <section class="bazar-account-card">
          <div class="bazar-account-toolbar">
            <label class="bazar-account-field">
              <span>Пошук в обраному</span>
              <input type="search" value="${escapeHtml(this.state.wishlistSearch)}" data-account-state="wishlistSearch" placeholder="Назва товару">
            </label>
            <label class="bazar-account-field">
              <span>Сортування</span>
              <select data-account-state="wishlistSort">
                ${this.option('newest', 'Новіші спочатку', this.state.wishlistSort)}
                ${this.option('price-high', 'Дорожчі спочатку', this.state.wishlistSort)}
                ${this.option('price-low', 'Дешевші спочатку', this.state.wishlistSort)}
              </select>
            </label>
            <button class="bazar-account-button bazar-account-button--danger" type="button" data-account-action="wishlist-bulk-remove">Видалити вибране</button>
          </div>
          ${
            items.length
              ? `<div class="bazar-account-list">${items.map((item) => this.renderWishlistItem(item)).join('')}</div>`
              : emptyState('heart', 'Обране поки порожнє', 'Збережені товари зʼявляться тут після додавання з каталогу.')
          }
        </section>
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

    renderPagination(result) {
      if (result.totalPages <= 1) return '';
      return `
        <nav class="bazar-account-pagination" aria-label="Пагінація замовлень">
          <button class="bazar-account-button bazar-account-button--ghost" type="button" data-account-action="order-page" data-page="${result.page - 1}" ${result.page <= 1 ? 'disabled' : ''}>Назад</button>
          <span class="bazar-account-pill">Сторінка ${result.page} з ${result.totalPages}</span>
          <button class="bazar-account-button bazar-account-button--ghost" type="button" data-account-action="order-page" data-page="${result.page + 1}" ${result.page >= result.totalPages ? 'disabled' : ''}>Далі</button>
        </nav>
      `;
    }

    renderProductRow(product) {
      return `
        <article class="bazar-account-product-row">
          <span class="bazar-account-product-thumb">
            ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title || '')}" loading="lazy">` : icon('box')}
          </span>
          <div>
            <h4 class="bazar-account-row-card__title">${escapeHtml(product.title || 'Товар')}</h4>
            <p class="bazar-account-muted">Кількість: ${escapeHtml(String(product.quantity || 1))}</p>
          </div>
          <strong>${escapeHtml(product.price || '')}</strong>
        </article>
      `;
    }

    timelineItem(title, text) {
      return `
        <li class="bazar-account-timeline__item">
          <span class="bazar-account-timeline__dot" aria-hidden="true"></span>
          <span>
            <strong>${escapeHtml(title)}</strong>
            <span class="bazar-account-muted" style="display: block;">${escapeHtml(text)}</span>
          </span>
        </li>
      `;
    }

    renderWishlistItem(item) {
      const id = String(item.id || item.handle || '');
      return `
        <article class="bazar-account-row-card">
          <label class="bazar-account-field">
            <span>${escapeHtml(item.title || 'Товар')}</span>
            <input type="checkbox" value="${escapeHtml(id)}" data-account-bulk-item>
          </label>
          <div class="bazar-account-form-actions">
            <button class="bazar-account-button bazar-account-button--secondary" type="button">${icon('cart')}До кошика</button>
            <button class="bazar-account-icon-button" type="button" data-account-action="wishlist-remove" data-id="${escapeHtml(id)}" aria-label="Видалити">${icon('trash')}</button>
          </div>
        </article>
      `;
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
