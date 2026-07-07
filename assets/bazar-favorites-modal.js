(function () {
  const SELECTOR = '[data-bazar-favorites-modal]';

  const icon = (name) => {
    const paths = {
      box: '<path d="m4 7 8-4 8 4-8 4-8-4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/><path d="M4 7v10l8 4 8-4V7M12 11v10" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/>',
      cart: '<path d="M4 5h2l2 11h9l2-8H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><circle cx="10" cy="20" r="1.2" fill="currentColor"/><circle cx="17" cy="20" r="1.2" fill="currentColor"/>',
      heart: '<path d="M20.2 5.1a5.4 5.4 0 0 0-7.6 0l-.6.6-.6-.6a5.4 5.4 0 0 0-7.6 7.6L12 20.9l8.2-8.2a5.4 5.4 0 0 0 0-7.6Z" fill="currentColor"/>',
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

  const formatMoneyLabel = (value) => `${new Intl.NumberFormat('uk-UA').format(Math.round(value))} грн`;

  const getItemId = (item = {}) => String(item.id || item.handle || item.productHandle || item.url || '');

  const normalizeCartVariantId = (variantId = '') => {
    const raw = String(variantId || '').trim();
    const match = raw.match(/(\d+)$/);
    return match?.[1] || '';
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

  const updateHeaderCartCount = (itemCount) => {
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
  };

  const fetchWishlistVariantId = async (item) => {
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
  };

  class BazarFavoritesModal {
    constructor(modal) {
      this.modal = modal;
      this.dialog = modal.querySelector('.bazar-favorites-modal__dialog');
      this.content = modal.querySelector('[data-bazar-favorites-content]');
      this.footer = modal.querySelector('.bazar-favorites-modal__footer');
      this.scrollPanel = modal.querySelector('.bazar-favorites-modal__body');
      this.openers = document.querySelectorAll('[data-bazar-favorites-open]');
      this.lastActiveElement = null;
      this.scrollLock = null;
      this.touchY = 0;
      this.unsubscribe = null;
    }

    init() {
      if (this.modal.parentElement !== document.body) {
        document.body.appendChild(this.modal);
      }

      this.openers.forEach((opener) => {
        opener.addEventListener('click', (event) => {
          event.preventDefault();
          this.open(opener);
        });
      });

      this.modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-bazar-favorites-close]')) this.close();

        const removeButton = event.target.closest('[data-bazar-favorites-remove]');
        if (removeButton) {
          this.removeItem(removeButton.dataset.id, removeButton);
          return;
        }

        const cartButton = event.target.closest('[data-bazar-favorites-cart]');
        if (cartButton) this.addToCart(cartButton.dataset.id, cartButton);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen()) this.close();
      });

      this.modal.addEventListener('wheel', (event) => this.trapScroll(event, event.deltaY), { passive: false });
      this.modal.addEventListener(
        'touchstart',
        (event) => {
          this.touchY = event.touches?.[0]?.clientY || 0;
        },
        { passive: true }
      );
      this.modal.addEventListener(
        'touchmove',
        (event) => {
          const currentY = event.touches?.[0]?.clientY || this.touchY;
          const deltaY = this.touchY - currentY;
          this.touchY = currentY;
          this.trapScroll(event, deltaY);
        },
        { passive: false }
      );

      this.unsubscribe = window.BazarWishlistStore?.subscribe(() => {
        this.updateHeaderCount();
        if (this.isOpen()) this.render();
      });

      this.updateHeaderCount();
    }

    isOpen() {
      return !this.modal.hidden;
    }

    open(opener) {
      this.lastActiveElement = opener || document.activeElement;
      this.render();
      this.modal.hidden = false;
      this.lockPageScroll();
      this.openers.forEach((item) => item.setAttribute('aria-expanded', 'true'));
      window.requestAnimationFrame(() => this.dialog?.focus({ preventScroll: true }));
    }

    close() {
      this.modal.hidden = true;
      this.unlockPageScroll();
      this.openers.forEach((item) => item.setAttribute('aria-expanded', 'false'));
      this.lastActiveElement?.focus?.({ preventScroll: true });
    }

    getItems() {
      return window.BazarWishlistStore?.list() || [];
    }

    updateHeaderCount() {
      const count = window.BazarWishlistStore?.count() || 0;

      this.openers.forEach((opener) => {
        let badge = opener.querySelector('.bazar-header-action__badge');

        if (count > 0 && !badge) {
          badge = document.createElement('span');
          badge.className = 'bazar-header-action__badge';
          opener.appendChild(badge);
        }

        if (badge) {
          badge.textContent = String(count);
          badge.hidden = count <= 0;
        }

        opener.setAttribute('aria-label', count > 0 ? `Обране: ${count}` : 'Обране');
      });
    }

    render() {
      const items = this.getItems();
      const hasItems = items.length > 0;

      if (this.footer) this.footer.hidden = !hasItems;
      if (this.scrollPanel) this.scrollPanel.scrollTop = 0;

      this.content.innerHTML = hasItems ? this.renderGrid(items.slice(0, 8)) : this.renderEmpty();
    }

    renderGrid(items) {
      return `
        <div class="bazar-favorites-modal__grid">
          ${items.map((item) => this.renderCard(item)).join('')}
        </div>
      `;
    }

    renderEmpty() {
      return `
        <div class="bazar-favorites-modal__empty">
          <span class="bazar-favorites-modal__empty-icon">${icon('heart')}</span>
          <h3>У вас ще немає обраних товарів</h3>
          <p>Додавайте товари в обране, щоб швидко повернутися до них пізніше.</p>
          <a class="bazar-favorites-modal__empty-button" href="/collections">До каталогу</a>
        </div>
      `;
    }

    renderCard(item) {
      const id = getItemId(item);
      const title = item.title || 'Товар';
      const price = item.price || (item.priceValue ? formatMoneyLabel(item.priceValue) : '');

      return `
        <article class="bazar-favorites-card" data-bazar-favorites-card>
          <div class="bazar-favorites-card__media">
            ${this.renderVisual(item, title)}
          </div>
          <div class="bazar-favorites-card__body">
            <h3 class="bazar-favorites-card__title">${escapeHtml(title)}</h3>
            <p class="bazar-favorites-card__price">${escapeHtml(price)}</p>
          </div>
          <div class="bazar-favorites-card__actions">
            <button class="bazar-favorites-card__action" type="button" data-bazar-favorites-remove data-id="${escapeHtml(id)}" aria-label="Прибрати з обраного" aria-pressed="true">${icon('heart')}</button>
            <button class="bazar-favorites-card__action" type="button" data-bazar-favorites-cart data-id="${escapeHtml(id)}" aria-label="Додати в кошик">${icon('cart')}</button>
          </div>
        </article>
      `;
    }

    renderVisual(item, title) {
      if (item.image) {
        return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(title)}" loading="lazy">`;
      }

      return `<span class="bazar-favorites-card__fallback" aria-hidden="true">${icon('box')}</span>`;
    }

    trapScroll(event, deltaY) {
      if (!this.isOpen()) return;

      const panel = event.target.closest('.bazar-favorites-modal__body');

      if (!panel) {
        event.preventDefault();
        return;
      }

      const maxScroll = panel.scrollHeight - panel.clientHeight;

      if (maxScroll <= 0) {
        event.preventDefault();
        return;
      }

      const nextScroll = panel.scrollTop + deltaY;

      if (nextScroll < 0 || nextScroll > maxScroll) {
        event.preventDefault();
      }

      event.stopPropagation();
    }

    lockPageScroll() {
      if (this.scrollLock) return;

      const root = document.documentElement;
      const body = document.body;
      const scrollY = window.scrollY || root.scrollTop || 0;
      const scrollbarWidth = window.innerWidth - root.clientWidth;

      this.scrollLock = {
        scrollY,
        rootOverflow: root.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyLeft: body.style.left,
        bodyRight: body.style.right,
        bodyWidth: body.style.width,
        bodyPaddingRight: body.style.paddingRight,
      };

      root.classList.add('bazar-favorites-scroll-lock');
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    unlockPageScroll() {
      if (!this.scrollLock) return;

      const root = document.documentElement;
      const body = document.body;
      const { scrollY } = this.scrollLock;

      root.classList.remove('bazar-favorites-scroll-lock');
      root.style.overflow = this.scrollLock.rootOverflow;
      body.style.overflow = this.scrollLock.bodyOverflow;
      body.style.position = this.scrollLock.bodyPosition;
      body.style.top = this.scrollLock.bodyTop;
      body.style.left = this.scrollLock.bodyLeft;
      body.style.right = this.scrollLock.bodyRight;
      body.style.width = this.scrollLock.bodyWidth;
      body.style.paddingRight = this.scrollLock.bodyPaddingRight;

      this.scrollLock = null;
      window.scrollTo(0, scrollY);
    }

    removeItem(id, button) {
      const card = button.closest('[data-bazar-favorites-card]');
      button.setAttribute('aria-pressed', 'false');

      const finish = () => window.BazarWishlistStore?.remove(id);

      if (!card) {
        finish();
        return;
      }

      card.classList.add('is-removing');
      card.addEventListener('animationend', finish, { once: true });
      window.setTimeout(() => {
        if (card.isConnected) finish();
      }, 240);
    }

    async addToCart(id, button) {
      const item = window.BazarWishlistStore?.get(id);
      const variantId = normalizeCartVariantId(getWishlistVariantId(item) || (await fetchWishlistVariantId(item)));

      if (!variantId) {
        window.showToast?.({ type: 'error', message: 'Товар тимчасово недоступний для кошика' });
        return;
      }

      button.disabled = true;
      button.classList.add('is-loading');

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

        updateHeaderCartCount(itemCount);
        window.showToast?.({ type: 'success', message: 'Товар додано в кошик' });
      } catch (_error) {
        window.showToast?.({ type: 'error', message: 'Не вдалося додати товар у кошик' });
      } finally {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  }

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const modal = document.querySelector(SELECTOR);
    if (!modal || !window.BazarWishlistStore) return;

    new BazarFavoritesModal(modal).init();
  });
})();
