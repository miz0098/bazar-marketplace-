(function () {
  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const parseJSON = (element, fallback) => {
    if (!element) return fallback;

    try {
      return JSON.parse(element.textContent || '');
    } catch (_error) {
      return fallback;
    }
  };

  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  const formatDiscount = (variant) => {
    if (!variant.compareAtPrice || variant.compareAtPrice <= variant.price) return null;

    const savings = variant.compareAtPrice - variant.price;
    return {
      percent: Math.round((savings * 100) / variant.compareAtPrice),
      savings,
    };
  };

  const activateMedia = (root, mediaId) => {
    if (!mediaId) return;

    root.querySelectorAll('[data-bazar-thumb]').forEach((thumb) => {
      const isActive = thumb.dataset.mediaId === String(mediaId);
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    root.querySelectorAll('[data-bazar-media]').forEach((media) => {
      media.classList.toggle('is-hidden', media.dataset.mediaId !== String(mediaId));
    });
  };

  const initGallery = (root) => {
    root.querySelectorAll('[data-bazar-thumb]').forEach((thumb) => {
      thumb.addEventListener('click', () => activateMedia(root, thumb.dataset.mediaId));
    });

    const dialog = root.querySelector('[data-bazar-zoom-dialog]');
    const dialogImage = root.querySelector('[data-bazar-zoom-image]');
    const closeButton = root.querySelector('[data-bazar-zoom-close]');

    root.querySelectorAll('[data-bazar-zoom]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!dialog || !dialogImage || !button.dataset.zoomSrc) return;

        dialogImage.src = button.dataset.zoomSrc;
        dialogImage.alt = button.dataset.zoomAlt || '';

        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        }
      });
    });

    closeButton?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  };

  const initQuantity = (root) => {
    const input = root.querySelector('[data-bazar-quantity]');
    const minus = root.querySelector('[data-bazar-quantity-minus]');
    const plus = root.querySelector('[data-bazar-quantity-plus]');
    if (!input) return;

    const getMinimum = () => Number(input.getAttribute('min')) || 1;
    const normalize = () => {
      const minimum = getMinimum();
      const value = Math.max(minimum, Number(input.value) || minimum);
      input.value = String(value);
      return value;
    };

    minus?.addEventListener('click', () => {
      input.value = String(Math.max(getMinimum(), normalize() - 1));
    });

    plus?.addEventListener('click', () => {
      input.value = String(normalize() + 1);
    });

    input.addEventListener('change', normalize);
  };

  const initTabs = (root) => {
    const buttons = root.querySelectorAll('[data-bazar-tab]');
    const panels = root.querySelectorAll('[data-bazar-panel]');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.bazarTab;

        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.bazarPanel === target;
          panel.classList.toggle('is-active', isActive);
          panel.hidden = !isActive;
        });
      });
    });
  };

  const initProduct = (root) => {
    const variants = parseJSON(root.querySelector('[data-bazar-product-variants]'), []);
    const form = root.querySelector('[data-bazar-product-form]');
    const variantIdInput = root.querySelector('[data-bazar-variant-id]');
    const quantityInput = root.querySelector('[data-bazar-quantity]');
    const addButton = root.querySelector('[data-bazar-add-to-cart]');
    const buyButton = root.querySelector('[data-bazar-buy-now]');
    const message = root.querySelector('[data-bazar-form-message]');

    let selectedVariant = variants.find((variant) => String(variant.id) === String(variantIdInput?.value)) || variants[0];

    const selectedOptions = () => {
      const optionInputs = Array.from(root.querySelectorAll('[data-bazar-option]:checked'));
      return optionInputs
        .sort((a, b) => Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition))
        .map((input) => input.value);
    };

    const findVariant = () => {
      const options = selectedOptions();
      return variants.find((variant) => variant.options.every((value, index) => value === options[index]));
    };

    const updateButtons = (variant) => {
      const disabled = !variant || !variant.available;
      if (addButton) addButton.disabled = disabled;
      if (buyButton) buyButton.disabled = disabled;
    };

    const updateVariantUI = (variant) => {
      selectedVariant = variant;

      if (!variant) {
        updateButtons(null);
        setText(message, 'Ця комбінація недоступна.');
        return;
      }

      if (variantIdInput) variantIdInput.value = variant.id;
      setText(root.querySelector('[data-bazar-price]'), variant.priceText);
      setText(root.querySelector('[data-bazar-sku]'), variant.sku || 'не вказано');
      setText(root.querySelector('[data-bazar-sku-spec]'), variant.sku || 'не вказано');
      setText(root.querySelector('[data-bazar-barcode]'), variant.barcode || '');

      const discount = formatDiscount(variant);
      const compareElement = root.querySelector('[data-bazar-compare]');
      const discountElement = root.querySelector('[data-bazar-discount]');
      const savingsElement = root.querySelector('[data-bazar-savings]');

      if (discount) {
        setText(compareElement, variant.compareAtPriceText);
        setText(discountElement, `-${discount.percent}%`);
        setText(savingsElement, `Економія ${variant.savingsText || ''}`);
      }

      compareElement?.classList.toggle('is-hidden', !discount);
      discountElement?.classList.toggle('is-hidden', !discount);
      savingsElement?.classList.toggle('is-hidden', !discount);

      const availability = root.querySelector('[data-bazar-availability]');
      const availabilityText = root.querySelector('[data-bazar-availability-text]');
      if (availability && availabilityText) {
        availabilityText.textContent = variant.available
          ? availability.dataset.availableText || 'Є в наявності'
          : availability.dataset.unavailableText || 'Немає в наявності';
      }

      if (quantityInput) {
        const minimum = Number(variant.quantityMin) || 1;
        quantityInput.min = String(minimum);
        if ((Number(quantityInput.value) || 0) < minimum) quantityInput.value = String(minimum);
      }

      variant.options.forEach((value, index) => {
        setText(root.querySelector(`[data-bazar-option-spec="${index + 1}"]`), value);
      });

      updateButtons(variant);
      activateMedia(root, variant.featuredMediaId);

      if (variant.url) {
        window.history.replaceState({}, '', variant.url);
      }

      setText(message, '');
    };

    root.querySelectorAll('[data-bazar-option]').forEach((input) => {
      input.addEventListener('change', () => updateVariantUI(findVariant()));
    });

    const addToCart = async (redirectToCheckout) => {
      if (!selectedVariant || !form || !root.dataset.cartAddUrl) return;

      const targetButton = redirectToCheckout ? buyButton : addButton;
      const originalText = targetButton?.textContent || '';
      const quantity = Math.max(1, Number(quantityInput?.value) || 1);

      setText(message, '');
      if (targetButton) {
        targetButton.disabled = true;
        targetButton.textContent = 'Додаємо...';
      }

      try {
        const response = await fetch(root.dataset.cartAddUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                id: selectedVariant.id,
                quantity,
              },
            ],
          }),
        });

        if (!response.ok) throw new Error('cart');

        if (redirectToCheckout && root.dataset.checkoutUrl) {
          window.location.href = root.dataset.checkoutUrl;
          return;
        }

        setText(message, 'Товар додано в кошик.');
      } catch (_error) {
        setText(message, 'Не вдалося додати товар. Спробуйте ще раз.');
      } finally {
        if (targetButton) {
          targetButton.textContent = originalText;
          updateButtons(selectedVariant);
        }
      }
    };

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      addToCart(false);
    });

    buyButton?.addEventListener('click', () => addToCart(true));

    initGallery(root);
    initQuantity(root);
    initTabs(root);
  };

  const createRecentlyCard = (product) => {
    const item = document.createElement('div');
    item.className = 'bazar-product-carousel__item';
    item.setAttribute('role', 'listitem');

    const link = document.createElement('a');
    link.className = 'bazar-product-card';
    link.href = product.url;

    const media = document.createElement('span');
    media.className = 'bazar-product-card__media';

    if (product.image) {
      const image = document.createElement('img');
      image.className = 'bazar-product-card__image';
      image.src = product.image;
      image.alt = product.title;
      image.loading = 'lazy';
      media.appendChild(image);
    }

    const body = document.createElement('span');
    body.className = 'bazar-product-card__body';

    const title = document.createElement('span');
    title.className = 'bazar-product-card__title';
    title.textContent = product.title;

    const price = document.createElement('span');
    price.className = 'bazar-product-card__price';
    price.textContent = product.price;

    body.append(title, price);
    link.append(media, body);
    item.appendChild(link);

    return item;
  };

  const initRecentlyViewed = () => {
    const currentProduct = parseJSON(document.querySelector('[data-bazar-current-product]'), null);
    const section = document.querySelector('[data-bazar-recently-viewed]');
    if (!currentProduct) return;

    const storageKey = 'bazarRecentlyViewedProducts';
    const storedProducts = parseJSON({ textContent: localStorage.getItem(storageKey) || '[]' }, []);
    const previousProducts = storedProducts.filter((item) => String(item.id) !== String(currentProduct.id));

    if (section) {
      const grid = section.querySelector('[data-bazar-recently-grid]');
      const empty = section.querySelector('[data-bazar-recently-empty]');
      const productsToRender = previousProducts.slice(0, 8);

      if (grid && productsToRender.length > 0) {
        grid.replaceChildren(...productsToRender.map(createRecentlyCard));
        if (empty) empty.hidden = true;
      }
    }

    const nextProducts = [currentProduct, ...previousProducts].slice(0, 8);
    localStorage.setItem(storageKey, JSON.stringify(nextProducts));
  };

  ready(() => {
    document.querySelectorAll('[data-bazar-product]').forEach(initProduct);
    initRecentlyViewed();
  });
})();
