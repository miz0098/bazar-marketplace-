const catalogSelector = '[data-bazar-catalog]';
const triggerSelector = '[data-bazar-catalog-trigger]';
const panelSelector = '[data-bazar-catalog-panel]';
const categorySelector = '[data-bazar-catalog-category]';
const subpanelSelector = '[data-bazar-catalog-subpanel]';

const getParts = (root) => ({
  trigger: root.querySelector(triggerSelector),
  panel: root.querySelector(panelSelector),
});

const setActiveCategory = (root, category, focusCategory = false) => {
  const targetId = category?.getAttribute('data-bazar-catalog-target');
  const categories = [...root.querySelectorAll(categorySelector)];
  const subpanels = [...root.querySelectorAll(subpanelSelector)];

  categories.forEach((item) => {
    const isActive = item === category;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'true');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.removeAttribute('aria-current');
      item.setAttribute('aria-selected', 'false');
    }
  });

  subpanels.forEach((subpanel) => {
    const isActive = targetId && subpanel.id === targetId;
    subpanel.hidden = !isActive;
    subpanel.classList.toggle('is-active', isActive);
  });

  if (focusCategory) {
    category.focus({ preventScroll: true });
  }
};

const openCatalog = (root) => {
  const { trigger, panel } = getParts(root);
  if (!trigger || !panel || !panel.hidden) return;

  panel.hidden = false;
  root.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');

  const activeCategory = root.querySelector(`${categorySelector}.is-active`) || root.querySelector(categorySelector);
  if (activeCategory) {
    setActiveCategory(root, activeCategory);
    window.requestAnimationFrame(() => activeCategory.focus({ preventScroll: true }));
  }
};

const closeCatalog = (root, returnFocus = false) => {
  const { trigger, panel } = getParts(root);
  if (!trigger || !panel || panel.hidden) return;

  panel.hidden = true;
  root.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');

  if (returnFocus) {
    trigger.focus({ preventScroll: true });
  }
};

const moveCategoryFocus = (root, currentCategory, direction) => {
  const categories = [...root.querySelectorAll(categorySelector)];
  const currentIndex = categories.indexOf(currentCategory);
  if (currentIndex < 0) return;

  const nextIndex = (currentIndex + direction + categories.length) % categories.length;
  const nextCategory = categories[nextIndex];
  setActiveCategory(root, nextCategory, true);
};

const focusFirstSubcategory = (root) => {
  const activePanel = root.querySelector(`${subpanelSelector}.is-active`);
  const firstLink = activePanel?.querySelector('a[href]');
  firstLink?.focus({ preventScroll: true });
};

const initCatalog = (root) => {
  if (root.dataset.bazarCatalogReady === 'true') return;

  const { trigger } = getParts(root);
  if (!trigger) return;

  root.dataset.bazarCatalogReady = 'true';

  trigger.addEventListener('click', () => {
    const { panel } = getParts(root);
    if (panel?.hidden) {
      openCatalog(root);
    } else {
      closeCatalog(root, true);
    }
  });

  root.addEventListener('mouseover', (event) => {
    const category = event.target.closest(categorySelector);
    if (category && root.contains(category)) {
      setActiveCategory(root, category);
    }
  });

  root.addEventListener('focusin', (event) => {
    const category = event.target.closest(categorySelector);
    if (category && root.contains(category)) {
      setActiveCategory(root, category);
    }
  });

  root.addEventListener('click', (event) => {
    const category = event.target.closest(categorySelector);
    if (category && root.contains(category)) {
      setActiveCategory(root, category);
    }
  });

  root.addEventListener('keydown', (event) => {
    const currentCategory = event.target.closest(categorySelector);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeCatalog(root, true);
      return;
    }

    if (!currentCategory) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveCategoryFocus(root, currentCategory, 1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveCategoryFocus(root, currentCategory, -1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstCategory = root.querySelector(categorySelector);
      if (firstCategory) setActiveCategory(root, firstCategory, true);
    }

    if (event.key === 'End') {
      event.preventDefault();
      const categories = root.querySelectorAll(categorySelector);
      const lastCategory = categories[categories.length - 1];
      if (lastCategory) setActiveCategory(root, lastCategory, true);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusFirstSubcategory(root);
    }
  });
};

const initCatalogs = () => {
  document.querySelectorAll(catalogSelector).forEach(initCatalog);
};

document.addEventListener('click', (event) => {
  document.querySelectorAll(catalogSelector).forEach((root) => {
    if (!root.contains(event.target)) {
      closeCatalog(root);
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  document.querySelectorAll(catalogSelector).forEach((root) => {
    closeCatalog(root, true);
  });
});

document.addEventListener('shopify:section:load', initCatalogs);
initCatalogs();
