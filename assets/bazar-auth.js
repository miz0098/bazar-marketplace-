const authFormSelector = '.bazar-auth-form';
const fieldSelector = '[data-bazar-auth-field]';
const errorSelector = '[data-bazar-field-error]';
const emailSelector = '[data-bazar-email]';
const passwordSelector = '[data-bazar-password]';
const passwordConfirmSelector = '[data-bazar-password-confirm]';
const checkboxGroupSelector = '[data-bazar-checkbox-group]';
const checkboxErrorSelector = '[data-bazar-checkbox-error]';
const recoverToggleSelector = '[data-bazar-auth-recover-toggle]';
const loginToggleSelector = '[data-bazar-auth-login-toggle]';
const loginCardSelector = '[data-bazar-auth-login-card]';
const recoverCardSelector = '[data-bazar-auth-recover-card]';

const messages = {
  required: "Заповніть це поле.",
  email: "Введіть коректний email.",
  passwordLength: "Пароль має містити щонайменше 8 символів.",
  passwordMatch: "Паролі мають збігатися.",
  checkboxes: "Підтвердіть усі обов'язкові умови.",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const setFieldError = (input, message = '') => {
  const field = input.closest(fieldSelector);
  const error = field?.querySelector(errorSelector);

  input.setAttribute('aria-invalid', message ? 'true' : 'false');

  if (error) {
    error.textContent = message;
  }
};

const validateInput = (input) => {
  const value = input.value.trim();

  if (input.required && value === '') {
    setFieldError(input, messages.required);
    return false;
  }

  if (input.matches(emailSelector) && value !== '' && !emailPattern.test(value)) {
    setFieldError(input, messages.email);
    return false;
  }

  if (input.matches(passwordSelector) && input.hasAttribute('minlength') && value.length > 0) {
    const minLength = Number(input.getAttribute('minlength'));

    if (value.length < minLength) {
      setFieldError(input, messages.passwordLength);
      return false;
    }
  }

  setFieldError(input);
  return true;
};

const validatePasswordConfirmation = (form) => {
  const password = form.querySelector(passwordSelector);
  const confirmation = form.querySelector(passwordConfirmSelector);

  if (!password || !confirmation) return true;

  if (confirmation.required && confirmation.value.trim() === '') {
    setFieldError(confirmation, messages.required);
    return false;
  }

  if (password.value !== confirmation.value) {
    setFieldError(confirmation, messages.passwordMatch);
    return false;
  }

  setFieldError(confirmation);
  return true;
};

const validateCheckboxGroups = (form) => {
  let isValid = true;

  form.querySelectorAll(checkboxGroupSelector).forEach((group) => {
    const requiredCheckboxes = [...group.querySelectorAll('input[type="checkbox"][required]')];
    const error = group.querySelector(checkboxErrorSelector);
    const groupValid = requiredCheckboxes.every((checkbox) => checkbox.checked);

    requiredCheckboxes.forEach((checkbox) => checkbox.setAttribute('aria-invalid', groupValid ? 'false' : 'true'));

    if (error) {
      error.textContent = groupValid ? '' : messages.checkboxes;
    }

    if (!groupValid) {
      isValid = false;
    }
  });

  return isValid;
};

const getPasswordStrength = (value) => {
  if (!value) return { score: 0, label: 'Надійність пароля' };

  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-ZА-ЯІЇЄҐ]/.test(value) && /[a-zа-яіїєґ]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/.test(value)) score += 1;

  if (score >= 3) return { score, label: 'Надійний пароль', value: 'strong' };
  if (score === 2) return { score, label: 'Середній пароль', value: 'medium' };
  return { score, label: 'Слабкий пароль', value: 'weak' };
};

const updatePasswordStrength = (input) => {
  const form = input.closest(authFormSelector);
  const meter = form?.querySelector('[data-bazar-password-strength]');
  const label = meter?.querySelector('[data-bazar-password-strength-label]');

  if (!meter || !label) return;

  const strength = getPasswordStrength(input.value);
  meter.dataset.strength = strength.value || 'empty';
  label.textContent = strength.label;
};

const validateForm = (form) => {
  const inputs = [...form.querySelectorAll('input')].filter((input) => input.type !== 'hidden' && input.type !== 'checkbox');
  const inputsValid = inputs.every(validateInput);
  const confirmationValid = validatePasswordConfirmation(form);
  const checkboxesValid = validateCheckboxGroups(form);

  return inputsValid && confirmationValid && checkboxesValid;
};

const showRecoverCard = () => {
  const loginCard = document.querySelector(loginCardSelector);
  const recoverCard = document.querySelector(recoverCardSelector);

  if (!loginCard || !recoverCard) return;

  loginCard.hidden = true;
  recoverCard.hidden = false;
  recoverCard.querySelector('input')?.focus({ preventScroll: false });
};

const showLoginCard = () => {
  const loginCard = document.querySelector(loginCardSelector);
  const recoverCard = document.querySelector(recoverCardSelector);

  if (!loginCard || !recoverCard) return;

  recoverCard.hidden = true;
  loginCard.hidden = false;
  loginCard.querySelector('input')?.focus({ preventScroll: false });
};

const initAuth = () => {
  document.querySelectorAll(authFormSelector).forEach((form) => {
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        validateInput(input);

        if (input.matches(passwordSelector)) {
          updatePasswordStrength(input);
          validatePasswordConfirmation(form);
        }

        if (input.matches(passwordConfirmSelector)) {
          validatePasswordConfirmation(form);
        }
      });

      input.addEventListener('blur', () => validateInput(input));
    });

    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => validateCheckboxGroups(form));
    });

    const password = form.querySelector(passwordSelector);

    if (password) {
      updatePasswordStrength(password);
    }

    form.addEventListener('submit', (event) => {
      if (event.submitter?.name === 'decline') return;

      if (!validateForm(form)) {
        event.preventDefault();
        form.querySelector('[aria-invalid="true"]')?.focus({ preventScroll: false });
      }
    });
  });

  document.querySelectorAll(recoverToggleSelector).forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      history.replaceState(null, '', '#recover');
      showRecoverCard();
    });
  });

  document.querySelectorAll(loginToggleSelector).forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      history.replaceState(null, '', window.location.pathname);
      showLoginCard();
    });
  });

  if (window.location.hash === '#recover' || document.querySelector(`${recoverCardSelector} .bazar-auth-alert--success`)) {
    showRecoverCard();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
