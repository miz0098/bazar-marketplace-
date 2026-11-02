/** BAZAR PDP: native Horizon option-value picker/product form/quantity and cart events remain authoritative. */
import '@theme/product-form';
import '@theme/variant-picker';
import '@theme/component-quantity-selector';
import { StandardEvents } from '@shopify/events';

class BazarProductGallery extends HTMLElement {
  connectedCallback() {
    this.dataset.enhanced = 'true';
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKey);
    this.showMedia(this.dataset.selectedMediaId || this.querySelector('[data-pdp-media]')?.dataset.pdpMedia);
    this.querySelectorAll('[data-pdp-thumb]').forEach(link => link.setAttribute('role', 'button'));
  }
  disconnectedCallback() { this.removeEventListener('click', this.onClick); this.removeEventListener('keydown', this.onKey); }
  showMedia(id) {
    if (![...this.querySelectorAll('[data-pdp-media]')].some(media => media.dataset.pdpMedia === String(id))) return;
    this.querySelectorAll('[data-pdp-media]').forEach(media => {
      const active = media.dataset.pdpMedia === String(id);
      if (!active) {
        media.querySelectorAll('video').forEach(video => video.pause());
        media.querySelectorAll('deferred-media').forEach(player => player.pauseMedia?.());
      }
      media.hidden = !active;
    });
    this.querySelectorAll('[data-pdp-thumb]').forEach(link => {
      const active = link.dataset.pdpThumb === String(id);
      link.setAttribute('aria-pressed', String(active)); link.tabIndex = active ? 0 : -1;
    });
  }
  onClick = event => { const link = event.target.closest('[data-pdp-thumb]'); if (link) { event.preventDefault(); this.showMedia(link.dataset.pdpThumb); } };
  onKey = event => {
    const link = event.target.closest('[data-pdp-thumb]'); if (!link) return;
    const links = [...this.querySelectorAll('[data-pdp-thumb]')]; const index = links.indexOf(link);
    let next;
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % links.length;
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index - 1 + links.length) % links.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = links.length - 1;
    if (event.key === ' ') next = index;
    if (next !== undefined) { event.preventDefault(); this.showMedia(links[next].dataset.pdpThumb); links[next].focus(); }
  };
}
if (!customElements.get('bazar-product-gallery')) customElements.define('bazar-product-gallery', BazarProductGallery);

class BazarProduct extends HTMLElement {
  #generation = 0;
  #controller;
  #cartPending = false;
  #selectionPending = false;
  #uncertain = false;
  #cartError = '';
  connectedCallback() {
    this.#controller = new AbortController(); const options = { signal: this.#controller.signal };
    this.addEventListener(StandardEvents.productSelect, this.onVariant, options);
    this.addEventListener(StandardEvents.cartLinesUpdate, this.onCart, options);
    this.addEventListener(StandardEvents.cartError, event => { this.#cartError = event.error || 'Не вдалося додати товар.'; }, options);
    this.addEventListener('submit', this.guardSubmit, { ...options, capture: true });
    this.querySelector('[data-pdp-retry]')?.addEventListener('click', () => {
      this.querySelector('variant-picker input:checked, variant-picker select')?.dispatchEvent(new Event('change', { bubbles: true }));
    }, options);
    this.initializeTabs();
  }
  disconnectedCallback() { this.#controller.abort(); this.#generation++; }
  get productForm() { return this.querySelector('product-form-component'); }
  get button() { return this.productForm?.querySelector('[ref="addToCartButton"]'); }
  message(text) { this.querySelector('[data-pdp-feedback]').textContent = text; }
  guardSubmit = event => {
    if (!event.target.closest('product-form-component')) return;
    if (this.#cartPending || this.#selectionPending || this.#uncertain || this.productForm?.dataset.pdpCanPurchase !== 'true') {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (!event.target.checkValidity()) { event.preventDefault(); event.stopImmediatePropagation(); event.target.reportValidity(); return; }
    if (typeof this.productForm.handleSubmit === 'function') this.productForm.handleSubmit(event);
  };
  onVariant = async event => {
    if (event.target.closest('product-card')) return;
    const generation = ++this.#generation; this.#selectionPending = true;
    this.button.disabled = true;
    this.productForm.querySelector('[name="id"]').disabled = true;
    this.message('Оновлюємо варіант…');
    this.querySelector('[data-pdp-retry]').hidden = true;
    try {
      const { detail } = await event.promise;
      if (!this.isConnected || generation !== this.#generation) return;
      const source = detail?.html?.querySelector('bazar-product');
      if (!source) throw new Error('No matching product section');
      const newState = source.querySelector('[data-pdp-state]');
      if (!newState) throw new Error('Missing variant state');
      this.querySelector('[data-pdp-state]').replaceWith(newState.cloneNode(true));
      const newForm = source.querySelector('product-form-component');
      const canPurchase = !!detail.resource?.available && newForm?.dataset.pdpCanPurchase === 'true';
      this.productForm.dataset.pdpCanPurchase = String(canPurchase);
      const newPlan = source.querySelector('[data-pdp-plan]'); const currentPlan = this.querySelector('[data-pdp-plan]');
      if (newPlan && currentPlan) currentPlan.replaceWith(newPlan.cloneNode(true));
      const mediaId = source.querySelector('bazar-product-gallery')?.dataset.selectedMediaId;
      if (mediaId) this.querySelector('bazar-product-gallery')?.showMedia(mediaId);
      this.#selectionPending = false;
      // Run after native product-form promise listeners have morphed controls and set the exact server variant ID.
      queueMicrotask(() => {
        if (!this.isConnected || generation !== this.#generation) return;
        const id = this.productForm.querySelector('[name="id"]');
        id.value = detail.resource?.id || ''; id.disabled = !canPurchase;
        this.button.disabled = !canPurchase || this.#uncertain || this.#cartPending;
        this.productForm.querySelector('[name="quantity"]').disabled = !canPurchase;
        this.querySelector('[data-pdp-quantity]').disabled = !canPurchase;
        this.productForm.querySelector('quantity-selector-component')?.updateButtonStates();
        this.message(detail.resource ? 'Варіант оновлено.' : 'Така комбінація варіантів недоступна.');
      });
    } catch (error) {
      if (!this.isConnected || generation !== this.#generation) return;
      this.#selectionPending = false;
      this.productForm.dataset.pdpCanPurchase = 'false';
      this.productForm.querySelector('[name="id"]').value = '';
      this.button.disabled = true;
      this.message('Не вдалося підтвердити вибір варіанта. Спробуйте ще раз.');
      this.querySelector('[data-pdp-retry]').hidden = false;
    }
  };
  onCart = async event => {
    if (event.target.closest('product-form-component') !== this.productForm || !event.promise) return;
    this.#cartPending = true; this.#cartError = ''; this.button.disabled = true;
    this.productForm.setAttribute('aria-busy', 'true');
    this.querySelector('[data-pdp-options]').disabled = true;
    const quantity = this.productForm.querySelector('[name="quantity"]'); quantity.disabled = true;
    this.querySelector('[data-pdp-quantity]').disabled = true;
    this.message('Додаємо…');
    try {
      const { detail } = await event.promise;
      if (!this.isConnected) return;
      this.message(detail?.didError ? this.#cartError || 'Не вдалося додати товар.' : 'Товар додано до кошика.');
    } catch (error) {
      if (!this.isConnected) return;
      this.#uncertain = true;
      this.message('Результат запиту не підтверджено. Перевірте кошик перед повторною спробою.');
    } finally {
      if (this.isConnected) {
        this.#cartPending = false; this.productForm.removeAttribute('aria-busy');
        this.querySelector('[data-pdp-cart-link]').hidden = false;
        this.querySelector('[data-pdp-options]').disabled = this.#uncertain;
        const canPurchase = this.productForm.dataset.pdpCanPurchase === 'true';
        this.button.disabled = !canPurchase || this.#uncertain || this.#selectionPending;
        quantity.disabled = !canPurchase || this.#uncertain;
        this.querySelector('[data-pdp-quantity]').disabled = !canPurchase || this.#uncertain;
      }
    }
  };
  initializeTabs() {
    const group = this.querySelector('[data-pdp-panels]'); if (!group) return;
    const links = [...group.querySelectorAll('[data-pdp-tab]')];
    const panels = [...group.querySelectorAll('[data-pdp-panel]')];
    group.querySelector('nav').setAttribute('role', 'tablist');
    const activate = index => {
      links.forEach((link, i) => { link.setAttribute('aria-selected', String(i === index)); link.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
    };
    group.addEventListener('click', event => {
      const target = event.target.closest('[data-pdp-panel-link]'); if (!target) return;
      const index = links.findIndex(link => link.hash === target.hash); if (index < 0) return;
      event.preventDefault(); activate(index); panels[index].focus();
    }, { signal: this.#controller.signal });
    links.forEach((link, index) => {
      link.id = `${this.dataset.sectionId}-tab-${index}`; link.setAttribute('role', 'tab');
      link.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel'); panels[index].setAttribute('aria-labelledby', link.id); panels[index].tabIndex = 0;
      link.addEventListener('click', event => { event.preventDefault(); activate(index); }, { signal: this.#controller.signal });
      link.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % links.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + links.length) % links.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = links.length - 1;
        if (next !== undefined) { event.preventDefault(); activate(next); links[next].focus(); }
      }, { signal: this.#controller.signal });
    });
    activate(0);
  }
}
if (!customElements.get('bazar-product')) customElements.define('bazar-product', BazarProduct);
