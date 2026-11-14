import { elements } from '../dom.js';

export function setSystemStatus(mode, message) {
  elements.systemStatus.classList.remove('online', 'offline');
  if (mode) elements.systemStatus.classList.add(mode);
  elements.systemStatusText.textContent = message;
}

export function showToast(message, type = 'info') {
  if (!message) return;

  const toast = document.createElement('div');
  const modifier = type === 'error' || type === 'success' ? ` ${type}` : '';
  toast.className = `toast${modifier}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-5px)';
    window.setTimeout(() => toast.remove(), 220);
  }, 4200);
}

export function showFormAlert(message) {
  elements.formAlert.textContent = message;
  elements.formAlert.hidden = false;
}

export function clearFormAlert() {
  elements.formAlert.textContent = '';
  elements.formAlert.hidden = true;
}
