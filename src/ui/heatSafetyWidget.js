/**
 * Heat Safety Widget — WBGT gauge with color zones and recommendations
 */

import { calculateWBGT, celsiusToFahrenheit, getWBGTCategory } from '../utils/heatIndex.js';
import { WBGT_THRESHOLDS } from '../config/constants.js';
import { renderInfoButton } from './infoButton.js';

/**
 * Render the heat safety widget
 * @param {Array} raceHourlyData - Hourly data for race hours
 * @returns {string} HTML string
 */
export function renderHeatSafetyWidget(raceHourlyData) {
    if (!raceHourlyData || raceHourlyData.length === 0) return '';

    // Calculate WBGT for each race hour
    const wbgtData = raceHourlyData.map(h => {
        const wbgtC = calculateWBGT(h.temperature, h.humidity, h.windSpeed || 0);
        const wbgtF = wbgtC != null ? celsiusToFahrenheit(wbgtC) : null;
        return { hour: h.time, wbgtC, wbgtF };
    }).filter(d => d.wbgtF != null);

    if (wbgtData.length === 0) return '';

    const peakWBGT = wbgtData.reduce((max, d) => d.wbgtF > max.wbgtF ? d : max);
    const category = getWBGTCategory(peakWBGT.wbgtF);
    const peakHourStr = peakWBGT.hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    // Gauge position: map WBGT 70-100°F to 0-100%
    const gaugeMin = 70;
    const gaugeMax = 100;
    const gaugePos = Math.min(100, Math.max(0, ((peakWBGT.wbgtF - gaugeMin) / (gaugeMax - gaugeMin)) * 100));

    // Threshold positions for markers
    const greenPos = ((WBGT_THRESHOLDS.GREEN_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;
    const yellowPos = ((WBGT_THRESHOLDS.YELLOW_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;
    const orangePos = ((WBGT_THRESHOLDS.ORANGE_MAX_F - gaugeMin) / (gaugeMax - gaugeMin)) * 100;

    return `
        <div class="widget">
            <div class="widget__title">Heat Safety (Est. WBGT) ${renderInfoButton('heatSafety')}</div>
            <div class="wbgt-value" style="color: ${category.color};">
                <span class="widget__value">${Math.round(peakWBGT.wbgtF)}&deg;F</span>
                <span class="wbgt-category" style="background: ${category.color}; color: white;">${category.label}</span>
            </div>
            <div class="widget__detail">Peak at ${peakHourStr}</div>

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
                    <span>${WBGT_THRESHOLDS.GREEN_MAX_F}&deg;</span>
                    <span>${WBGT_THRESHOLDS.YELLOW_MAX_F}&deg;</span>
                    <span>${WBGT_THRESHOLDS.ORANGE_MAX_F}&deg;</span>
                    <span>${gaugeMax}&deg;F</span>
                </div>
            </div>

            <div class="wbgt-recommendation">${category.recommendation}</div>
            <div class="wbgt-disclaimer">Estimated WBGT — not a substitute for on-site measurement</div>
        </div>`;
}
