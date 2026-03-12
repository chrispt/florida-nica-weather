/**
 * Weather detail widgets — rain history, soil moisture, wind, temp, race-day summary, heat safety, nowcast
 */

import { formatTemperature, formatWindSpeed, getWindDirectionLabel, formatPrecipitation, formatSoilMoisture, formatPercent } from '../utils/formatting.js';
import { getWeatherDescription, getWeatherIcon } from '../config/weatherCodes.js';
import { TRAIL_THRESHOLDS, UV_THRESHOLDS, WEATHER_ICONS } from '../config/constants.js';
import { renderHeatSafetyWidget } from './heatSafetyWidget.js';
import { renderNowcastWidget } from './nowcastWidget.js';
import { getRaceHourlyWindow } from '../config/riskAssessment.js';

export function renderWeatherDetails(container, weatherData, race, nowcastData = null, climateDeparture = null) {
    if (!weatherData || !weatherData.hourly || weatherData.hourly.length === 0) {
        container.innerHTML = '<div class="loading"><div class="loading__spinner"></div><span>Loading weather data...</span></div>';
        return;
    }

    const now = new Date();
    const currentHour = findCurrentHour(weatherData.hourly, now);

    // 7-day rain history
    const rainHistory = compute7DayRainHistory(weatherData, race.dates.start);

    // Latest soil moisture
    const latestSoil = getLatestSoilMoisture(weatherData.hourly);

    // Race-day forecast summary
    const raceDaySummary = getRaceDaySummary(weatherData, race);

    // Race-day daily summaries from daily data
    const raceDayCards = getRaceDayCards(weatherData, race);

    // Race hourly data for heat widget
    const raceHourlyData = getRaceHourlyWindow(weatherData, race);

    // Nowcast widget (only if data available)
    const nowcastHtml = nowcastData ? renderNowcastWidget(nowcastData) : '';

    // Heat safety widget
    const heatHtml = renderHeatSafetyWidget(raceHourlyData);

    container.innerHTML = `
        <div class="widget-grid">
            ${nowcastHtml}
            ${renderRaceDaySummaryWidget(raceDayCards, race)}
            ${renderCurrentConditions(currentHour)}
            ${renderRainfallWidget(rainHistory, weatherData, race, climateDeparture)}
            ${renderSoilMoistureWidget(latestSoil)}
            ${renderWindWidget(currentHour, raceDaySummary)}
            ${heatHtml}
        </div>`;
}

function renderRaceDaySummaryWidget(raceDayCards, race) {
    if (!raceDayCards || raceDayCards.length === 0) return '';

    const cards = raceDayCards.map(day => {
        const icon = WEATHER_ICONS[day.weatherCode] || WEATHER_ICONS[0];
        const dayDate = new Date(day.date + 'T12:00:00');
        const label = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return `
            <div class="race-day-card">
                <div class="race-day-card__label">${label}</div>
                <span class="race-day-card__icon">${icon.icon}</span>
                <div class="race-day-card__temps">
                    <span class="race-day-card__high">${formatTemperature(day.tempMax)}</span>
                    <span class="race-day-card__low">${formatTemperature(day.tempMin)}</span>
                </div>
                <div class="race-day-card__detail">Precip: ${Math.round(day.precipProbMax)}%</div>
                <div class="race-day-card__detail">Rain: ${formatPrecipitation(day.precipSum)}</div>
                ${day.maxApparentTemp !== null ? `<div class="race-day-card__detail">Feels like: ${formatTemperature(day.maxApparentTemp)}</div>` : ''}
                ${day.maxUv !== null ? `<div class="race-day-card__detail">UV: ${day.maxUv.toFixed(1)} <span class="uv-badge" style="background:${getUvColor(day.maxUv)}">${getUvLabel(day.maxUv)}</span></div>` : ''}
            </div>`;
    }).join('');

    const radarBtn = race.nwsRadarUrl
        ? `<a href="${race.nwsRadarUrl}" target="_blank" rel="noopener" class="radar-btn" onclick="event.stopPropagation()">Open NWS Radar</a>`
        : '';

    return `
        <div class="widget widget--full">
            <div class="widget__title" style="display:flex;justify-content:space-between;align-items:center;">
                Race Day Forecast
                ${radarBtn}
            </div>
            <div class="race-day-cards">
                ${cards}
            </div>
        </div>`;
}

function renderCurrentConditions(hour) {
    if (!hour) return '';
    const icon = getWeatherIcon(hour.weatherCode);
    const desc = getWeatherDescription(hour.weatherCode);

    const feelsLike = hour.apparentTemperature !== null
        ? `<div class="widget__detail">Feels like: ${formatTemperature(hour.apparentTemperature)}</div>`
        : '';

    const uvDisplay = hour.uvIndex !== null
        ? `<div class="widget__detail">UV Index: ${hour.uvIndex.toFixed(1)} <span class="uv-badge" style="background:${getUvColor(hour.uvIndex)}">${getUvLabel(hour.uvIndex)}</span></div>`
        : '';

    return `
        <div class="widget">
            <div class="widget__title">Current Conditions</div>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
                <span style="font-size: 2.5rem;">${icon.icon}</span>
                <div>
                    <div class="widget__value">${formatTemperature(hour.temperature)}</div>
                    <div class="widget__detail">${desc}</div>
                    ${feelsLike}
                    <div class="widget__detail">Humidity: ${formatPercent(hour.humidity)}</div>
                    ${uvDisplay}
                </div>
            </div>
        </div>`;
}

function renderRainfallWidget(rainHistory, weatherData, race, climateDeparture = null) {
    const maxRain = Math.max(...rainHistory.map(d => d.rain), 1);

    const bars = rainHistory.map(d => {
        const height = Math.max(2, (d.rain / maxRain) * 100);
        const cls = d.isForecast
            ? (d.rain > 20 ? 'rain-chart__bar--heavy' : 'rain-chart__bar--forecast')
            : 'rain-chart__bar--past';
        return `<div class="rain-chart__bar ${cls}" style="height: ${height}%" title="${d.label}: ${formatPrecipitation(d.rain)}"></div>`;
    }).join('');

    const totalPast = rainHistory.filter(d => !d.isForecast).reduce((s, d) => s + d.rain, 0);

    // Departure from normal annotation (Phase 6)
    let departureHtml = '';
    if (climateDeparture != null) {
        const sign = climateDeparture >= 0 ? '+' : '';
        const colorClass = climateDeparture > 50 ? 'rain-departure--above'
            : climateDeparture < -20 ? 'rain-departure--below'
            : 'rain-departure--normal';
        departureHtml = `<div class="rain-departure ${colorClass}">${sign}${formatPrecipitation(climateDeparture)} vs 30-yr normal</div>`;
    }

    return `
        <div class="widget">
            <div class="widget__title">7-Day Rainfall</div>
            <div class="widget__value">${formatPrecipitation(totalPast)}</div>
            <div class="widget__detail">Past 7 days cumulative</div>
            ${departureHtml}
            <div class="rain-chart">${bars}</div>
            <div class="rain-chart__labels">
                <span>7 days ago</span>
                <span>Today</span>
                <span>Race day</span>
            </div>
        </div>`;
}

function renderSoilMoistureWidget(soil) {
    const value = soil ? soil.soilMoisture0to7 : null;
    const displayVal = formatSoilMoisture(value);
    const pct = value !== null ? Math.min(100, (value / 0.6) * 100) : 0;

    let fillColor = 'var(--risk-green)';
    if (value > TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL) fillColor = 'var(--risk-red)';
    else if (value > TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH) fillColor = 'var(--risk-yellow)';

    const deepValue = soil ? formatSoilMoisture(soil.soilMoisture7to28) : 'N/A';

    return `
        <div class="widget">
            <div class="widget__title">Soil Moisture</div>
            <div class="widget__value">${displayVal}</div>
            <div class="widget__detail">Surface (0-7cm)</div>
            <div class="soil-meter">
                <div class="soil-meter__track">
                    <div class="soil-meter__fill" style="width: ${pct}%; background: ${fillColor};"></div>
                </div>
                <div class="soil-meter__thresholds">
                    <span>Dry</span>
                    <span>Concern (${(TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH * 100).toFixed(0)}%)</span>
                    <span>Saturated</span>
                </div>
            </div>
            <div class="widget__row" style="margin-top: var(--space-sm);">
                <span class="widget__row-label">Deep (7-28cm)</span>
                <span class="widget__row-value">${deepValue}</span>
            </div>
        </div>`;
}

function renderWindWidget(currentHour, raceDaySummary) {
    if (!currentHour) return '';

    return `
        <div class="widget">
            <div class="widget__title">Wind</div>
            <div class="widget__value">${formatWindSpeed(currentHour.windSpeed)}</div>
            <div class="widget__detail">${getWindDirectionLabel(currentHour.windDirection)} (${Math.round(currentHour.windDirection)}°)</div>
            <div class="widget__row">
                <span class="widget__row-label">Gusts</span>
                <span class="widget__row-value">${formatWindSpeed(currentHour.windGusts)}</span>
            </div>
            ${raceDaySummary ? `
            <div class="widget__row">
                <span class="widget__row-label">Race day max</span>
                <span class="widget__row-value">${formatWindSpeed(raceDaySummary.maxWind)}</span>
            </div>
            <div class="widget__row">
                <span class="widget__row-label">Race day gusts</span>
                <span class="widget__row-value">${formatWindSpeed(raceDaySummary.maxGust)}</span>
            </div>` : ''}
        </div>`;
}

// UV helpers

function getUvLabel(uv) {
    if (uv === null || uv === undefined) return '';
    for (const t of UV_THRESHOLDS) {
        if (uv <= t.max) return t.label;
    }
    return 'Extreme';
}

function getUvColor(uv) {
    if (uv === null || uv === undefined) return 'transparent';
    for (const t of UV_THRESHOLDS) {
        if (uv <= t.max) return t.color;
    }
    return UV_THRESHOLDS[UV_THRESHOLDS.length - 1].color;
}

// Data helpers

function findCurrentHour(hourly, now) {
    const nowTs = now.getTime();
    let closest = hourly[0];
    let closestDiff = Math.abs(hourly[0].time.getTime() - nowTs);

    for (const h of hourly) {
        const diff = Math.abs(h.time.getTime() - nowTs);
        if (diff < closestDiff) {
            closest = h;
            closestDiff = diff;
        }
    }
    return closest;
}

function compute7DayRainHistory(weatherData, raceDateStr) {
    const days = [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (weatherData.daily) {
        for (const d of weatherData.daily) {
            days.push({
                label: d.date,
                rain: d.precipSum || 0,
                isForecast: d.date > today
            });
        }
    }

    const todayIdx = days.findIndex(d => d.label === today);
    if (todayIdx >= 0) {
        const start = Math.max(0, todayIdx - 7);
        const raceIdx = days.findIndex(d => d.label === raceDateStr);
        const end = raceIdx >= 0 ? raceIdx + 1 : todayIdx + 3;
        return days.slice(start, end);
    }

    return days.slice(0, 14);
}

function getLatestSoilMoisture(hourly) {
    const now = new Date();
    const pastReadings = hourly.filter(h => h.time <= now && h.soilMoisture0to7 !== null);
    return pastReadings.length > 0 ? pastReadings[pastReadings.length - 1] : null;
}

function getRaceDaySummary(weatherData, race) {
    const raceHours = weatherData.hourly.filter(h => {
        const dateStr = h.time.toISOString().slice(0, 10);
        return dateStr >= race.dates.start && dateStr <= race.dates.end;
    });

    if (raceHours.length === 0) return null;

    return {
        maxWind: Math.max(...raceHours.map(h => h.windSpeed || 0)),
        maxGust: Math.max(...raceHours.map(h => h.windGusts || 0)),
        maxTemp: Math.max(...raceHours.map(h => h.temperature)),
        minTemp: Math.min(...raceHours.map(h => h.temperature))
    };
}

function getRaceDayCards(weatherData, race) {
    if (!weatherData.daily) return [];

    const raceDates = new Set();
    let d = new Date(race.dates.start + 'T12:00:00');
    const end = new Date(race.dates.end + 'T12:00:00');
    while (d <= end) {
        raceDates.add(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }

    return weatherData.daily
        .filter(day => raceDates.has(day.date))
        .map(day => {
            // Get hourly data for this day to find max apparent temp and max UV
            const dayHours = weatherData.hourly.filter(h =>
                h.time.toISOString().slice(0, 10) === day.date
            );
            const maxApparentTemp = dayHours.length > 0
                ? Math.max(...dayHours.map(h => h.apparentTemperature ?? -Infinity))
                : null;
            const maxUv = dayHours.length > 0
                ? Math.max(...dayHours.map(h => h.uvIndex ?? 0))
                : null;

            return {
                ...day,
                maxApparentTemp: maxApparentTemp === -Infinity ? null : maxApparentTemp,
                maxUv: maxUv === 0 && dayHours.every(h => h.uvIndex === null) ? null : maxUv
            };
        });
}
