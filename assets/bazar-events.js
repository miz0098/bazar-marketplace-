(() => {
  if (!window.BAZAR) {
    return;
  }

  window.BAZAR.events = Object.freeze({
    ready: 'bazar:ready',
    sectionLoaded: 'bazar:section:loaded',
    sectionUnloaded: 'bazar:section:unloaded',
    sectionSelected: 'bazar:section:selected',
    sectionDeselected: 'bazar:section:deselected',
    sectionReordered: 'bazar:section:reordered'
  });
})();
