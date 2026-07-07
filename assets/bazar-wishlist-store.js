(function () {
  const STORAGE_KEY = 'bazarWishlistItems';
  const listeners = new Set();
  let hasStoredState = false;
  let items = null;

  const readJSONScript = (id) => {
    const element = document.getElementById(id);
    if (!element) return null;

    try {
      return JSON.parse(element.textContent || 'null');
    } catch (_error) {
      return null;
    }
  };

  const readStoredItems = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      hasStoredState = stored !== null;
      return stored ? JSON.parse(stored) : null;
    } catch (_error) {
      return null;
    }
  };

  const writeStoredItems = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
      hasStoredState = true;
    } catch (_error) {
      // Storage may be unavailable in private mode; in-memory state still works.
    }
  };

  const normalizeItem = (item = {}) => ({
    ...item,
    id: item.id || item.handle || item.productHandle || item.url || '',
  });

  const getItemId = (item = {}) => String(item.id || item.handle || item.productHandle || item.url || '');

  const emit = () => {
    const detail = { items: list(), count: count() };
    listeners.forEach((listener) => listener(detail));
    document.dispatchEvent(new CustomEvent('bazar:wishlist-change', { detail }));
  };

  const loadInitialItems = () => {
    const stored = readStoredItems();
    if (Array.isArray(stored)) return stored.map(normalizeItem);

    const wishlistData = readJSONScript('BazarWishlistData');
    if (Array.isArray(wishlistData?.wishlist)) return wishlistData.wishlist.map(normalizeItem);

    const accountData = readJSONScript('BazarAccountProviderData');
    if (Array.isArray(accountData?.wishlist)) return accountData.wishlist.map(normalizeItem);

    return [];
  };

  const ensureLoaded = () => {
    if (Array.isArray(items)) return;
    items = loadInitialItems();
  };

  const list = ({ search = '', sort = 'newest' } = {}) => {
    ensureLoaded();
    const query = search.trim().toLowerCase();

    return [...items]
      .filter((item) => !query || `${item.title || ''} ${item.vendor || ''}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === 'price-high') return Number(b.priceValue || 0) - Number(a.priceValue || 0);
        if (sort === 'price-low') return Number(a.priceValue || 0) - Number(b.priceValue || 0);
        return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      });
  };

  const count = () => {
    ensureLoaded();
    return items.length;
  };

  const hydrate = (nextItems = []) => {
    ensureLoaded();

    if (!hasStoredState && !items.length && Array.isArray(nextItems) && nextItems.length) {
      items = nextItems.map(normalizeItem);
      writeStoredItems();
      emit();
    }
  };

  const get = (id) => {
    ensureLoaded();
    return items.find((item) => getItemId(item) === String(id));
  };

  const remove = (id) => {
    ensureLoaded();
    const before = items.length;
    items = items.filter((item) => getItemId(item) !== String(id));

    if (items.length !== before) {
      writeStoredItems();
      emit();
    }
  };

  const bulkRemove = (ids = []) => {
    ensureLoaded();
    const idSet = new Set(ids.map(String));
    const before = items.length;
    items = items.filter((item) => !idSet.has(getItemId(item)));

    if (items.length !== before) {
      writeStoredItems();
      emit();
    }
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  window.BazarWishlistStore = {
    bulkRemove,
    count,
    get,
    hydrate,
    list,
    remove,
    subscribe,
  };
})();
