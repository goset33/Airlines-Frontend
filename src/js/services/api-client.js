import { API_ENDPOINTS } from '../config.js';
import { state } from '../state.js';

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text ? { message: text } : null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function refreshAccessToken() {
  if (state.refreshPromise) return state.refreshPromise;

  state.refreshPromise = (async () => {
    let response;

    try {
      response = await fetch(API_ENDPOINTS.refresh, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
    } catch {
      throw new ApiError(
        'Не удалось связаться с сервером авторизации. Проверьте подключение и настройки API.'
      );
    }

    if (response.status === 401) {
      state.accessToken = null;
      return false;
    }

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new ApiError(
        payload?.message || 'Не удалось обновить сессию.',
        response.status,
        payload
      );
    }

    if (!payload || typeof payload.accessToken !== 'string' || !payload.accessToken) {
      throw new ApiError('Сервер авторизации вернул некорректный ответ.');
    }

    state.accessToken = payload.accessToken;
    return true;
  })();

  try {
    return await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
  }
}

export async function apiRequest(path, options = {}, retryAfterRefresh = true) {
  if (!state.accessToken) {
    throw new ApiError('Требуется авторизация.', 401);
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${state.accessToken}`);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Проверьте подключение к API.');
  }

  if (response.status === 401 && retryAfterRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiRequest(path, options, false);
    }

    state.accessToken = null;
    throw new ApiError('Срок действия сессии истёк. Войдите снова.', 401);
  }

  if (response.status === 401) {
    state.accessToken = null;
    throw new ApiError('Не удалось подтвердить сессию. Войдите снова.', 401);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Ошибка запроса (${response.status}).`,
      response.status,
      payload
    );
  }

  return payload;
}
