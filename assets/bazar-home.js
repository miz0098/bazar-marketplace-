/* Presentation only: no commerce requests, storage, autoplay or newsletter interception. */
class BazarHomeCarousel extends HTMLElement {
  connectedCallback() {
    this.abort?.abort();
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    this.slides = [...this.querySelectorAll('[data-home-slide]')];
    if (!this.slides.length) return;
    this.index = 0;
    this.querySelector('[data-carousel-controls]')?.removeAttribute('hidden');
    this.querySelector('[data-slide-prev]')?.addEventListener('click', () => this.show(this.index - 1), options);
    this.querySelector('[data-slide-next]')?.addEventListener('click', () => this.show(this.index + 1), options);
    this.querySelectorAll('[data-slide-index]').forEach(button => button.addEventListener('click', () => this.show(Number(button.dataset.slideIndex)), options));
    this.addEventListener('keydown', event => {
      if (event.target !== this && !event.target.closest('[data-slide-prev],[data-slide-next],[data-slide-index]')) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      this.show(event.key === 'Home' ? 0 : event.key === 'End' ? this.slides.length - 1 : this.index + (event.key === 'ArrowLeft' ? -1 : 1));
    }, options);
    document.addEventListener('shopify:block:select', event => {
      const index = this.slides.findIndex(slide => slide === event.target || slide.contains(event.target));
      if (index >= 0) this.show(index);
    }, options);
    this.show(0);
  }
  show(index) {
    this.index = (index + this.slides.length) % this.slides.length;
    this.slides.forEach((slide, i) => { slide.hidden = i !== this.index; });
    this.querySelectorAll('[data-slide-index]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.slideIndex) === this.index)));
    const status = this.querySelector('[data-slide-status]');
    if (status) status.textContent = `Слайд ${this.index + 1} з ${this.slides.length}`;
  }
  disconnectedCallback() { this.abort?.abort(); }
}
class BazarHomeRail extends HTMLElement {
  connectedCallback() {
    this.abort?.abort();
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    this.track = this.querySelector('[data-home-track]');
    if (!this.track) return;
    const move = direction => this.track.scrollBy({ left: direction * this.track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    this.querySelector('[data-rail-prev]')?.addEventListener('click', () => move(-1), options);
    this.querySelector('[data-rail-next]')?.addEventListener('click', () => move(1), options);
    this.track.addEventListener('keydown', event => {
      if (event.target !== this.track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
    }, options);
    this.track.addEventListener('scroll', () => this.update(), options);
    this.observer = new ResizeObserver(() => this.update());
    this.observer.observe(this.track);
    this.update();
  }
  update() {
    const overflow = this.track.scrollWidth > this.track.clientWidth + 2;
    const controls = this.querySelector('[data-rail-controls]');
    if (controls) controls.hidden = !overflow;
    const prev = this.querySelector('[data-rail-prev]'), next = this.querySelector('[data-rail-next]');
    if (prev) prev.disabled = this.track.scrollLeft <= 1;
    if (next) next.disabled = this.track.scrollLeft + this.track.clientWidth >= this.track.scrollWidth - 2;
  }
  disconnectedCallback() { this.abort?.abort(); this.observer?.disconnect(); }
}
if (!customElements.get('bazar-home-carousel')) customElements.define('bazar-home-carousel', BazarHomeCarousel);
if (!customElements.get('bazar-home-rail')) customElements.define('bazar-home-rail', BazarHomeRail);
