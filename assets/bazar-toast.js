(function () {
  const MAX_TOASTS = 3;
  const DEFAULT_DURATION = 10000;
  const HIDE_DURATION = 300;
  const TYPES = {
    success: { icon: '✓', role: 'status' },
    error: { icon: '!', role: 'alert' },
    warning: { icon: '⚠', role: 'status' },
    info: { icon: 'ℹ', role: 'status' },
  };

  const activeToasts = [];
  let region = null;

  const getRegion = () => {
    if (region?.isConnected) return region;

    region = document.createElement('div');
    region.className = 'bazar-toast-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-label', 'Сповіщення BAZAR');
    document.body.appendChild(region);

    return region;
  };

  const removeToast = (toast, immediate = false) => {
    window.clearTimeout(toast.timer);

    const index = activeToasts.indexOf(toast);
    if (index > -1) activeToasts.splice(index, 1);

    if (immediate) {
      toast.element.remove();
      return;
    }

    if (toast.isHiding) return;
    toast.isHiding = true;
    toast.element.classList.add('is-hiding');

    window.setTimeout(() => {
      toast.element.remove();
    }, HIDE_DURATION);
  };

  const scheduleToast = (toast) => {
    if (toast.duration <= 0) return;

    toast.startedAt = Date.now();
    toast.timer = window.setTimeout(() => removeToast(toast), toast.remaining);
  };

  const pauseToast = (toast) => {
    if (toast.duration <= 0 || toast.isHiding) return;

    window.clearTimeout(toast.timer);
    toast.remaining = Math.max(0, toast.remaining - (Date.now() - toast.startedAt));
  };

  const resumeToast = (toast) => {
    if (toast.duration <= 0 || toast.isHiding || toast.remaining <= 0) return;
    scheduleToast(toast);
  };

  const createToastElement = (type, message) => {
    const typeConfig = TYPES[type] || TYPES.info;
    const element = document.createElement('div');
    const icon = document.createElement('span');
    const text = document.createElement('span');
    const close = document.createElement('button');

    element.className = `bazar-toast bazar-toast--${type}`;
    element.setAttribute('role', typeConfig.role);

    icon.className = 'bazar-toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = typeConfig.icon;

    text.className = 'bazar-toast__message';
    text.textContent = message;

    close.className = 'bazar-toast__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрити сповіщення');
    close.textContent = '×';

    element.append(icon, text, close);

    return { element, close };
  };

  const showToast = (options = {}) => {
    const toastOptions = typeof options === 'string' ? { message: options } : options;
    const message = String(toastOptions.message || '').trim();
    if (!message) return null;

    const type = TYPES[toastOptions.type] ? toastOptions.type : 'info';
    const duration = Number.isFinite(Number(toastOptions.duration))
      ? Number(toastOptions.duration)
      : DEFAULT_DURATION;
    const { element, close } = createToastElement(type, message);
    const toast = {
      duration,
      element,
      isHiding: false,
      remaining: duration,
      startedAt: Date.now(),
      timer: null,
    };

    element.addEventListener('mouseenter', () => pauseToast(toast));
    element.addEventListener('mouseleave', () => resumeToast(toast));
    close.addEventListener('click', () => removeToast(toast));

    getRegion().appendChild(element);
    activeToasts.push(toast);

    while (activeToasts.length > MAX_TOASTS) {
      removeToast(activeToasts[0], true);
    }

    window.requestAnimationFrame(() => {
      element.classList.add('is-visible');
    });

    scheduleToast(toast);

    return toast;
  };

  document.addEventListener('bazar:toast', (event) => {
    showToast(event.detail || {});
  });

  document.addEventListener('shopify:cart:error', (event) => {
    const detail = event.detail || {};
    showToast({
      type: 'error',
      message: detail.error || detail.message || 'Не вдалося виконати дію',
    });
  });

  window.showToast = showToast;
  window.BazarToast = {
    clear() {
      [...activeToasts].forEach((toast) => removeToast(toast, true));
    },
    error(message, options = {}) {
      return showToast({ ...options, type: 'error', message });
    },
    info(message, options = {}) {
      return showToast({ ...options, type: 'info', message });
    },
    show: showToast,
    success(message, options = {}) {
      return showToast({ ...options, type: 'success', message });
    },
    warning(message, options = {}) {
      return showToast({ ...options, type: 'warning', message });
    },
  };
})();
