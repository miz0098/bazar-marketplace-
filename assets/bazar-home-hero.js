const heroSliderSelector = '[data-bazar-home-hero-slider]';
const heroViewportSelector = '[data-bazar-home-hero-viewport]';
const heroSlideSelector = '[data-bazar-home-hero-slide]';
const heroDotSelector = '[data-bazar-home-hero-dot]';
const heroPrevSelector = '[data-bazar-home-hero-prev]';
const heroNextSelector = '[data-bazar-home-hero-next]';
const autoplayDelay = 2500;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const initHomeHeroSlider = (slider) => {
  if (slider.dataset.bazarHomeHeroReady === 'true') return;

  const viewport = slider.querySelector(heroViewportSelector);
  const slides = [...slider.querySelectorAll(heroSlideSelector)];
  const dots = [...slider.querySelectorAll(heroDotSelector)];
  const prevButton = slider.querySelector(heroPrevSelector);
  const nextButton = slider.querySelector(heroNextSelector);

  if (!viewport || slides.length === 0) return;

  slider.dataset.bazarHomeHeroReady = 'true';

  let activeIndex = 0;
  let scrollFrame = null;
  let autoplayTimer = null;
  let isPaused = false;

  const setSlideFocusState = (slide, isActive) => {
    const focusableItems = slide.querySelectorAll('a, button, input, select, textarea, [tabindex]');

    focusableItems.forEach((item) => {
      if (isActive) {
        if (item.dataset.bazarHeroTabindex) {
          item.setAttribute('tabindex', item.dataset.bazarHeroTabindex);
          delete item.dataset.bazarHeroTabindex;
        } else {
          item.removeAttribute('tabindex');
        }
        return;
      }

      if (item.hasAttribute('tabindex')) {
        item.dataset.bazarHeroTabindex = item.getAttribute('tabindex');
      }
      item.setAttribute('tabindex', '-1');
    });
  };

  const updateState = (index) => {
    activeIndex = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      setSlideFocusState(slide, isActive);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeIndex);
      dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
    });
  };

  const getActiveIndex = () => {
    const slideWidth = viewport.clientWidth || 1;
    return Math.round(viewport.scrollLeft / slideWidth);
  };

  const goToSlide = (index) => {
    const nextIndex = (index + slides.length) % slides.length;
    viewport.scrollTo({
      left: slides[nextIndex].offsetLeft,
      behavior: 'smooth',
    });
    updateState(nextIndex);
  };

  const stopAutoplay = () => {
    if (!autoplayTimer) return;
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };

  const startAutoplay = () => {
    if (reducedMotionQuery.matches || slides.length < 2 || isPaused || autoplayTimer) return;

    autoplayTimer = window.setInterval(() => {
      goToSlide(activeIndex + 1);
    }, autoplayDelay);
  };

  const restartAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  const pauseAutoplay = () => {
    isPaused = true;
    stopAutoplay();
  };

  const resumeAutoplay = () => {
    isPaused = false;
    startAutoplay();
  };

  const handleManualNavigation = (index) => {
    goToSlide(index);
    restartAutoplay();
  };

  viewport.addEventListener('scroll', () => {
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);

    scrollFrame = window.requestAnimationFrame(() => {
      updateState(getActiveIndex());
    });
  });

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleManualNavigation(activeIndex - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleManualNavigation(activeIndex + 1);
    }
  });

  slider.addEventListener('mouseenter', pauseAutoplay);
  slider.addEventListener('mouseleave', resumeAutoplay);
  slider.addEventListener('focusin', pauseAutoplay);
  slider.addEventListener('focusout', (event) => {
    if (!slider.contains(event.relatedTarget)) {
      resumeAutoplay();
    }
  });

  const handleReducedMotionChange = () => {
    if (reducedMotionQuery.matches) {
      stopAutoplay();
      return;
    }

    startAutoplay();
  };

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
  } else if (reducedMotionQuery.addListener) {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  prevButton?.addEventListener('click', () => handleManualNavigation(activeIndex - 1));
  nextButton?.addEventListener('click', () => handleManualNavigation(activeIndex + 1));

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const dotIndex = Number.parseInt(dot.dataset.slideIndex || '0', 10);
      handleManualNavigation(dotIndex);
    });
  });

  updateState(0);
  startAutoplay();
};

const initHomeHeroSliders = () => {
  document.querySelectorAll(heroSliderSelector).forEach(initHomeHeroSlider);
};

document.addEventListener('shopify:section:load', initHomeHeroSliders);
initHomeHeroSliders();
