import { API_ENDPOINTS } from '../../config.js';
import { elements } from '../../dom.js';
import { apiRequest } from '../../services/api-client.js';
import { showFormAlert, showToast } from '../../ui/notifications.js';
import { showLoggedOut } from '../auth/auth.js';
import {
  applyFieldErrors,
  clearFieldError,
  setSubmitting,
  updateDestinations,
  updateRouteFields,
  validateForm
} from './route-form.js';
import { renderForecast } from './forecast-view.js';

async function submitForecast(event) {
  event.preventDefault();
  if (elements.submitButton.disabled) return;

  const values = validateForm();
  if (!values) return;

  setSubmitting(true);

  try {
    const forecast = await apiRequest(API_ENDPOINTS.forecast, {
      method: 'POST',
      body: JSON.stringify(values)
    });

    renderForecast(forecast);
    showToast('Прогноз успешно рассчитан.', 'success');
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    if (error.payload?.fieldErrors) {
      applyFieldErrors(error.payload.fieldErrors);
    }

    showFormAlert(error.message || 'Не удалось рассчитать прогноз.');

    if (error.status === 401) {
      showLoggedOut();
    } else {
      showToast(error.message || 'Ошибка расчёта прогноза.', 'error');
    }
  } finally {
    setSubmitting(false);
  }
}

export function bindForecastForm() {
  elements.originSelect.addEventListener('change', () => {
    updateDestinations();
    clearFieldError('origin');
  });

  elements.destinationSelect.addEventListener('change', () => {
    updateRouteFields();
    clearFieldError('destination');
  });

  elements.forecastForm.addEventListener('submit', submitForecast);

  elements.priceInput.addEventListener('input', () => {
    elements.priceInput.dataset.userEdited = 'true';
    clearFieldError('price');
  });

  elements.dateInput.addEventListener('change', () => clearFieldError('date'));
  elements.dateInput.addEventListener('input', () => {
    const d = elements.dateInput.value.replace(/\D/g, '').slice(0, 8);
    elements.dateInput.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
    clearFieldError('date');
  });
}
