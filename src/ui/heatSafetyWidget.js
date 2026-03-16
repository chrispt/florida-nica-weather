/**
 * Heat Safety Widget — Heat Index gauge with color zones and NICA recommendations
 */

import { calculateHeatIndex, getHeatIndexCategory } from '../utils/heatIndex.js';
import { HEAT_INDEX_THRESHOLDS } from '../config/constants.js';
import { renderInfoButton } from './infoButton.js';

/**
 * Render the heat safety widget
 * @param {Array} raceHourlyData - Hourly data for race hours
 * @returns {string} HTML string
 */
export function renderHeatSafetyWidget(raceHourlyData) {
    if (!raceHourlyData || raceHourlyData.length === 0) return '';

    // Calculate Heat Index for each race hour
    const hiData = raceHourlyData.map(h => {
        const hiF = calculateHeatIndex(h.temperature, h.humidity);
        return { hour: h.time, hiF };
    }).filter(d => d.hiF != null);

    if (hiData.length === 0) return '';

    const peakHI = hiData.reduce((max, d) => d.hiF > max.hiF ? d : max);
    const category = getHeatIndexCategory(peakHI.hiF);
    const peakHourStr = peakHI.hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    // Gauge position: map Heat Index 80-120°F to 0-100%
    const gaugeMin = 80;
    const gaugeMax = 120;
    const gaugePos = Math.min(100, Math.max(0, ((peakHI.hiF - gaugeMin) / (gaugeMax - gaugeMin)) * 100));

    // Threshold positions for markers
    const greenPos = ((HEAT_INDEX_THRESHOLDS.GREEN_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;
    const yellowPos = ((HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;
    const orangePos = ((HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;

    const nicaActionHtml = category.nicaAction
        ? `<div class="widget__detail" style="font-weight:600; margin-top:var(--space-xs);">NICA: ${category.nicaAction}</div>`
        : '';

    return `
        <div class="widget">
            <div class="widget__title">Heat Safety (Heat Index) ${renderInfoButton('heatSafety')}</div>
            <div class="wbgt-value" style="color: ${category.color};">
                <span class="widget__value">${Math.round(peakHI.hiF)}&deg;F</span>
                <span class="wbgt-category" style="background: ${category.color}; color: white;">${category.label}</span>
            </div>
            <div class="widget__detail">Peak at ${peakHourStr}</div>
            ${nicaActionHtml}

            <div class="wbgt-gauge">
                <div class="wbgt-gauge__track">
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--green" style="width: ${greenPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--yellow" style="width: ${yellowPos - greenPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--orange" style="width: ${orangePos - yellowPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--red" style="width: ${100 - orangePos}%"></div>
                    <div class="wbgt-gauge__marker" style="left: ${gaugePos}%"></div>
                </div>
                <div class="wbgt-gauge__labels">
                    <span>${gaugeMin}&deg;F</span>
                    <span>${HEAT_INDEX_THRESHOLDS.GREEN_MAX_F}&deg;</span>
                    <span>${HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F}&deg;</span>
                    <span>${HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F}&deg;</span>
                    <span>${gaugeMax}&deg;F</span>
                </div>
            </div>

            <div class="wbgt-recommendation">${category.recommendation}</div>
            <div class="wbgt-disclaimer">Estimated Heat Index — not a substitute for on-site measurement</div>
        </div>`;
}
