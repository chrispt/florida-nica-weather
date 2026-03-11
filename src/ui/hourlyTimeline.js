/**
 * Hour-by-hour timeline for race weekend
 * Scrollable, with race hours highlighted
 */

import { formatTemperature, formatWindSpeed, formatPercent } from '../utils/formatting.js';
import { getWeatherIcon } from '../config/weatherCodes.js';
import { THUNDERSTORM_CODES, HEAVY_RAIN_CODES, WIND_THRESHOLDS } from '../config/constants.js';

export function renderHourlyTimeline(container, weatherData, race) {
    if (!weatherData || !weatherData.hourly) {
        container.innerHTML = '';
        return;
    }

    const startDate = race.dates.start;
    const endDate = race.dates.end;

    // Get all hourly data for the race weekend
    const raceWeekendHours = weatherData.hourly.filter(h => {
        const dateStr = h.time.toISOString().slice(0, 10);
        return dateStr >= startDate && dateStr <= endDate;
    });

    if (raceWeekendHours.length === 0) {
        container.innerHTML = `<div class="widget__detail" style="padding: var(--space-md); color: var(--color-text-muted);">
            Hourly data not yet available for race weekend (forecast only extends ~16 days)
        </div>`;
        return;
    }

    // Group by day
    const dayGroups = groupByDay(raceWeekendHours);
    const dayKeys = Object.keys(dayGroups);

    container.innerHTML = `
        <div class="timeline">
            <div class="timeline__header">
                <div class="timeline__title">Race Weekend Hourly Forecast</div>
                <div class="timeline__day-tabs">
                    ${dayKeys.map((day, i) => `
                        <button class="timeline__tab ${i === 0 ? 'timeline__tab--active' : ''}"
                                data-day="${day}">
                            ${formatDayLabel(day)}
                        </button>
                    `).join('')}
                </div>
            </div>
            ${dayKeys.map((day, i) => `
                <div class="timeline__scroll ${i === 0 ? '' : 'hidden'}" data-day-content="${day}">
                    <div class="timeline__grid">
                        ${dayGroups[day].map(h => renderHourCell(h, race)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>`;

    // Tab switching
    const tabs = container.querySelectorAll('.timeline__tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const day = tab.dataset.day;
            tabs.forEach(t => t.classList.remove('timeline__tab--active'));
            tab.classList.add('timeline__tab--active');

            container.querySelectorAll('.timeline__scroll').forEach(s => s.classList.add('hidden'));
            container.querySelector(`[data-day-content="${day}"]`).classList.remove('hidden');
        });
    });
}

function renderHourCell(hour, race) {
    const h = hour.time.getHours();
    const isRaceHour = h >= race.raceHours.start && h <= race.raceHours.end;
    const icon = getWeatherIcon(hour.weatherCode);
    const timeStr = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;

    const precipStr = hour.precipProbability > 0 ? `${formatPercent(hour.precipProbability)}` : '';

    // Danger/warning classification
    let hazardClass = '';
    if (THUNDERSTORM_CODES.includes(hour.weatherCode)) {
        hazardClass = 'timeline__hour--danger';
    } else if (
        HEAVY_RAIN_CODES.includes(hour.weatherCode) ||
        hour.precipProbability > 70 ||
        hour.windSpeed > WIND_THRESHOLDS.ADVISORY_KMH
    ) {
        hazardClass = 'timeline__hour--warning';
    }

    return `
        <div class="timeline__hour ${isRaceHour ? 'timeline__hour--race' : ''} ${hazardClass}">
            <span class="timeline__hour-time">${timeStr}</span>
            <span class="timeline__hour-icon">${icon.icon}</span>
            <span class="timeline__hour-temp">${formatTemperature(hour.temperature)}</span>
            ${precipStr ? `<span class="timeline__hour-precip">${precipStr}</span>` : ''}
            <span class="timeline__hour-wind">${formatWindSpeed(hour.windSpeed)}</span>
        </div>`;
}

function groupByDay(hours) {
    const groups = {};
    for (const h of hours) {
        const day = h.time.toISOString().slice(0, 10);
        if (!groups[day]) groups[day] = [];
        groups[day].push(h);
    }
    return groups;
}

function formatDayLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
