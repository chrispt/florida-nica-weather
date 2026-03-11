/**
 * Weather detail widgets — rain history, soil moisture, wind, temp
 */

import { formatTemperature, formatWindSpeed, getWindDirectionLabel, formatPrecipitation, formatSoilMoisture, formatPercent } from '../utils/formatting.js';
import { getWeatherDescription, getWeatherIcon } from '../config/weatherCodes.js';
import { TRAIL_THRESHOLDS } from '../config/constants.js';

export function renderWeatherDetails(container, weatherData, race) {
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

    container.innerHTML = `
        <div class="widget-grid">
            ${renderCurrentConditions(currentHour)}
            ${renderRainfallWidget(rainHistory, weatherData, race)}
            ${renderSoilMoistureWidget(latestSoil)}
            ${renderWindWidget(currentHour, raceDaySummary)}
        </div>`;
}

function renderCurrentConditions(hour) {
    if (!hour) return '';
    const icon = getWeatherIcon(hour.weatherCode);
    const desc = getWeatherDescription(hour.weatherCode);

    return `
        <div class="widget">
            <div class="widget__title">Current Conditions</div>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
                <span style="font-size: 2.5rem;">${icon.icon}</span>
                <div>
                    <div class="widget__value">${formatTemperature(hour.temperature)}</div>
                    <div class="widget__detail">${desc}</div>
                    <div class="widget__detail">Humidity: ${formatPercent(hour.humidity)}</div>
                </div>
            </div>
        </div>`;
}

function renderRainfallWidget(rainHistory, weatherData, race) {
    const maxRain = Math.max(...rainHistory.map(d => d.rain), 1);

    const bars = rainHistory.map(d => {
        const height = Math.max(2, (d.rain / maxRain) * 100);
        const cls = d.isForecast
            ? (d.rain > 20 ? 'rain-chart__bar--heavy' : 'rain-chart__bar--forecast')
            : 'rain-chart__bar--past';
        return `<div class="rain-chart__bar ${cls}" style="height: ${height}%" title="${d.label}: ${formatPrecipitation(d.rain)}"></div>`;
    }).join('');

    const totalPast = rainHistory.filter(d => !d.isForecast).reduce((s, d) => s + d.rain, 0);

    return `
        <div class="widget">
            <div class="widget__title">7-Day Rainfall</div>
            <div class="widget__value">${formatPrecipitation(totalPast)}</div>
            <div class="widget__detail">Past 7 days cumulative</div>
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

    const highPct = (TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH / 0.6) * 100;
    const critPct = (TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL / 0.6) * 100;

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

// Helpers

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

    // Get daily data for the past 7 days + forecast through race day
    if (weatherData.daily) {
        for (const d of weatherData.daily) {
            days.push({
                label: d.date,
                rain: d.precipSum || 0,
                isForecast: d.date > today
            });
        }
    }

    // Show last 7 past days + forecast days up to race
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
