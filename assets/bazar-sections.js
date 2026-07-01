(() => {
  if (!window.BAZAR) {
    return;
  }

  const controllers = new Map();
  const instances = new WeakMap();

  const getSectionType = (element) => element.dataset.bazarSectionType || element.dataset.sectionType || '';
  const getSectionId = (element) => element.dataset.bazarSectionId || element.dataset.sectionId || '';

  const mount = (element) => {
    if (!element || instances.has(element)) {
      return;
    }

    const type = getSectionType(element);
    const Controller = controllers.get(type);

    if (!Controller) {
      return;
    }

    const instance = new Controller(element, {
      id: getSectionId(element),
      type
    });

    instances.set(element, instance);

    if (typeof instance.mount === 'function') {
      instance.mount();
    }

    window.BAZAR.emit(window.BAZAR.events.sectionLoaded, { element, id: getSectionId(element), type });
  };

  const unmount = (element) => {
    const instance = instances.get(element);

    if (!instance) {
      return;
    }

    if (typeof instance.unmount === 'function') {
      instance.unmount();
    }

    instances.delete(element);
    window.BAZAR.emit(window.BAZAR.events.sectionUnloaded, {
      element,
      id: getSectionId(element),
      type: getSectionType(element)
    });
  };

  const mountAll = (scope = document) => {
    scope.querySelectorAll('[data-bazar-section]').forEach(mount);
  };

  const register = (type, Controller) => {
    if (!type || typeof Controller !== 'function') {
      throw new TypeError('BAZAR.sections.register requires a section type and controller.');
    }

    controllers.set(type, Controller);
    mountAll();
  };

  window.BAZAR.sections = {
    mount,
    mountAll,
    register,
    unmount
  };

  window.BAZAR.ready(() => {
    mountAll();
    window.BAZAR.emit(window.BAZAR.events.ready);
  });

  document.addEventListener('shopify:section:load', (event) => {
    mountAll(event.target);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    event.target.querySelectorAll('[data-bazar-section]').forEach(unmount);
  });

  document.addEventListener('shopify:section:select', (event) => {
    window.BAZAR.emit(window.BAZAR.events.sectionSelected, { element: event.target });
  });

  document.addEventListener('shopify:section:deselect', (event) => {
    window.BAZAR.emit(window.BAZAR.events.sectionDeselected, { element: event.target });
  });

  document.addEventListener('shopify:section:reorder', (event) => {
    window.BAZAR.emit(window.BAZAR.events.sectionReordered, { element: event.target });
  });
})();
