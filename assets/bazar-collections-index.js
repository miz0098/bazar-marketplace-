const rootSelector = '.bazar-collections-index';
const itemSelector = '.bazar-collections-index__item';
const panelSelector = '.bazar-collections-index__subcategories';
const cardSelector = '.bazar-collections-index__card';
const scrollLockClass = 'bazar-collections-overlay-scroll-lock';
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
    bodyWidth: document.body.style.width,
  };

  document.documentElement.classList.add(scrollLockClass);
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.overscrollBehavior = 'none';
  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'none';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
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
  document.body.style.width = scrollLockState.bodyWidth;

  scrollLockState = null;
  window.scrollTo(0, scrollY);
};

const getActiveItem = (root) => root.querySelector(`${itemSelector}.is-active`);

const getActivePanel = (root) => getActiveItem(root)?.querySelector(panelSelector) || null;

const closeOverlay = (root, focusCard = false) => {
  const activeItem = getActiveItem(root);
  const activeCard = activeItem?.querySelector(cardSelector);

  root.classList.remove('is-overlay-active');
  root.querySelectorAll(`${itemSelector}.is-active`).forEach((item) => item.classList.remove('is-active'));
  unlockPageScroll();

  if (focusCard) {
    activeCard?.focus({ preventScroll: true });
  }
};

const openOverlay = (root, item) => {
  if (!item) return;

  root.querySelectorAll(`${itemSelector}.is-active`).forEach((currentItem) => {
    currentItem.classList.toggle('is-active', currentItem === item);
  });

  item.classList.add('is-active');
  root.classList.add('is-overlay-active');
  lockPageScroll();
};

const getWheelDeltaY = (event, scrollContainer) => {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * scrollContainer.clientHeight;
  return event.deltaY;
};

const scrollPanelByDelta = (panel, deltaY) => {
  if (!panel || panel.scrollHeight <= panel.clientHeight) return;

  panel.scrollTop += deltaY;
};

const isolateWheel = (root, event) => {
  if (!root.classList.contains('is-overlay-active')) return;

  event.stopPropagation();
  event.preventDefault();

  const panel = getActivePanel(root);
  const target = event.target instanceof Element ? event.target : null;

  if (panel && target && panel.contains(target)) {
    scrollPanelByDelta(panel, getWheelDeltaY(event, panel));
  }
};

const isolateTouchStart = (event) => {
  touchStartY = event.touches?.[0]?.clientY || 0;
};

const isolateTouchMove = (root, event) => {
  if (!root.classList.contains('is-overlay-active')) return;

  event.stopPropagation();
  event.preventDefault();

  const panel = getActivePanel(root);
  const target = event.target instanceof Element ? event.target : null;
  const currentY = event.touches?.[0]?.clientY || touchStartY;

  if (panel && target && panel.contains(target)) {
    scrollPanelByDelta(panel, touchStartY - currentY);
  }

  touchStartY = currentY;
};

const trapFocus = (root, event) => {
  if (event.key !== 'Tab' || !root.classList.contains('is-overlay-active')) return;

  const activeItem = getActiveItem(root);
  if (!activeItem) return;

  const focusableElements = [...activeItem.querySelectorAll(focusableSelector)].filter(
    (element) => element.offsetParent !== null
  );

  if (focusableElements.length === 0) return;

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
};

const initCollectionsIndex = (root) => {
  if (root.dataset.bazarCollectionsIndexReady === 'true') return;

  root.dataset.bazarCollectionsIndexReady = 'true';

  root.querySelectorAll(itemSelector).forEach((item) => {
    item.addEventListener('pointerenter', () => openOverlay(root, item));
    item.addEventListener('pointerleave', (event) => {
      if (event.relatedTarget instanceof Node && item.contains(event.relatedTarget)) return;
      closeOverlay(root);
    });
  });

  root.addEventListener('focusin', (event) => {
    const item = event.target.closest(itemSelector);
    if (item && root.contains(item)) {
      openOverlay(root, item);
    }
  });

  root.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    closeOverlay(root);
  });

  root.addEventListener('wheel', (event) => isolateWheel(root, event), { passive: false });
  root.addEventListener('touchstart', isolateTouchStart, { passive: true });
  root.addEventListener('touchmove', (event) => isolateTouchMove(root, event), { passive: false });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-overlay-active')) {
      event.preventDefault();
      closeOverlay(root, true);
      return;
    }

    trapFocus(root, event);
  });
};

const initCollectionsIndexes = () => {
  document.querySelectorAll(rootSelector).forEach(initCollectionsIndex);
};

document.addEventListener('shopify:section:load', initCollectionsIndexes);
document.addEventListener('shopify:section:unload', unlockPageScroll);
initCollectionsIndexes();
