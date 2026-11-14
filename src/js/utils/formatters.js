export function formatNumber(value, maximumFractionDigits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(number);
}

export function formatMoney(value) {
  return `${formatNumber(value, 2)} ₽`;
}

export function formatDate(dateString) {
  if (!dateString) return '-';

  const parts = String(dateString).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return dateString;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}
