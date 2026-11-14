import flatpickr from 'flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';
import { elements } from '../../dom.js';
import { state } from '../../state.js';
import { formatDate, formatMoney } from '../../utils/formatters.js';
import { clearFormAlert, showToast } from '../../ui/notifications.js';

const toDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const toIso = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || '');
  if (!m) return '';
  const [, d, mo, y] = m;
  const dt = new Date(+y, +mo - 1, +d);
  const valid = dt.getFullYear() === +y && dt.getMonth() === +mo - 1 && dt.getDate() === +d;
  return valid ? `${y}-${mo}-${d}` : '';
};

const datePicker = flatpickr(elements.dateInput, {
  locale: Russian,
  dateFormat: 'd/m/Y',
  allowInput: true,
  disableMobile: true
});

function getCity(route, key) {
  const cityKey = key === 'origin' ? 'originCity' : 'destinationCity';
  return route[cityKey] || route[key] || '—';
}

export function getCurrentRoute() {
  return state.routes.find((route) =>
    route.origin === elements.originSelect.value &&
    route.destination === elements.destinationSelect.value
  ) || null;
}

function setSelectOptions(select, items, selectedValue, placeholder) {
  select.replaceChildren();

  if (!items.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    select.append(option);
    select.disabled = true;
    return;
  }

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  }

  select.disabled = false;
  if (items.some((item) => item.value === selectedValue)) {
    select.value = selectedValue;
  } else {
    select.selectedIndex = 0;
  }
}

export function populateOrigins(preferredOrigin = '') {
  const uniqueOrigins = [...new Set(
    state.routes.map((route) => route.origin).filter(Boolean)
  )].sort();

  const options = uniqueOrigins.map((code) => {
    const sample = state.routes.find((route) => route.origin === code);
    return { value: code, label: `${getCity(sample, 'origin')} · ${code}` };
  });

  setSelectOptions(
    elements.originSelect,
    options,
    preferredOrigin,
    'Нет доступных маршрутов'
  );
  updateDestinations();
}

export function updateDestinations(preferredDestination = '') {
  const origin = elements.originSelect.value;
  const matchingRoutes = state.routes.filter((route) => route.origin === origin);
  const destinations = [...new Set(
    matchingRoutes.map((route) => route.destination).filter(Boolean)
  )].sort();

  const options = destinations.map((code) => {
    const sample = matchingRoutes.find((route) => route.destination === code);
    return { value: code, label: `${getCity(sample, 'destination')} · ${code}` };
  });

  setSelectOptions(
    elements.destinationSelect,
    options,
    preferredDestination,
    'Нет направлений'
  );
  updateRouteFields();
}

export function clearFieldError(fieldName) {
  const field = document.querySelector(`[data-error-for="${fieldName}"]`);
  const group = field?.closest('.field-group');
  if (field) field.textContent = '';
  if (group) group.classList.remove('invalid');
}

export function setFieldError(fieldName, message) {
  const field = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (!field) return;

  field.textContent = message;
  field.closest('.field-group')?.classList.add('invalid');
}

export function updateRouteFields() {
  const route = getCurrentRoute();
  const enabled = Boolean(route);

  elements.dateInput.disabled = !enabled;
  elements.priceInput.disabled = !enabled;
  elements.submitButton.disabled = !enabled || state.submitting;

  if (!route) {
    datePicker.clear(false);
    datePicker.set('minDate', null);
    datePicker.set('maxDate', null);
    elements.priceInput.value = '';
    elements.basePriceHint.textContent = 'Базовая цена появится после выбора маршрута';
    elements.dateHint.textContent = 'Доступный период зависит от рейса';
    return;
  }

  datePicker.set('minDate', route.firstDate ? toDisplay(route.firstDate) : null);
  datePicker.set('maxDate', route.lastDate ? toDisplay(route.lastDate) : null);

  const currentDate = toIso(elements.dateInput.value);
  if (
    !currentDate ||
    (route.firstDate && currentDate < route.firstDate) ||
    (route.lastDate && currentDate > route.lastDate)
  ) {
    datePicker.setDate(route.firstDate || '', false, 'Y-m-d');
  }

  const currentPrice = Number(elements.priceInput.value);
  if (
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    !elements.priceInput.dataset.userEdited
  ) {
    elements.priceInput.value = route.basePrice ?? '';
  }
  elements.priceInput.dataset.userEdited = '';

  elements.basePriceHint.textContent = Number.isFinite(Number(route.basePrice))
    ? `Базовая цена: ${formatMoney(route.basePrice)}`
    : 'Базовая цена не указана';
  elements.dateHint.textContent = route.firstDate && route.lastDate
    ? `Доступно: ${formatDate(route.firstDate)} — ${formatDate(route.lastDate)}`
    : 'Доступный период зависит от рейса';

  for (const field of ['origin', 'destination', 'date', 'price']) {
    clearFieldError(field);
  }
  clearFormAlert();
}

export function validateForm() {
  const values = {
    origin: elements.originSelect.value.trim().toUpperCase(),
    destination: elements.destinationSelect.value.trim().toUpperCase(),
    date: toIso(elements.dateInput.value),
    price: Number(elements.priceInput.value)
  };

  let valid = true;
  for (const field of ['origin', 'destination', 'date', 'price']) {
    clearFieldError(field);
  }
  clearFormAlert();

  if (!/^[A-Z]{3}$/.test(values.origin)) {
    setFieldError('origin', 'Выберите корректный код отправления.');
    valid = false;
  }

  if (!/^[A-Z]{3}$/.test(values.destination)) {
    setFieldError('destination', 'Выберите корректный код назначения.');
    valid = false;
  }

  if (values.origin && values.origin === values.destination) {
    setFieldError(
      'destination',
      'Пункты отправления и назначения должны различаться.'
    );
    valid = false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    setFieldError('date', 'Укажите дату вылета.');
    valid = false;
  } else {
    const route = getCurrentRoute();
    if (route?.firstDate && values.date < route.firstDate) {
      setFieldError('date', `Дата не может быть раньше ${formatDate(route.firstDate)}.`);
      valid = false;
    } else if (route?.lastDate && values.date > route.lastDate) {
      setFieldError('date', `Дата не может быть позже ${formatDate(route.lastDate)}.`);
      valid = false;
    }
  }

  if (!Number.isFinite(values.price) || values.price <= 0 || values.price > 10000000) {
    setFieldError('price', 'Цена должна быть больше 0 и не превышать 10 000 000 ₽.');
    valid = false;
  }

  return valid ? values : null;
}

export function setSubmitting(isSubmitting) {
  state.submitting = isSubmitting;
  elements.submitButton.disabled = isSubmitting || !getCurrentRoute();
  elements.submitButton.classList.toggle('is-loading', isSubmitting);
  elements.submitButton.querySelector('.submit-label').textContent = isSubmitting
    ? 'Считаем прогноз…'
    : 'Рассчитать прогноз';
  elements.forecastForm.setAttribute('aria-busy', String(isSubmitting));
}

export function applyFieldErrors(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object') return;

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (['origin', 'destination', 'date', 'price'].includes(field)) {
      setFieldError(field, String(message));
    }
  }
}