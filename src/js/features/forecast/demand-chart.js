import {
  Chart,
  CategoryScale,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { elements } from '../../dom.js';
import { ApiError } from '../../services/api-client.js';
import { formatNumber } from '../../utils/formatters.js';

Chart.register(
  CategoryScale,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

Chart.defaults.font.family = '"Geologica", "Segoe UI", system-ui, sans-serif';
Chart.defaults.color = '#6a6580';

let demandChartInstance = null;

function normalizePoints(points, seats) {
  if (!Array.isArray(points) || points.length !== 9) {
    throw new ApiError('Сервер должен вернуть девять сценариев спроса для построения графика.');
  }

  if (!Number.isFinite(seats) || seats < 0) {
    throw new ApiError('В ответе сервера указано некорректное количество мест.');
  }

  const normalized = points
    .map((point) => ({
      quantile: Number(point.quantile),
      demand: Number(point.demand),
      sales: Number(point.sales)
    }))
    .sort((left, right) => left.quantile - right.quantile);

  const isValid = normalized.every((point) =>
    Number.isFinite(point.quantile) &&
    point.quantile >= 0.1 &&
    point.quantile <= 0.9 &&
    Number.isFinite(point.demand) &&
    Number.isFinite(point.sales)
  );

  if (!isValid) {
    throw new ApiError('В ответе сервера обнаружены некорректные значения для графика.');
  }

  return normalized;
}

function getYAxisBounds(points, seats) {
  const demands = points.map((point) => point.demand);
  const minValue = Math.min(0, seats, ...demands);
  const maxValue = Math.max(0, seats, ...demands);
  const range = Math.max(maxValue - minValue, 1);
  const padding = range * 0.1;

  return {
    min: minValue - padding,
    max: maxValue + padding
  };
}

function createDatasets(points, seats) {
  const medianIndex = points.findIndex((point) => Math.abs(point.quantile - 0.5) < 0.0001);

  return [
    {
      label: 'Спрос',
      data: points.map((point) => point.demand),
      borderColor: '#3a1c9c',
      backgroundColor: 'rgba(58, 28, 156, 0.07)',
      borderWidth: 3,
      fill: true,
      tension: 0.28,
      cubicInterpolationMode: 'monotone',
      pointRadius: points.map((_, index) => index === medianIndex ? 8 : 5),
      pointHoverRadius: 9,
      pointBorderWidth: points.map((_, index) => index === medianIndex ? 3 : 2.5),
      pointBackgroundColor: points.map((_, index) => index === medianIndex ? '#3a1c9c' : '#ffffff'),
      pointBorderColor: points.map((_, index) => index === medianIndex ? '#ffffff' : '#3a1c9c'),
      pointHoverBackgroundColor: '#3a1c9c',
      pointHoverBorderColor: '#ffffff'
    },
    {
      label: 'Вместимость',
      data: points.map(() => seats),
      borderColor: '#d9791c',
      borderWidth: 2,
      borderDash: [7, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0
    }
  ];
}

export function renderDemandChart(points, seatsValue) {
  const seats = Number(seatsValue);
  const normalizedPoints = normalizePoints(points, seats);
  const yBounds = getYAxisBounds(normalizedPoints, seats);
  const labels = normalizedPoints.map((point) => point.quantile.toFixed(1));

  if (demandChartInstance) {
    demandChartInstance.destroy();
    demandChartInstance = null;
  }

  const context = elements.demandChart.getContext('2d');
  if (!context) {
    throw new ApiError('Не удалось инициализировать область графика.');
  }

  demandChartInstance = new Chart(context, {
    type: 'line',
    data: {
      labels,
      datasets: createDatasets(normalizedPoints, seats)
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 250
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      layout: {
        padding: {
          top: 6,
          right: 8,
          bottom: 0,
          left: 0
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1b1630',
          titleColor: '#ffffff',
          bodyColor: '#eeedf3',
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 13 },
          padding: 14,
          cornerRadius: 12,
          displayColors: true,
          callbacks: {
            title(items) {
              return items.length ? `Квантиль ${items[0].label}` : '';
            },
            label(context) {
              if (context.datasetIndex === 1) {
                return `Вместимость: ${formatNumber(seats)} мест`;
              }

              const point = normalizedPoints[context.dataIndex];
              return [
                `Спрос: ${formatNumber(point.demand, 2)}`,
                `Прогноз продаж: ${formatNumber(point.sales, 2)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          border: {
            display: false
          },
          ticks: {
            color: '#4a4560',
            padding: 10,
            font: {
              size: 13,
              weight: '500'
            }
          },
          title: {
            display: true,
            text: 'Квантиль прогноза',
            color: '#6a6580',
            padding: {
              top: 10
            },
            font: {
              size: 13,
              weight: '400'
            }
          }
        },
        y: {
          min: yBounds.min,
          max: yBounds.max,
          border: {
            display: false
          },
          grid: {
            color: '#e4e1ee',
            drawTicks: false
          },
          ticks: {
            color: '#6a6580',
            padding: 12,
            maxTicksLimit: 6,
            callback: (value) => formatNumber(value),
            font: {
              size: 13
            }
          },
          title: {
            display: true,
            text: 'Количество пассажиров',
            color: '#6a6580',
            font: {
              size: 13,
              weight: '400'
            }
          }
        }
      }
    }
  });

  elements.demandChart.setAttribute(
    'aria-label',
    `Спрос по квантилям от ${formatNumber(normalizedPoints[0].demand, 2)} до ${formatNumber(normalizedPoints.at(-1).demand, 2)} пассажиров. Вместимость самолёта — ${formatNumber(seats)} мест.`
  );
}
