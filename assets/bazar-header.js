/* Disclosure behavior only; no auth/storage, fetch, cart or search interception. */
class BazarCatalogController {
  constructor(root) {
    this.root = root;
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && root.open) {
        event.preventDefault();
        root.open = false;
        root.querySelector('summary')?.focus();
      }
    }, options);
    document.addEventListener('click', (event) => {
      if (root.open && !root.contains(event.target)) root.open = false;
    }, options);
    root.addEventListener('focusout', (event) => {
      if (event.relatedTarget instanceof Node && !root.contains(event.relatedTarget)) root.open = false;
    }, options);
  }
  disconnect() { this.abort.abort(); }
}
const controllers = new Map();
function mount(scope = document) {
  for (const root of scope.querySelectorAll('.bazar-catalog-details')) {
    if (!controllers.has(root)) controllers.set(root, new BazarCatalogController(root));
  }
}
mount();
document.addEventListener('shopify:section:load', (event) => mount(event.target));
document.addEventListener('shopify:section:unload', (event) => {
  for (const [root, controller] of controllers) {
    if (event.target.contains(root)) { controller.disconnect(); controllers.delete(root); }
  }
});
