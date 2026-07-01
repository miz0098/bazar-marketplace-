(() => {
  const existingNamespace = window.BAZAR || {};
  const bus = existingNamespace.bus || new EventTarget();

  const on = (eventName, handler, options) => {
    bus.addEventListener(eventName, handler, options);

    return () => {
      bus.removeEventListener(eventName, handler, options);
    };
  };

  const emit = (eventName, detail = {}) => {
    const event = new CustomEvent(eventName, { detail });
    bus.dispatchEvent(event);
    return event;
  };

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  };

  window.BAZAR = {
    ...existingNamespace,
    bus,
    emit,
    on,
    ready,
    version: '0.1.0'
  };
})();
