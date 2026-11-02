/** Shopify cart Ajax API + Horizon standard events. No optimistic success, ownership storage or POST retries. */
import { CartLinesUpdateEvent } from '@shopify/events';

class BazarCardForm extends HTMLElement {
  #pending = false;
  connectedCallback() { this.addEventListener('submit', this.#submit); }
  disconnectedCallback() { this.removeEventListener('submit', this.#submit); }
  #submit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.checkValidity()) return;
    // Without the native route configuration let Shopify handle the ordinary product-form POST.
    if (!window.Theme?.routes?.cart_add_url || !window.Theme?.routes?.cart_url) return;
    event.preventDefault();
    if (this.#pending) return;
    this.#pending = true;
    const button = form.querySelector('button[type="submit"]');
    const message = form.querySelector('[data-bazar-cart-message]');
    const cartLink = form.querySelector('.bazar-card__cart-link');
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    message.textContent = 'Додаємо…';
    let uncertain = false;
    try {
      const data = new FormData(form);
      const sectionIds = [...document.querySelectorAll('cart-items-component[data-section-id]')]
        .map(element => element.dataset.sectionId).filter(Boolean);
      if (sectionIds.length) data.set('sections', [...new Set(sectionIds)].slice(0, 5).join(','));
      data.set('sections_url', window.location.pathname);
      // A network/parse failure after sending POST has an unknown outcome. Never automatically retry it.
      uncertain = true;
      const response = await fetch(Theme.routes.cart_add_url, {
        method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }, body: data,
      });
      const added = await response.json();
      if (!response.ok || added.status) {
        uncertain = response.status >= 500;
        throw new Error(typeof added.description === 'string' ? added.description : 'Не вдалося додати товар. Перевірте доступність.');
      }
      const cartResponse = await fetch(`${Theme.routes.cart_url}.js`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!cartResponse.ok) throw new Error('Не вдалося оновити кошик.');
      const cart = await cartResponse.json();
      this.dispatchEvent(new CartLinesUpdateEvent({
        action: 'add', context: 'product', lines: [{ merchandiseId: String(data.get('id')), quantity: 1 }],
        promise: Promise.resolve({
          cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
          detail: { items: cart.items, sections: added.sections, source: 'bazar-card-form', sourceId: form.getAttribute('id'), didError: false },
        }),
      }));
      uncertain = false;
      message.textContent = 'Товар додано до кошика.';
      cartLink.hidden = false;
    } catch (error) {
      message.textContent = uncertain
        ? 'Результат запиту не підтверджено. Перевірте кошик перед повторною спробою.'
        : error.message;
      cartLink.hidden = false;
    } finally {
      form.removeAttribute('aria-busy');
      // Keep unknown outcomes locked until navigation/reload prevents an accidental duplicate POST.
      if (!uncertain) { this.#pending = false; button.disabled = false; }
    }
  };
}
if (!customElements.get('bazar-card-form')) customElements.define('bazar-card-form', BazarCardForm);

// Progressive disclosure: content remains available without JavaScript; no inferred mobile drawer design.
function initializeSidebars(root = document) {
  root.querySelectorAll('[data-bazar-sidebar]').forEach(details => {
    if (details.dataset.bazarInitialized) return;
    details.dataset.bazarInitialized = 'true';
    details.open = window.matchMedia('(min-width: 1024px)').matches;
    details.addEventListener('keydown', event => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
        details.querySelector('summary').focus();
      }
    });
  });
}
initializeSidebars();
document.addEventListener('shopify:section:load', event => initializeSidebars(event.target));
