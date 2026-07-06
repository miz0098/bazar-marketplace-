const authRootSelector = '[data-bazar-auth]';
const authOpenSelector = '[data-bazar-auth-open]';
const authCloseSelector = '[data-bazar-auth-close]';
const stepSelector = '[data-bazar-auth-step]';
const phoneInputSelector = '[data-bazar-phone-input]';
const phoneErrorSelector = '[data-bazar-phone-error]';
const phoneSubmitSelector = '[data-bazar-auth-phone-submit]';
const codeInputSelector = '[data-bazar-sms-code-input]';
const codeSubmitSelector = '[data-bazar-auth-code-submit]';
const codeErrorSelector = '[data-bazar-sms-code-error]';
const oauthSelector = '[data-bazar-oauth-provider]';
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const rootState = new WeakMap();
let scrollLockState = null;

const codeErrorMessage = 'Введіть 6 цифр з SMS.';
const requiredMessage = 'Заповніть це поле.';
const emailErrorMessage = 'Введіть коректну електронну пошту.';
const termsErrorMessage = 'Підтвердьте згоду з умовами.';
const resendDurationSeconds = 120;
const resendRestartDelay = 120000;

async function checkCustomerByPhone(phone, context = {}) {
  // TODO: connect to api.bazar SMS authentication.
  if (window.BazarSmsAuth?.checkCustomerByPhone) {
    return window.BazarSmsAuth.checkCustomerByPhone(phone, context);
  }

  return { exists: context.intent !== 'register' };
}

async function requestSmsCode(phone) {
  // TODO: connect to api.bazar SMS authentication.
  if (window.BazarSmsAuth?.requestSmsCode) {
    return window.BazarSmsAuth.requestSmsCode(phone);
  }

  return { ok: true, uiOnly: true };
}

async function verifySmsCode(phone, code) {
  // TODO: connect to api.bazar SMS authentication.
  if (window.BazarSmsAuth?.verifySmsCode) {
    return window.BazarSmsAuth.verifySmsCode(phone, code);
  }

  return { ok: code.length === 6, uiOnly: true };
}

async function registerCustomerByPhone(data) {
  // TODO: connect to api.bazar SMS authentication.
  if (window.BazarSmsAuth?.registerCustomerByPhone) {
    return window.BazarSmsAuth.registerCustomerByPhone(data);
  }

  return { ok: true, uiOnly: true };
}

async function startOAuthAuthorization(provider) {
  // TODO: connect Google/Apple OAuth through api.bazar when backend support is ready.
  if (window.BazarSmsAuth?.startOAuthAuthorization) {
    return window.BazarSmsAuth.startOAuthAuthorization(provider);
  }

  return { ok: false, uiOnly: true };
}

const getState = (root) => {
  if (!rootState.has(root)) {
    rootState.set(root, {
      flow: root.dataset.bazarAuthInitialFlow || 'login',
      phoneDigits: '',
      phoneFull: '',
      timerId: null,
      timerRemaining: resendDurationSeconds,
      resendRestartId: null,
      previousFocus: null,
    });
  }

  return rootState.get(root);
};

const digitsOnly = (value) => value.replace(/\D/g, '');

const formatPhoneDigits = (digits) => {
  const clean = digits.slice(0, 9);
  const first = clean.slice(0, 2);
  const second = clean.slice(2, 5);
  const third = clean.slice(5, 7);
  const fourth = clean.slice(7, 9);

  return [first, second, third, fourth].filter(Boolean).join(' ');
};

const getPhoneDigitsFromInput = (input) => digitsOnly(input.value).slice(0, 9);

const formatFullPhone = (digits) => `+380 ${formatPhoneDigits(digits)}`;

const validatePhoneInput = (input) => {
  const digits = getPhoneDigitsFromInput(input);
  const isValid = digits.length === 9;
  const shouldMarkInvalid = !isValid && digits.length > 0;
  const field = input.closest('[data-bazar-phone-field]');
  const error = field?.querySelector(phoneErrorSelector);

  input.setAttribute('aria-invalid', shouldMarkInvalid ? 'true' : 'false');

  if (error) {
    error.textContent = '';
  }

  return isValid;
};

const syncPhoneInputs = (root) => {
  const state = getState(root);

  root.querySelectorAll(phoneInputSelector).forEach((input) => {
    input.value = formatPhoneDigits(state.phoneDigits);
    const submit = input.closest('form')?.querySelector(phoneSubmitSelector);

    if (submit) {
      submit.disabled = state.phoneDigits.length !== 9;
    }
  });

  root.querySelectorAll('[data-bazar-auth-phone-display]').forEach((element) => {
    element.textContent = state.phoneDigits.length === 9 ? formatFullPhone(state.phoneDigits) : '';
  });
};

const clearCodeInputs = (step) => {
  step.querySelectorAll(codeInputSelector).forEach((input) => {
    input.value = '';
    input.setAttribute('aria-invalid', 'false');
  });

  const error = step.querySelector(codeErrorSelector);
  const submit = step.querySelector(codeSubmitSelector);

  if (error) {
    error.textContent = '';
  }

  if (submit) {
    submit.disabled = true;
  }
};

const setActiveStep = (root, stepName) => {
  root.querySelectorAll(stepSelector).forEach((step) => {
    const isActive = step.dataset.bazarAuthStep === stepName;

    step.hidden = !isActive;
    step.classList.toggle('bazar-auth-card--active', isActive);

    if (isActive && stepName.includes('code')) {
      clearCodeInputs(step);
    }
  });

  syncPhoneInputs(root);

  const activeStep = root.querySelector(`${stepSelector}.bazar-auth-card--active`);
  const canFocus = root.dataset.bazarAuthSurface !== 'modal' || !root.hidden;

  if (canFocus) {
    const focusTarget = stepName.includes('code')
      ? activeStep?.querySelector(codeInputSelector)
      : activeStep?.querySelector(focusableSelector);

    focusTarget?.focus({ preventScroll: true });
  }
};

const stopTimer = (root) => {
  const state = getState(root);

  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  if (state.resendRestartId) {
    window.clearTimeout(state.resendRestartId);
    state.resendRestartId = null;
  }
};

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');

  return `${minutes}:${rest}`;
};

const getActiveStep = (root) => root.querySelector(`${stepSelector}.bazar-auth-card--active`);

const getResendElements = (root) => {
  const activeStep = getActiveStep(root);

  return {
    timer: activeStep?.querySelector('[data-bazar-auth-resend-timer]') || null,
    button: activeStep?.querySelector('[data-bazar-auth-resend]') || null,
    status: activeStep?.querySelector('[data-bazar-auth-resend-status]') || null,
  };
};

const showResendTimer = (root) => {
  const { timer, button, status } = getResendElements(root);

  if (timer) {
    timer.hidden = false;
  }

  if (button) {
    button.hidden = true;
    button.disabled = true;
    button.textContent = 'Не отримали код?';
  }

  if (status) {
    status.hidden = true;
  }
};

const showResendButton = (root) => {
  const { timer, button, status } = getResendElements(root);

  if (timer) {
    timer.hidden = true;
  }

  if (button) {
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Не отримали код?';
  }

  if (status) {
    status.hidden = true;
  }
};

const showResendStatus = (root) => {
  const state = getState(root);
  const { timer, button, status } = getResendElements(root);

  if (timer) {
    timer.hidden = true;
  }

  if (button) {
    button.hidden = true;
    button.disabled = true;
  }

  if (status) {
    status.hidden = false;
    status.textContent = 'Код відправлено повторно';
  }

  if (state.resendRestartId) {
    window.clearTimeout(state.resendRestartId);
  }

  state.resendRestartId = window.setTimeout(() => {
    state.resendRestartId = null;
    startTimer(root);
  }, resendRestartDelay);
};

const updateTimerText = (root) => {
  const state = getState(root);
  const { timer } = getResendElements(root);

  if (!timer) return;

  if (state.timerRemaining > 0) {
    showResendTimer(root);
    timer.textContent = `Відправити код повторно через ${formatTimer(state.timerRemaining)}`;
    return;
  }

  timer.textContent = 'Відправити код повторно через 00:00';
  showResendButton(root);
};

const startTimer = (root) => {
  const state = getState(root);

  stopTimer(root);
  state.timerRemaining = resendDurationSeconds;
  updateTimerText(root);

  state.timerId = window.setInterval(() => {
    state.timerRemaining = Math.max(0, state.timerRemaining - 1);
    updateTimerText(root);

    if (state.timerRemaining === 0) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }, 1000);
};

const goToPhoneStep = (root, flow) => {
  const state = getState(root);

  state.flow = flow;
  stopTimer(root);
  setActiveStep(root, `${flow}-phone`);
};

const goToCodeStep = async (root, flow) => {
  const state = getState(root);

  state.flow = flow;
  await requestSmsCode(state.phoneFull);
  setActiveStep(root, `${flow}-code`);
  startTimer(root);
};

const setButtonLoading = (button, isLoading, loadingText = 'Зачекайте...') => {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent.trim();
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
};

const handlePhoneSubmit = async (root, event, flow) => {
  event.preventDefault();

  const form = event.currentTarget;
  const input = form.querySelector(phoneInputSelector);
  const button = form.querySelector(phoneSubmitSelector);
  const state = getState(root);

  state.phoneDigits = getPhoneDigitsFromInput(input);
  state.phoneFull = `+380${state.phoneDigits}`;
  syncPhoneInputs(root);

  if (!validatePhoneInput(input)) {
    input.focus();
    return;
  }

  setButtonLoading(button, true, 'Перевіряємо...');

  try {
    const result = await checkCustomerByPhone(state.phoneFull, { intent: flow });
    const accountExists = Boolean(result?.exists);

    if (flow === 'login' && !accountExists) {
      goToPhoneStep(root, 'register');
      return;
    }

    if (flow === 'register' && accountExists) {
      await goToCodeStep(root, 'login');
      return;
    }

    await goToCodeStep(root, flow);
  } finally {
    setButtonLoading(button, false);
    syncPhoneInputs(root);
  }
};

const getCodeFromStep = (step) => [...step.querySelectorAll(codeInputSelector)].map((input) => input.value).join('');

const updateCodeSubmit = (step) => {
  const code = getCodeFromStep(step);
  const submit = step.querySelector(codeSubmitSelector);
  const error = step.querySelector(codeErrorSelector);

  if (submit) {
    submit.disabled = code.length !== 6;
  }

  if (error && code.length === 6) {
    error.textContent = '';
  }
};

const setCodeError = (step, message = '') => {
  const error = step.querySelector(codeErrorSelector);

  step.querySelectorAll(codeInputSelector).forEach((input) => {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  });

  if (error) {
    error.textContent = message;
  }
};

const handleCodeSubmit = async (root, event, flow) => {
  event.preventDefault();

  const step = event.currentTarget.closest(stepSelector);
  const button = event.currentTarget.querySelector(codeSubmitSelector);
  const state = getState(root);
  const code = getCodeFromStep(step);

  if (code.length !== 6) {
    setCodeError(step, codeErrorMessage);
    step.querySelector(codeInputSelector)?.focus();
    return;
  }

  setButtonLoading(button, true, 'Перевіряємо...');

  try {
    const result = await verifySmsCode(state.phoneFull, code);

    if (!result?.ok) {
      setCodeError(step, codeErrorMessage);
      return;
    }

    if (flow === 'login') {
      completeAuthFlow(root);
      return;
    }

    stopTimer(root);
    setActiveStep(root, 'register-profile');
  } finally {
    setButtonLoading(button, false);
    updateCodeSubmit(step);
  }
};

const setProfileFieldError = (input, message = '') => {
  const field = input.closest('[data-bazar-profile-field]');
  const error = field?.querySelector('[data-bazar-profile-error]');

  input.setAttribute('aria-invalid', message ? 'true' : 'false');

  if (error) {
    error.textContent = message;
  }
};

const validateProfileForm = (form) => {
  const firstName = form.querySelector('[data-bazar-profile-first-name]');
  const lastName = form.querySelector('[data-bazar-profile-last-name]');
  const email = form.querySelector('[data-bazar-profile-email]');
  const terms = form.querySelector('[data-bazar-profile-terms]');
  const termsError = form.querySelector('[data-bazar-profile-terms-error]');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isValid = true;

  [firstName, lastName].forEach((input) => {
    if (!input.value.trim()) {
      setProfileFieldError(input, requiredMessage);
      isValid = false;
    } else {
      setProfileFieldError(input);
    }
  });

  if (email.value.trim() && !emailPattern.test(email.value.trim())) {
    setProfileFieldError(email, emailErrorMessage);
    isValid = false;
  } else {
    setProfileFieldError(email);
  }

  if (!terms.checked) {
    terms.setAttribute('aria-invalid', 'true');
    if (termsError) termsError.textContent = termsErrorMessage;
    isValid = false;
  } else {
    terms.setAttribute('aria-invalid', 'false');
    if (termsError) termsError.textContent = '';
  }

  return isValid;
};

const handleProfileSubmit = async (root, event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('.bazar-auth-button');
  const state = getState(root);

  if (!validateProfileForm(form)) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  setButtonLoading(button, true, 'Створюємо...');

  try {
    await registerCustomerByPhone({
      phone: state.phoneFull,
      firstName: form.querySelector('[data-bazar-profile-first-name]').value.trim(),
      lastName: form.querySelector('[data-bazar-profile-last-name]').value.trim(),
      email: form.querySelector('[data-bazar-profile-email]').value.trim(),
      termsAccepted: true,
    });

    completeAuthFlow(root);
  } finally {
    setButtonLoading(button, false);
  }
};

const updateHeaderToProfile = () => {
  document.querySelectorAll(authOpenSelector).forEach((trigger) => {
    const label = trigger.querySelector('.bazar-header-action__label');
    const accountUrl = trigger.dataset.bazarAccountUrl || '/account';

    trigger.dataset.bazarAuthComplete = 'true';
    trigger.setAttribute('aria-label', 'Профіль');
    trigger.setAttribute('href', accountUrl);

    if (label) {
      label.textContent = 'Профіль';
    }
  });
};

const completeAuthFlow = (root) => {
  stopTimer(root);
  updateHeaderToProfile();

  if (root.dataset.bazarAuthSurface === 'modal') {
    closeModal(root, false);
    return;
  }

  window.location.assign(root.dataset.bazarAuthHomeUrl || '/');
};

const lockScroll = () => {
  if (scrollLockState) return;

  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

  scrollLockState = {
    scrollY,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
  };

  document.documentElement.classList.add('bazar-auth-scroll-lock');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
};

const unlockScroll = () => {
  if (!scrollLockState) return;

  const { scrollY } = scrollLockState;

  document.documentElement.classList.remove('bazar-auth-scroll-lock');
  document.documentElement.style.overflow = scrollLockState.htmlOverflow;
  document.body.style.overflow = scrollLockState.bodyOverflow;
  document.body.style.position = scrollLockState.bodyPosition;
  document.body.style.top = scrollLockState.bodyTop;
  document.body.style.width = scrollLockState.bodyWidth;
  scrollLockState = null;
  window.scrollTo(0, scrollY);
};

const openModal = (root) => {
  const state = getState(root);

  state.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.appendChild(root);
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  lockScroll();
  setActiveStep(root, `${state.flow}-phone`);
};

const closeModal = (root, restoreFocus = true) => {
  const state = getState(root);

  stopTimer(root);
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  unlockScroll();

  if (restoreFocus) {
    state.previousFocus?.focus({ preventScroll: true });
  }
};

const trapModalFocus = (root, event) => {
  if (event.key !== 'Tab' || root.dataset.bazarAuthSurface !== 'modal' || root.hidden) return;

  const focusable = [...root.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const initPhoneInput = (root, input) => {
  input.addEventListener('beforeinput', (event) => {
    if (event.data && /\D/.test(event.data)) {
      event.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    const state = getState(root);

    state.phoneDigits = getPhoneDigitsFromInput(input);
    input.value = formatPhoneDigits(state.phoneDigits);
    validatePhoneInput(input);
    syncPhoneInputs(root);
  });

  input.addEventListener('blur', () => validatePhoneInput(input));
};

const initCodeInput = (step, input, index, inputs) => {
  input.addEventListener('beforeinput', (event) => {
    if (event.data && /\D/.test(event.data)) {
      event.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    input.value = digitsOnly(input.value).slice(0, 1);

    if (input.value && inputs[index + 1]) {
      inputs[index + 1].focus();
    }

    updateCodeSubmit(step);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !input.value && inputs[index - 1]) {
      inputs[index - 1].focus();
    }
  });

  input.addEventListener('paste', (event) => {
    const pasted = digitsOnly(event.clipboardData.getData('text')).slice(0, 6);

    if (!pasted) return;

    event.preventDefault();

    inputs.forEach((codeInput, codeIndex) => {
      codeInput.value = pasted[codeIndex] || '';
    });

    inputs[Math.min(pasted.length, inputs.length) - 1]?.focus();
    updateCodeSubmit(step);
  });
};

const initAuthRoot = (root) => {
  if (root.dataset.bazarAuthReady === 'true') return;

  root.dataset.bazarAuthReady = 'true';
  getState(root);
  goToPhoneStep(root, root.dataset.bazarAuthInitialFlow || 'login');

  root.querySelectorAll(phoneInputSelector).forEach((input) => initPhoneInput(root, input));

  root.querySelectorAll('[data-bazar-auth-login-phone-form]').forEach((form) => {
    form.addEventListener('submit', (event) => handlePhoneSubmit(root, event, 'login'));
  });

  root.querySelectorAll('[data-bazar-auth-register-phone-form]').forEach((form) => {
    form.addEventListener('submit', (event) => handlePhoneSubmit(root, event, 'register'));
  });

  root.querySelectorAll('[data-bazar-auth-login-code-form]').forEach((form) => {
    form.addEventListener('submit', (event) => handleCodeSubmit(root, event, 'login'));
  });

  root.querySelectorAll('[data-bazar-auth-register-code-form]').forEach((form) => {
    form.addEventListener('submit', (event) => handleCodeSubmit(root, event, 'register'));
  });

  root.querySelectorAll('[data-bazar-auth-register-profile-form]').forEach((form) => {
    form.addEventListener('submit', (event) => handleProfileSubmit(root, event));
  });

  root.querySelectorAll('[data-bazar-sms-code]').forEach((group) => {
    const step = group.closest(stepSelector);
    const inputs = [...group.querySelectorAll(codeInputSelector)];

    inputs.forEach((input, index) => initCodeInput(step, input, index, inputs));
  });

  root.querySelectorAll('[data-bazar-auth-flow-switch]').forEach((button) => {
    button.addEventListener('click', () => goToPhoneStep(root, button.dataset.bazarAuthFlowSwitch));
  });

  root.querySelectorAll(oauthSelector).forEach((button) => {
    button.addEventListener('click', () => startOAuthAuthorization(button.dataset.bazarOauthProvider));
  });

  root.querySelectorAll('[data-bazar-auth-change-phone]').forEach((button) => {
    button.addEventListener('click', () => goToPhoneStep(root, getState(root).flow));
  });

  root.querySelectorAll('[data-bazar-auth-resend]').forEach((button) => {
    button.addEventListener('click', async () => {
      const state = getState(root);

      if (!state.phoneFull) return;

      await requestSmsCode(state.phoneFull);
      showResendStatus(root);
    });
  });

  root.querySelectorAll(authCloseSelector).forEach((button) => {
    button.addEventListener('click', () => closeModal(root));
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.bazarAuthSurface === 'modal' && !root.hidden) {
      event.preventDefault();
      closeModal(root);
      return;
    }

    trapModalFocus(root, event);
  });
};

const initAuth = () => {
  const roots = [...document.querySelectorAll(authRootSelector)];

  roots.forEach(initAuthRoot);

  document.querySelectorAll(authOpenSelector).forEach((trigger) => {
    if (trigger.dataset.bazarAuthOpenReady === 'true') return;

    trigger.dataset.bazarAuthOpenReady = 'true';

    trigger.addEventListener('click', (event) => {
      if (trigger.dataset.bazarAuthComplete === 'true') return;

      const root = document.querySelector(`${authRootSelector}[data-bazar-auth-surface="modal"]`);

      if (!root) return;

      event.preventDefault();
      openModal(root);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
