import { API_ENDPOINTS } from '../../config.js';
import { elements } from '../../dom.js';
import { state } from '../../state.js';
import { apiRequest, parseResponse, refreshAccessToken, ApiError } from '../../services/api-client.js';
import { populateOrigins } from '../forecast/route-form.js';
import { setSystemStatus, showFormAlert, showToast } from '../../ui/notifications.js';

function authErrorMessage(code) {
  const messages = {
    access_denied: 'Вы отменили вход через Яндекс.',
    invalid_state: 'Сессия входа устарела. Попробуйте войти ещё раз.',
    invalid_request: 'Не удалось завершить вход. Попробуйте ещё раз.',
    yandex_error: 'Яндекс не смог завершить авторизацию. Попробуйте позже.',
    server_error: 'На сервере произошла ошибка авторизации. Попробуйте позже.'
  };

  return messages[code] || 'Не удалось выполнить вход через Яндекс. Попробуйте ещё раз.';
}

export function showLoggedOut() {
  state.accessToken = null;
  state.authenticated = false;
  state.routes = [];
  state.currentForecast = null;

  elements.loadingCard.hidden = true;
  elements.workspace.hidden = true;
  elements.authGate.hidden = false;
  elements.headerLoginButton.hidden = false;
  elements.userMenu.hidden = true;
  elements.resultSection.hidden = true;
  elements.emptyResult.hidden = false;

  setSystemStatus('', 'Требуется авторизация');
}

function showLoggedIn() {
  state.authenticated = true;
  elements.loadingCard.hidden = true;
  elements.authGate.hidden = true;
  elements.workspace.hidden = false;
  elements.headerLoginButton.hidden = true;
  elements.userMenu.hidden = false;
  setSystemStatus('online', 'Подключено');
}

async function loadWorkspace() {
  showLoggedIn();
  elements.originSelect.disabled = true;
  elements.destinationSelect.disabled = true;
  elements.dateInput.disabled = true;
  elements.priceInput.disabled = true;
  elements.submitButton.disabled = true;

  try {
    const [me, routesPayload] = await Promise.all([
      apiRequest(API_ENDPOINTS.me),
      apiRequest(API_ENDPOINTS.routes)
    ]);

    const routes = Array.isArray(routesPayload)
      ? routesPayload
      : routesPayload?.routes;

    if (!Array.isArray(routes) || routes.length === 0) {
      throw new ApiError(
        'Сервер не вернул доступные маршруты. Попробуйте ещё раз.'
      );
    }

    state.routes = routes;
    elements.userLabel.textContent = me?.userId
      ? `ID · ${String(me.userId).slice(-6)}`
      : 'Пользователь';

    populateOrigins('MOW');
    setSystemStatus('online', 'Подключено');
  } catch (error) {
    if (error.status === 401) {
      showLoggedOut();
      return;
    }

    setSystemStatus('offline', 'Ошибка подключения');
    showFormAlert(error.message || 'Не удалось загрузить маршруты.');
    showToast(error.message || 'Не удалось загрузить маршруты.', 'error');
  }
}

export function startLogin() {
  window.location.href = API_ENDPOINTS.yandex || '/api/auth/yandex';
}

export async function logout() {
  elements.logoutButton.disabled = true;
  let logoutError = null;

  try {
    const response = await fetch(API_ENDPOINTS.logout, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok && response.status !== 204) {
      const payload = await parseResponse(response);
      throw new ApiError(
        payload?.message || 'Не удалось завершить выход.',
        response.status,
        payload
      );
    }
  } catch (error) {
    logoutError = error;
  } finally {
    state.accessToken = null;
    state.authenticated = false;
    state.routes = [];
    state.currentForecast = null;
    showLoggedOut();
    elements.logoutButton.disabled = false;
  }

  if (logoutError) {
    showToast(
      logoutError.message || 'Не удалось связаться с сервером при выходе.',
      'error'
    );
  } else {
    showToast('Вы вышли из аккаунта.', 'success');
  }
}

export async function initializeAuth() {
  const url = new URL(window.location.href);
  const authError = url.searchParams.get('auth_error');

  if (authError) {
    url.searchParams.delete('auth_error');
    window.history.replaceState(
      {},
      document.title,
      `${url.pathname}${url.search}${url.hash}`
    );
    showToast(authErrorMessage(authError), 'error');
  }

  elements.authGate.hidden = true;
  elements.workspace.hidden = true;
  elements.loadingCard.hidden = false;
  setSystemStatus('', 'Проверяем подключение');

  try {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      showLoggedOut();
      return;
    }

    await loadWorkspace();
  } catch (error) {
    showLoggedOut();
    setSystemStatus('offline', 'Сервер недоступен');
    showToast(error.message || 'Не удалось восстановить сессию.', 'error');
  }
}
