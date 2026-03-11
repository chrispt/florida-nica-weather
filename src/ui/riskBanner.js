/**
 * Risk banner — color-coded overall risk with expandable factor details
 */

import { RISK_THRESHOLDS } from '../config/constants.js';

export function renderRiskBanner(container, risk) {
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

    const { level, overall, summary, lightning, trailDamage, wind } = risk;

    container.innerHTML = `
        <div class="risk-banner risk-banner--${level}" id="risk-banner-toggle">
            <div class="risk-banner__header">
                <span class="risk-banner__level">${level} — Race Risk</span>
                <span class="risk-banner__score">${overall}</span>
            </div>
            <div class="risk-banner__summary">${summary}</div>
            <div class="risk-banner__details">
                <div class="risk-banner__factors">
                    ${renderFactor('Lightning', lightning)}
                    ${renderFactor('Trail Damage', trailDamage)}
                    ${renderFactor('Wind', wind)}
                </div>
            </div>
            <div class="risk-banner__expand-hint" id="expand-hint">Click for details</div>
        </div>`;

    // Toggle expand
    const banner = container.querySelector('#risk-banner-toggle');
    banner.addEventListener('click', () => {
        banner.classList.toggle('expanded');
        const hint = banner.querySelector('#expand-hint');
        hint.textContent = banner.classList.contains('expanded') ? 'Click to collapse' : 'Click for details';
    });
}

function renderFactor(label, score) {
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
        </div>`;
}
