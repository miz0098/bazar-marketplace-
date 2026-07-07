const catalogSelector = '[data-bazar-catalog]';
const triggerSelector = '[data-bazar-catalog-trigger]';
const panelSelector = '[data-bazar-catalog-panel]';
const categorySelector = '[data-bazar-catalog-category]';
const subpanelSelector = '[data-bazar-catalog-subpanel]';
const scrollContainerSelector = '.bazar-catalog-menu__main, .bazar-catalog-menu__subcategories';
const catalogLinkSelector = '.bazar-catalog-menu__category-link[href], .bazar-catalog-menu__subcategory-link[href]';
const scrollLockClass = 'bazar-catalog-scroll-lock';
const searchFormSelector = '[data-bazar-header-search]';
const searchInputSelector = '[data-bazar-header-search-input]';
const searchSubmitSelector = '[data-bazar-header-search-submit]';
let scrollLockState = null;
let touchStartY = 0;

const lockPageScroll = () => {
  if (scrollLockState || !document.body) return;

  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  scrollLockState = {
    scrollY,
    htmlOverflow: document.documentElement.style.overflow,
    htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
    bodyOverflow: document.body.style.overflow,
    bodyOverscrollBehavior: document.body.style.overscrollBehavior,
    bodyPaddingRight: document.body.style.paddingRight,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyLeft: document.body.style.left,
    bodyRight: document.body.style.right,
    bodyWidth: document.body.style.width,
  };

  document.documentElement.classList.add(scrollLockClass);
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.overscrollBehavior = 'none';
  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'none';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
};

const unlockPageScroll = () => {
  if (!scrollLockState || !document.body) return;

  const { scrollY } = scrollLockState;

  document.documentElement.classList.remove(scrollLockClass);
  document.documentElement.style.overflow = scrollLockState.htmlOverflow;
  document.documentElement.style.overscrollBehavior = scrollLockState.htmlOverscrollBehavior;
  document.body.style.overflow = scrollLockState.bodyOverflow;
  document.body.style.overscrollBehavior = scrollLockState.bodyOverscrollBehavior;
  document.body.style.paddingRight = scrollLockState.bodyPaddingRight;
  document.body.style.position = scrollLockState.bodyPosition;
  document.body.style.top = scrollLockState.bodyTop;
  document.body.style.left = scrollLockState.bodyLeft;
  document.body.style.right = scrollLockState.bodyRight;
  document.body.style.width = scrollLockState.bodyWidth;

  scrollLockState = null;
  window.scrollTo(0, scrollY);
};

const updateScrollLock = () => {
  const hasOpenCatalog = [...document.querySelectorAll(panelSelector)].some((panel) => !panel.hidden);

  if (hasOpenCatalog) {
    lockPageScroll();
  } else {
    unlockPageScroll();
  }
};

const getParts = (root) => ({
  trigger: root.querySelector(triggerSelector),
  panel: root.querySelector(panelSelector),
});

const setActiveCategory = (root, category, focusCategory = false) => {
  const targetId = category?.getAttribute('data-bazar-catalog-target');
  const categories = [...root.querySelectorAll(categorySelector)];
  const subpanels = [...root.querySelectorAll(subpanelSelector)];
  let activePanel = null;

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
    if (isActive) {
      activePanel = subpanel;
    }
  });

  activePanel?.parentElement?.scrollTo({ top: 0, behavior: 'auto' });

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
  updateScrollLock();

  const activeCategory = root.querySelector(`${categorySelector}.is-active`) || root.querySelector(categorySelector);
  const firstCategory = root.querySelector(categorySelector);
  const categoryToFocus = firstCategory || activeCategory;
  if (categoryToFocus) {
    setActiveCategory(root, categoryToFocus);
    window.requestAnimationFrame(() => categoryToFocus.focus({ preventScroll: true }));
  }
};

const closeCatalog = (root, returnFocus = false) => {
  const { trigger, panel } = getParts(root);
  if (!trigger || !panel || panel.hidden) return;

  panel.hidden = true;
  root.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  updateScrollLock();

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

const getModalScrollContainer = (root, target) => {
  const panel = root.querySelector(panelSelector);
  if (!panel || !target || !panel.contains(target)) return null;

  const targetElement = target instanceof Element ? target : target.parentElement;
  return targetElement?.closest(scrollContainerSelector) || null;
};

const getWheelDeltaY = (event, scrollContainer) => {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * scrollContainer.clientHeight;
  return event.deltaY;
};

const isolateModalWheel = (root, event) => {
  const { panel } = getParts(root);
  if (!panel || panel.hidden) return;

  event.stopPropagation();

  if (!panel.contains(event.target)) {
    event.preventDefault();
    return;
  }

  const scrollContainer = getModalScrollContainer(root, event.target);
  if (!scrollContainer) {
    event.preventDefault();
    return;
  }

  const canScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
  if (!canScroll) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  scrollContainer.scrollTop += getWheelDeltaY(event, scrollContainer);
};

const isolateModalTouchStart = (event) => {
  touchStartY = event.touches?.[0]?.clientY || 0;
};

const isolateModalTouchMove = (root, event) => {
  const { panel } = getParts(root);
  if (!panel || panel.hidden) return;

  event.stopPropagation();

  if (!panel.contains(event.target)) {
    event.preventDefault();
    return;
  }

  const scrollContainer = getModalScrollContainer(root, event.target);
  const currentY = event.touches?.[0]?.clientY || touchStartY;
  const deltaY = touchStartY - currentY;
  touchStartY = currentY;

  if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  scrollContainer.scrollTop += deltaY;
};

const isValidCatalogLink = (link) => {
  if (!link) return false;

  const href = link.getAttribute('href') || '';
  return href && href !== '#' && !href.toLowerCase().startsWith('javascript:');
};

const navigateCatalogLink = (root, link) => {
  if (!isValidCatalogLink(link)) return;

  const url = link.href;
  closeCatalog(root);
  window.location.href = url;
};

const scrollModalPanelByKey = (root, event) => {
  const keyScrollMap = {
    ArrowDown: 44,
    ArrowUp: -44,
    PageDown: 0.86,
    PageUp: -0.86,
  };

  if (!(event.key in keyScrollMap)) return false;

  const scrollContainer = getModalScrollContainer(root, event.target);
  if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) return false;

  const scrollAmount = keyScrollMap[event.key];
  const top =
    Math.abs(scrollAmount) < 1 ? scrollContainer.clientHeight * scrollAmount : scrollAmount;

  event.preventDefault();
  scrollContainer.scrollBy({ top, behavior: 'smooth' });
  return true;
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
    if (event.target === root) {
      closeCatalog(root);
      return;
    }

    const catalogLink = event.target.closest(catalogLinkSelector);
    if (catalogLink && root.contains(catalogLink)) {
      event.preventDefault();
      navigateCatalogLink(root, catalogLink);
      return;
    }

    const category = event.target.closest(categorySelector);
    if (category && root.contains(category)) {
      setActiveCategory(root, category);
    }
  });

  root.addEventListener('wheel', (event) => isolateModalWheel(root, event), { passive: false });
  root.addEventListener('touchstart', isolateModalTouchStart, { passive: true });
  root.addEventListener('touchmove', (event) => isolateModalTouchMove(root, event), { passive: false });

  root.addEventListener('keydown', (event) => {
    const currentCategory = event.target.closest(categorySelector);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeCatalog(root, true);
      return;
    }

    if (event.key === 'PageDown' || event.key === 'PageUp') {
      scrollModalPanelByKey(root, event);
      return;
    }

    if (!currentCategory) {
      scrollModalPanelByKey(root, event);
      return;
    }

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

const updateSearchSubmitState = (form) => {
  const input = form.querySelector(searchInputSelector);
  const submit = form.querySelector(searchSubmitSelector);
  if (!input || !submit) return;

  const hasSearchTerm = input.value.trim().length > 0;
  submit.setAttribute('aria-disabled', hasSearchTerm ? 'false' : 'true');
};

const initHeaderSearch = (form) => {
  if (form.dataset.bazarHeaderSearchReady === 'true') return;

  const input = form.querySelector(searchInputSelector);
  if (!input) return;

  form.dataset.bazarHeaderSearchReady = 'true';
  updateSearchSubmitState(form);

  input.addEventListener('input', () => updateSearchSubmitState(form));

  form.addEventListener('submit', (event) => {
    if (input.value.trim().length > 0) return;

    event.preventDefault();
    updateSearchSubmitState(form);
  });
};

const initHeaderSearchForms = () => {
  document.querySelectorAll(searchFormSelector).forEach(initHeaderSearch);
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

document.addEventListener('shopify:section:load', () => {
  initCatalogs();
  initHeaderSearchForms();
});
document.addEventListener('shopify:section:unload', updateScrollLock);
initCatalogs();
initHeaderSearchForms();
updateScrollLock();
