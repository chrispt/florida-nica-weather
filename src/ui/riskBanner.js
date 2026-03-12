/**
 * Risk banner — color-coded overall risk with expandable factor details
 */

import { RISK_THRESHOLDS, TRAIL_THRESHOLDS } from '../config/constants.js';
import { getForecastConfidence } from '../utils/dateUtils.js';
import { convertWindSpeed, formatWindSpeed, formatPrecipitation } from '../utils/formatting.js';
import { renderInfoButton, setupInfoButtons } from './infoButton.js';

export function renderRiskBanner(container, risk, race) {
    if (!risk || risk.overall === undefined) {
        container.innerHTML = `
            <div class="risk-banner risk-banner--GREEN">
                <div class="risk-banner__header">
                    <span class="risk-banner__level">Loading...</span>
                </div>
                <div class="risk-banner__summary">Fetching weather data...</div>
            </div>`;
        return;
    }

    const { level, overall, summary, lightning, trailDamage, wind, heat,
        lightningDetails, trailDamageDetails, windDetails, heatDetails,
        nwsOverride, nwsOverrideEvent } = risk;

    const confidence = race ? getForecastConfidence(race) : null;

    const nwsOverrideBadge = nwsOverride
        ? `<div class="nws-override-badge">NWS Override: ${nwsOverrideEvent}</div>`
        : '';

    container.innerHTML = `
        <div class="risk-banner risk-banner--${level}" id="risk-banner-toggle">
            <div class="risk-banner__header">
                <span class="risk-banner__level">${level} — Race Risk</span>
                <span class="risk-banner__score">${overall}</span>
                ${renderInfoButton('riskBanner')}
            </div>
            <div class="risk-banner__summary">${summary}</div>
            ${nwsOverrideBadge}
            ${confidence ? `<div class="confidence-tag confidence-tag--${confidence.level}">Forecast: ${confidence.label}${confidence.days > 0 ? ` (${confidence.days}-day)` : ''}</div>` : ''}
            <div class="risk-banner__details">
                <div class="risk-banner__factors">
                    ${renderFactor('Lightning', lightning, renderLightningBullets(lightningDetails))}
                    ${renderFactor('Trail Damage', trailDamage, renderTrailBullets(trailDamageDetails))}
                    ${renderFactor('Wind', wind, renderWindBullets(windDetails))}
                    ${renderFactor('Heat', heat || 0, renderHeatBullets(heatDetails))}
                </div>
            </div>
            <div class="risk-banner__expand-hint" id="expand-hint">
                <span>Click for details</span>
                <span class="risk-banner__chevron">&#x25BC;</span>
            </div>
        </div>`;

    // Info buttons (must be set up before the banner click handler)
    setupInfoButtons(container);

    // Toggle expand
    const banner = container.querySelector('#risk-banner-toggle');
    banner.addEventListener('click', () => {
        banner.classList.toggle('expanded');
        const hint = banner.querySelector('#expand-hint');
        const hintText = hint.querySelector('span:first-child');
        hintText.textContent = banner.classList.contains('expanded') ? 'Click to collapse' : 'Click for details';
    });
}

function renderFactor(label, score, bullets) {
    const colorClass = score > RISK_THRESHOLDS.YELLOW_MAX ? 'red'
        : score > RISK_THRESHOLDS.GREEN_MAX ? 'yellow'
        : 'green';

    return `
        <div class="risk-factor">
            <div class="risk-factor__label">${label}</div>
            <div class="risk-factor__bar">
                <div class="risk-factor__fill risk-factor__fill--${colorClass}" style="width: ${score}%"></div>
            </div>
            <div class="risk-factor__value">${score}</div>
            ${bullets ? `<div class="risk-factor__bullets">${bullets}</div>` : ''}
        </div>`;
}

function renderLightningBullets(details) {
    if (!details) return '';
    const items = [];
    if (details.thunderstormHours > 0) {
        items.push(`${details.thunderstormHours} thunderstorm hour${details.thunderstormHours !== 1 ? 's' : ''} forecast`);
    }
    if (details.maxPrecipProb > 0) {
        items.push(`Peak precip probability: ${Math.round(details.maxPrecipProb)}%`);
    }
    if (details.rainHours > 0) {
        items.push(`${details.rainHours} rain/storm hour${details.rainHours !== 1 ? 's' : ''}`);
    }
    if (details.capeMax > 0) {
        items.push(`CAPE: ${details.capeMax} J/kg`);
    }
    if (details.liftedIndexMin != null) {
        items.push(`Lifted Index: ${details.liftedIndexMin}`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}

function renderTrailBullets(details) {
    if (!details) return '';
    const items = [];
    items.push(`7-day rain: ${formatPrecipitation(details.pastRain7d)} (threshold ${formatPrecipitation(TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM)})`);
    if (details.avgSoilMoisture > 0) {
        items.push(`Soil moisture: ${(details.avgSoilMoisture * 100).toFixed(0)}% (threshold ${(TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH * 100).toFixed(0)}%)`);
    }
    items.push(`Race day forecast: ${formatPrecipitation(details.raceDayRain)}`);
    if (details.climateDeparture != null) {
        const sign = details.climateDeparture >= 0 ? '+' : '';
        const color = details.climateDeparture > 50 ? 'var(--risk-red)' : details.climateDeparture < -20 ? 'var(--risk-green)' : 'inherit';
        items.push(`<span style="color:${color}">${sign}${formatPrecipitation(details.climateDeparture)} vs normal</span>`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}

function renderWindBullets(details) {
    if (!details) return '';
    const items = [];
    items.push(`Max sustained: ${formatWindSpeed(details.maxSustained)}`);
    items.push(`Max gusts: ${formatWindSpeed(details.maxGust)}`);
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}

function renderHeatBullets(details) {
    if (!details) return '';
    const items = [];
    if (details.peakWBGT_F != null && details.peakWBGT_F > 0) {
        items.push(`Peak WBGT: ${details.peakWBGT_F}&deg;F`);
    }
    if (details.peakHour) {
        const timeStr = details.peakHour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        items.push(`Peak heat at ${timeStr}`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}
