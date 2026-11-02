import { Component } from '@theme/component';
import {
  fetchConfig,
  debounce,
  onAnimationEnd,
  prefersReducedMotion,
  resetShimmer,
  startViewTransition,
} from '@theme/utilities';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import { ThemeEvents, QuantitySelectorUpdateEvent } from '@theme/events';
import { cartPerformance } from '@theme/performance';
import {
  createViewEventElement,
  CartErrorEvent,
  CartDiscountUpdateEvent,
  CartLinesUpdateEvent,
  CartNoteUpdateEvent,
  StandardEvents,
} from '@shopify/events';

// Serialize native page/drawer quantity mutations against the same cart.
let cartMutationInProgress = false;

/** @typedef {import('./utilities').TextComponent} TextComponent */

/**
 * A custom element that displays a cart items component.
 *
 * @typedef {object} Refs
 * @property {HTMLElement[]} quantitySelectors - The quantity selector elements.
 * @property {HTMLElement[]} cartItemRows - The cart item rows.
 * @property {TextComponent} cartTotal - The cart total.
 *
 * @extends {Component<Refs>}
 */
export class CartItemsComponent extends createViewEventElement(Component) {
  #debouncedOnChange = debounce(
    /** @param {Event} event */
    (event) => {
      if (event instanceof QuantitySelectorUpdateEvent) this.#onQuantityChange(event);
    },
    300
  );
  /** @type {Promise<any> | null} */
  #pendingCartFetch = null;

  /**
   * True when the event was dispatched from outside this cart-items-component (e.g.
   * `Shopify.actions.updateCart(...)` from an external app, or the SFAPI default
   * handler). Internal dispatchers (cart-discount-component, cart-note) live inside
   * `this` and either morph the section themselves or don't need a refresh — running
   * a fallback render in that case double-renders and can clobber form state.
   * @param {Event} event
   */
  #isExternalCartUpdate(event) {
    return !(event.target instanceof Node) || !this.contains(event.target);
  }

  /** @param {CartDiscountUpdateEvent} event */
  #handleDiscountUpdate = (event) => {
    const external = this.#isExternalCartUpdate(event);
    event.promise
      ?.then(({ detail }) => {
        const sectionsHtml = detail?.sections?.[this.sectionId];
        if (sectionsHtml) {
          morphSection(this.sectionId, sectionsHtml, { mode: this.isDrawer ? 'hydration' : 'full' });
          this.#updateCartQuantitySelectorButtonStates();
        } else if (external) {
          // External caller (Shopify.actions.updateCart or SFAPI default handler) didn't
          // attach sections; refetch so the discount UI reflects the post-mutation cart.
          // Internal cart-discount-component morphs the section itself — no fallback needed.
          sectionRenderer.renderSection(this.sectionId, {
            cache: false,
            mode: this.isDrawer ? 'hydration' : 'full',
          });
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  /** @param {CartNoteUpdateEvent} event */
  #handleNoteUpdate = (event) => {
    // Internal cart-note dispatches don't need a section refresh — the user typed the
    // value and the textarea retains it. Only external callers need the UI synced.
    if (!this.#isExternalCartUpdate(event)) return;
    event.promise
      ?.then(({ detail }) => {
        const sections = /** @type {Record<string, string> | undefined} */ (detail?.sections);
        const sectionsHtml = sections?.[this.sectionId];
        if (sectionsHtml) {
          morphSection(this.sectionId, sectionsHtml, { mode: this.isDrawer ? 'hydration' : 'full' });
        } else {
          sectionRenderer.renderSection(this.sectionId, {
            cache: false,
            mode: this.isDrawer ? 'hydration' : 'full',
          });
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(StandardEvents.cartLinesUpdate, this.#handleCartUpdate);
    document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
    document.addEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    document.addEventListener(StandardEvents.cartNoteUpdate, this.#handleNoteUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(StandardEvents.cartLinesUpdate, this.#handleCartUpdate);
    document.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
    document.removeEventListener(StandardEvents.cartDiscountUpdate, this.#handleDiscountUpdate);
    document.removeEventListener(StandardEvents.cartNoteUpdate, this.#handleNoteUpdate);
  }

  /**
   * Handles QuantitySelectorUpdateEvent change event.
   * @param {QuantitySelectorUpdateEvent} event - The event.
   */
  #onQuantityChange(event) {
    if (!(event.target instanceof Node) || !this.contains(event.target)) return;

    const { quantity, cartLine: line } = event.detail;

    // Cart items require a line number
    if (!line) return;

    if (quantity === 0) {
      return this.onLineItemRemove(line);
    }

    this.updateQuantity({
      line,
      quantity,
      action: 'change',
    });
    const lineItemRow = this.refs.cartItemRows[line - 1];

    if (!lineItemRow) return;

    const textComponent = /** @type {TextComponent | undefined} */ (lineItemRow.querySelector('text-component'));
    textComponent?.shimmer();
  }

  /**
   * Handles the line item removal.
   * @param {number} line - The line item index.
   */
  onLineItemRemove(line) {
    this.updateQuantity({
      line,
      quantity: 0,
      action: 'clear',
    });
  }

  /**
   * Updates the quantity.
   * @param {Object} config - The config.
   * @param {number} config.line - The line.
   * @param {number} config.quantity - The quantity.
   * @param {string} config.action - The action.
   */
  updateQuantity(config) {
    if (cartMutationInProgress || this.hasAttribute('aria-busy') || this.dataset.cartUncertain) return;
    if (!this.refs.cartItemRows[config.line - 1]?.dataset.key) return;
    cartMutationInProgress = true;
    this.setAttribute('aria-busy', 'true');
    // Keep other cart surfaces inert until this authoritative response settles.
    const otherCarts = [...document.querySelectorAll('cart-items-component')]
      .filter((cart) => cart !== this && !cart.hasAttribute('inert'));
    otherCarts.forEach((cart) => cart.setAttribute('inert', ''));
    const cartPerformaceUpdateMarker = cartPerformance.createStartingMarker(`${config.action}:user-action`);

    this.#disableCartItems();

    const { line, quantity } = config;
    this.#cartFeedback("Оновлення кошика…");
    const { cartTotal } = this.refs;

    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    const sectionsToUpdate = new Set([this.sectionId]);
    cartItemsComponents.forEach((item) => {
      if (item instanceof HTMLElement && item.dataset.sectionId) {
        sectionsToUpdate.add(item.dataset.sectionId);
      }
    });

    const body = JSON.stringify({
      id: this.refs.cartItemRows[line - 1]?.dataset.key,
      quantity: quantity,
      sections: Array.from(sectionsToUpdate).join(','),
      sections_url: window.location.pathname,
    });

    cartTotal?.shimmer();

    const deferredUpdatePromise = CartLinesUpdateEvent.createPromise();
    // The initiating component handles failures below. A cart page can have no
    // external subscriber; consume its notification rejection in that case.
    const lineId = this.refs.cartItemRows[line - 1]?.dataset.key ?? '';
    const updateEvent = new CartLinesUpdateEvent({
      action: config.action === 'change' && quantity > 0 ? 'update' : 'remove',
      context: 'cart',
      lines: [{ id: lineId, quantity }],
      promise: deferredUpdatePromise.promise,
    });
    updateEvent.promise?.catch(() => {});
    this.dispatchEvent(updateEvent);

    fetch(`${Theme.routes.cart_change_url}`, fetchConfig('json', { body }))
      .then((response) => {
        if (!response.ok && response.status !== 422) throw new Error(`Cart update failed: ${response.status}`);
        return response.text();
      })
      .then((responseText) => {
        const parsedResponseText = JSON.parse(responseText);

        resetShimmer(this);

        if (parsedResponseText.errors || parsedResponseText.status >= 400) {
          parsedResponseText.errors = parsedResponseText.errors || parsedResponseText.description || "Не вдалося оновити кошик.";
          this.#handleCartError(line, parsedResponseText);
          deferredUpdatePromise.reject(new Error(parsedResponseText.errors));
          return;
        }

        if (!Array.isArray(parsedResponseText.items) || !parsedResponseText.sections?.[this.sectionId]) {
          throw new Error('Cart response is incomplete');
        }
        const newSectionHTML = new DOMParser().parseFromString(
          parsedResponseText.sections[this.sectionId],
          'text/html'
        );

        // Grab the new cart item count from a hidden element
        const newCartHiddenItemCount = newSectionHTML.querySelector('[ref="cartItemCount"]')?.textContent;
        const newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : 0;

        // Update data-cart-quantity for all matching variants
        this.#updateQuantitySelectors(parsedResponseText);

        deferredUpdatePromise.resolve({
          cart: CartLinesUpdateEvent.createCartFromAjaxResponse(parsedResponseText),
          detail: {
            sections: parsedResponseText.sections,
            items: parsedResponseText.items,
            itemCount: newCartItemCount,
            source: 'cart-items-component',
            didError: false,
          },
        });

        return morphSection(this.sectionId, parsedResponseText.sections[this.sectionId], {
          mode: this.isDrawer ? 'hydration' : 'full',
        }).then(() => {
          this.#updateCartQuantitySelectorButtonStates();
          document.getElementById('bazar-cart-feedback')?.replaceChildren(document.createTextNode('Кошик оновлено.'));
        });
      })
      .catch((error) => {
        console.error(error);
        this.#cartFeedback("Не вдалося підтвердити оновлення. Перезавантажте кошик перед наступною зміною.");
        this.dataset.cartUncertain = "true";
        for (const cart of otherCarts) {
          cart.removeAttribute('inert');
          cart.dataset.cartUncertain = 'true';
          cart.querySelector('.bazar-cart__items')?.setAttribute('inert', '');
          cart.querySelector('button[name="checkout"]')?.setAttribute('disabled', '');
          const feedback = cart.querySelector('#bazar-cart-feedback');
          if (feedback) feedback.textContent = 'Оновлення не підтверджено. Перезавантажте кошик.';
        }
        deferredUpdatePromise.reject(error);

        this.dispatchEvent(
          new CartErrorEvent({
            error: error?.message || 'Failed to update cart',
            code: 'SERVICE_UNAVAILABLE',
          })
        );
      })
      .finally(() => {
        this.removeAttribute('aria-busy');
        // An uncertain POST outcome requires a reload; never automatically retry.
        if (!this.dataset.cartUncertain) {
          cartMutationInProgress = false;
          otherCarts.forEach((cart) => cart.removeAttribute('inert'));
          this.#enableCartItems();
        }
        cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
      });
  }

  /**
   * Handles the cart error.
   * @param {number} line - The line.
   * @param {Object} parsedResponseText - The parsed response text.
   * @param {string} parsedResponseText.errors - The errors.
   */
  #handleCartError = (line, parsedResponseText) => {
    const quantitySelector = this.refs.quantitySelectors[line - 1];
    const quantityInput = quantitySelector?.querySelector('input');

    if (!quantityInput) throw new Error('Quantity input not found');

    quantityInput.value = this.refs.cartItemRows[line - 1]?.dataset.confirmedQuantity ?? quantityInput.defaultValue;

    const cartItemError = this.refs[`cartItemError-${line}`];
    const cartItemErrorContainer = this.refs[`cartItemErrorContainer-${line}`];

    if (!(cartItemError instanceof HTMLElement)) throw new Error('Cart item error not found');
    if (!(cartItemErrorContainer instanceof HTMLElement)) throw new Error('Cart item error container not found');

    this.#cartFeedback("Не вдалося оновити кошик. Перевірте повідомлення біля товару.");
    cartItemError.textContent = parsedResponseText.errors;
    cartItemErrorContainer.classList.remove('hidden');

    this.dispatchEvent(
      new CartErrorEvent({
        error: parsedResponseText.errors || 'Cart update failed',
        code: 'INVALID',
      })
    );
  };

  /**
   * Handles the cart update.
   *
   * @param {CartLinesUpdateEvent} event
   */
  #handleCartUpdate = (event) => {
    if (event.target === this) return;

    event.promise
      ?.then(async ({ detail }) => {
        const sections = detail?.sections;
        const cartItemsHtml = sections?.[this.sectionId];
        // Animate empty → non-empty in the drawer (possible in squeeze mode
        // where the page is interactive alongside the open drawer). This also
        // needs the response stylesheet because it adds the cart summary markup.
        const wasEmptyCartDrawer = this.isDrawer && this.querySelector('[data-cart-drawer-empty]') !== null;
        /** @type {'hydration' | 'full'} */
        const mode = this.isDrawer ? 'hydration' : 'full';
        const morphOptions = {
          mode,
          injectStylesheet: wasEmptyCartDrawer,
        };

        if (cartItemsHtml) {
          const existingKeys = new Set(this.refs.cartItemRows?.map((row) => row.dataset.key) ?? []);

          if (wasEmptyCartDrawer) {
            startViewTransition(() => {
              morphSection(this.sectionId, cartItemsHtml, morphOptions);
            }, ['fill-cart-drawer']);
          } else {
            await morphSection(this.sectionId, cartItemsHtml, morphOptions);
          }

          // Animate newly added rows (reverse of the remove animation).
          if (!wasEmptyCartDrawer && !prefersReducedMotion()) {
            for (const row of this.refs.cartItemRows ?? []) {
              if (!existingKeys.has(row.dataset.key)) {
                row.classList.add('adding');
                onAnimationEnd(row, () => row.classList.remove('adding'));
              }
            }
          }

          // Update button states for all cart quantity selectors after morph
          this.#updateCartQuantitySelectorButtonStates();
        } else {
          sectionRenderer.renderSection(this.sectionId, { cache: false, ...morphOptions });
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[cart-items] Event promise rejected:', error);
      });
  };

  /**
   * Disables the cart items.
   */
  #cartFeedback(message) {
    const feedback = this.querySelector('#bazar-cart-feedback');
    if (feedback) feedback.textContent = message;
  }

  #disableCartItems() {
    this.classList.add('cart-items-disabled');
    this.querySelector('.bazar-cart__items')?.setAttribute('inert', '');
    this.querySelector('button[name="checkout"]')?.setAttribute('disabled', '');
  }

  /**
   * Enables the cart items.
   */
  #enableCartItems() {
    this.classList.remove('cart-items-disabled');
    this.querySelector('.bazar-cart__items')?.removeAttribute('inert');
    this.querySelector('button[name="checkout"]')?.removeAttribute('disabled');
  }

  /**
   * Updates quantity selectors for all matching variants in the cart.
   * @param {Object} updatedCart - The updated cart object.
   * @param {Array<{variant_id: number, quantity: number}>} [updatedCart.items] - The cart items.
   */
  #updateQuantitySelectors(updatedCart) {
    if (!updatedCart.items) return;

    for (const item of updatedCart.items) {
      const variantId = item.variant_id.toString();
      const selectors = document.querySelectorAll(`quantity-selector-component[data-variant-id="${variantId}"]`);

      for (const selector of selectors) {
        const input = selector.querySelector('input[data-cart-quantity]');
        if (!input) continue;

        input.setAttribute('data-cart-quantity', item.quantity.toString());

        // Update the quantity selector's internal state
        if ('updateCartQuantity' in selector && typeof selector.updateCartQuantity === 'function') {
          selector.updateCartQuantity();
        }
      }
    }
  }

  /**
   * Updates button states for all cart quantity selector components.
   */
  #updateCartQuantitySelectorButtonStates() {
    for (const selector of document.querySelectorAll('cart-quantity-selector-component')) {
      /** @type {any} */ (selector).updateButtonStates?.();
    }
  }

  async fetchCartData() {
    if (this.#pendingCartFetch) return this.#pendingCartFetch;

    this.#pendingCartFetch = (async () => {
      const response = await fetch(`${Theme.routes.cart_url}.json`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
      const data = await response.json();
      return data;
    })().finally(() => {
      this.#pendingCartFetch = null;
    });

    return this.#pendingCartFetch;
  }

  /**
   * Gets the section id.
   * @returns {string} The section id.
   */
  get sectionId() {
    const { sectionId } = this.dataset;

    if (!sectionId) throw new Error('Section id missing');

    return sectionId;
  }

  /**
   * @returns {boolean} Whether the component is a drawer.
   */
  get isDrawer() {
    return this.dataset.drawer !== undefined;
  }
}

if (!customElements.get('cart-items-component')) {
  customElements.define('cart-items-component', CartItemsComponent);
}
