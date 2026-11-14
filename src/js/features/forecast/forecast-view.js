import { elements } from '../../dom.js';
import { state } from '../../state.js';
import { ApiError } from '../../services/api-client.js';
import { formatDate, formatMoney, formatNumber } from '../../utils/formatters.js';
import { renderDemandChart } from './demand-chart.js';

export function renderForecast(data) {
  if (!data || !Array.isArray(data.points) || data.points.length === 0) {
    throw new ApiError('Сервер вернул прогноз без данных для графика.');
  }

  state.currentForecast = data;
  elements.resultDate.textContent = formatDate(data.date);
  elements.summaryOriginCode.textContent = data.origin || '—';
  elements.summaryDestinationCode.textContent = data.destination || '—';
  elements.summaryOriginCity.textContent = data.originCity || data.origin || '—';
  elements.summaryDestinationCity.textContent = data.destinationCity || data.destination || '—';
  elements.summaryRouteCode.textContent = data.route || `${data.origin || ''} — ${data.destination || ''}`;
  elements.summaryPrice.textContent = formatMoney(data.price);
  elements.summaryBasePrice.textContent = `Базовая: ${formatMoney(data.basePrice)}`;

  elements.seatsValue.textContent = formatNumber(data.seats);
  elements.salesValue.textContent = formatNumber(data.predictedSalesRounded);
  elements.freeSeatsValue.textContent = formatNumber(data.freeSeats);

  if (data.capacityReached) {
    elements.capacityNoticeText.textContent = `Медианный спрос (${formatNumber(data.demand, 2)} пассажиров) достигает или превышает вместимость рейса. Продажи ограничены ${formatNumber(data.seats)} местами.`;
    elements.capacityNotice.hidden = false;
  } else if (Number(data.demand) < 0) {
    elements.capacityNoticeText.textContent = 'Медианный спрос при этой цене отрицательный. Прогноз продаж равен нулю.';
    elements.capacityNotice.hidden = false;
  } else {
    elements.capacityNotice.hidden = true;
  }

  elements.resultSection.hidden = false;
  elements.emptyResult.hidden = true;
  renderDemandChart(data.points, Number(data.seats));
}
