/**
 * Risk banner — color-coded overall risk with expandable factor details
 * 4-level system: GREEN / YELLOW / ORANGE / RED per NICA guidelines
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

    const { level, overall, summary, lightning, trailDamage, wind, heat, heavyRain, aqi,
        lightningDetails, trailDamageDetails, windDetails, heatDetails,
        heavyRainDetails, aqiDetails,
        nwsOverride, nwsOverrideEvent } = risk;

    const confidence = race ? getForecastConfidence(race) : null;

    const nwsOverrideBadge = nwsOverride
        ? `<div class="nws-override-badge">NWS Override: ${nwsOverrideEvent}</div>`
        : '';

    container.innerHTML = `
        <div class="risk-banner risk-banner--${level}" id="risk-banner-toggle" role="region" aria-label="Race risk assessment">
            <div class="risk-banner__header">
                <span class="risk-banner__level">${level} — Race Risk</span>
                <span class="risk-banner__score-group">
                    <span class="risk-banner__score">${overall}</span>
                    ${renderInfoButton('riskBanner')}
                </span>
            </div>
            <div class="risk-banner__summary">${summary}</div>
            ${nwsOverrideBadge}
            ${confidence ? `<div class="confidence-tag confidence-tag--${confidence.level}">Forecast: ${confidence.label}${confidence.days > 0 ? ` (${confidence.days}-day)` : ''}</div>` : ''}
            <div class="risk-banner__details" id="risk-details">
                <div class="risk-banner__factors">
                    ${renderFactor('Lightning', lightning, renderLightningBullets(lightningDetails), lightningDetails?.nicaAction)}
                    ${renderFactor('Heat', heat || 0, renderHeatBullets(heatDetails), heatDetails?.nicaAction)}
                    ${renderFactor('Wind', wind, renderWindBullets(windDetails), windDetails?.nicaAction)}
                    ${renderFactor('Heavy Rain', heavyRain || 0, renderHeavyRainBullets(heavyRainDetails), heavyRainDetails?.nicaAction)}
                    ${renderFactor('Trail Damage', trailDamage, renderTrailBullets(trailDamageDetails), trailDamageDetails?.nicaAction)}
                    ${renderFactor('Air Quality', aqi || 0, renderAQIBullets(aqiDetails), aqiDetails?.nicaAction)}
                </div>
            </div>
            <button class="risk-banner__expand-hint" id="expand-hint" type="button" aria-expanded="false" aria-controls="risk-details">
                <span>Tap for risk details</span>
                <span class="risk-banner__chevron">&#x25BC;</span>
            </button>
        </div>`;

    // Info buttons (must be set up before the banner click handler)
    setupInfoButtons(container);

    // Toggle expand — only via the button, not the entire banner
    const banner = container.querySelector('#risk-banner-toggle');
    const expandBtn = container.querySelector('#expand-hint');
    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        banner.classList.toggle('expanded');
        const isExpanded = banner.classList.contains('expanded');
        const hintText = expandBtn.querySelector('span:first-child');
        hintText.textContent = isExpanded ? 'Tap to collapse' : 'Tap for risk details';
        expandBtn.setAttribute('aria-expanded', isExpanded);
    });
}

function renderFactor(label, score, bullets, nicaAction) {
    const colorClass = score > RISK_THRESHOLDS.ORANGE_MAX ? 'red'
        : score > RISK_THRESHOLDS.YELLOW_MAX ? 'orange'
        : score > RISK_THRESHOLDS.GREEN_MAX ? 'yellow'
        : 'green';

    // Show NICA action text for ORANGE and RED levels
    let actionHtml = '';
    if (nicaAction && score > RISK_THRESHOLDS.YELLOW_MAX) {
        const actionClass = score > RISK_THRESHOLDS.ORANGE_MAX ? 'red' : 'orange';
        actionHtml = `<div class="risk-factor__nica-action risk-factor__nica-action--${actionClass}">${nicaAction}</div>`;
    }

    return `
        <div class="risk-factor">
            <div class="risk-factor__label">${label}</div>
            <div class="risk-factor__bar">
                <div class="risk-factor__fill risk-factor__fill--${colorClass}" style="width: ${score}%"></div>
            </div>
            <div class="risk-factor__value">${score}</div>
            ${bullets ? `<div class="risk-factor__bullets">${bullets}</div>` : ''}
            ${actionHtml}
        </div>`;
}

function renderLightningBullets(details) {
    if (!details) return '';
    const items = [];
    if (details.realTimeStrikes > 0) {
        items.push(`<strong style="color:var(--risk-red)">LIVE: ${details.realTimeStrikes} strike${details.realTimeStrikes !== 1 ? 's' : ''} within 10 miles</strong>`);
        if (details.closestStrikeMiles != null) {
            items.push(`Closest strike: ${details.closestStrikeMiles} mi`);
        }
        items.push(`<span style="color:var(--color-text-muted);font-size:0.7em">Beta — verify with official sources</span>`);
    }
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
    if (details.peakHeatIndex_F != null && details.peakHeatIndex_F > 0) {
        items.push(`Peak Heat Index: ${details.peakHeatIndex_F}&deg;F`);
    }
    if (details.peakHour) {
        const timeStr = details.peakHour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        items.push(`Peak heat at ${timeStr}`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}

function renderHeavyRainBullets(details) {
    if (!details) return '';
    const items = [];
    if (details.maxRainRateMmHr > 0) {
        const inHr = (details.maxRainRateMmHr / 25.4).toFixed(2);
        items.push(`Max rain rate: ${details.maxRainRateMmHr.toFixed(1)} mm/hr (${inHr} in/hr)`);
    }
    if (details.maxRainRateHour) {
        const timeStr = details.maxRainRateHour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        items.push(`Peak at ${timeStr}`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}

function renderAQIBullets(details) {
    if (!details) return '';
    const items = [];
    if (details.peakAQI > 0) {
        items.push(`Peak AQI: ${details.peakAQI}`);
    }
    if (details.peakHour) {
        const timeStr = details.peakHour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        items.push(`Peak at ${timeStr}`);
    }
    return items.map(t => `<div class="risk-factor__bullet">${t}</div>`).join('');
}
