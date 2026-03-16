/**
 * Air Quality Index Widget — AQI gauge with color zones and NICA recommendations
 */

import { AQI_THRESHOLDS, NICA_ACTIONS } from '../config/constants.js';
import { renderInfoButton } from './infoButton.js';

/**
 * Render the AQI widget
 * @param {Array} aqiData - [{time, aqi}] hourly AQI data
 * @param {object} race - race object with dates and raceHours
 * @returns {string} HTML string
 */
export function renderAQIWidget(aqiData, race) {
    if (!aqiData || aqiData.length === 0) return '';

    // Filter to race hours
    const { start: startHour, end: endHour } = race.raceHours;
    const raceAQI = aqiData.filter(d => {
        if (d.aqi == null) return false;
        const dateStr = d.time.toISOString().slice(0, 10);
        const hour = d.time.getHours();
        return dateStr >= race.dates.start && dateStr <= race.dates.end && hour >= startHour && hour <= endHour;
    });

    if (raceAQI.length === 0) return '';

    // Find peak AQI
    const peak = raceAQI.reduce((max, d) => d.aqi > max.aqi ? d : max);
    const peakHourStr = peak.time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    const category = getAQICategory(peak.aqi);

    // Gauge: map AQI 0-200 to 0-100%
    const gaugeMax = 200;
    const gaugePos = Math.min(100, Math.max(0, (peak.aqi / gaugeMax) * 100));

    const greenPos = (AQI_THRESHOLDS.GREEN_MAX / gaugeMax) * 100;
    const yellowPos = (AQI_THRESHOLDS.YELLOW_MAX / gaugeMax) * 100;
    const orangePos = (AQI_THRESHOLDS.ORANGE_MAX / gaugeMax) * 100;

    return `
        <div class="widget">
            <div class="widget__title">Air Quality (AQI) ${renderInfoButton('airQuality')}</div>
            <div class="wbgt-value" style="color: ${category.color};">
                <span class="widget__value">${peak.aqi}</span>
                <span class="wbgt-category" style="background: ${category.color}; color: white;">${category.label}</span>
            </div>
            <div class="widget__detail">Peak at ${peakHourStr}</div>
            ${category.nicaAction ? `<div class="widget__detail" style="font-weight:600; margin-top:var(--space-xs);">NICA: ${category.nicaAction}</div>` : ''}

            <div class="wbgt-gauge">
                <div class="wbgt-gauge__track">
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--green" style="width: ${greenPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--yellow" style="width: ${yellowPos - greenPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--orange" style="width: ${orangePos - yellowPos}%"></div>
                    <div class="wbgt-gauge__zone wbgt-gauge__zone--red" style="width: ${100 - orangePos}%"></div>
                    <div class="wbgt-gauge__marker" style="left: ${gaugePos}%"></div>
                </div>
                <div class="wbgt-gauge__labels">
                    <span>0</span>
                    <span>${AQI_THRESHOLDS.GREEN_MAX}</span>
                    <span>${AQI_THRESHOLDS.YELLOW_MAX}</span>
                    <span>${AQI_THRESHOLDS.ORANGE_MAX}</span>
                    <span>${gaugeMax}</span>
                </div>
            </div>

            <div class="wbgt-recommendation">${category.recommendation}</div>
        </div>`;
}

function getAQICategory(aqi) {
    if (aqi > AQI_THRESHOLDS.ORANGE_MAX) {
        return {
            label: 'Unhealthy',
            color: 'var(--risk-red)',
            recommendation: 'Air quality is unhealthy. All outdoor activity should be canceled.',
            nicaAction: NICA_ACTIONS.aqi.RED
        };
    }
    if (aqi > AQI_THRESHOLDS.YELLOW_MAX) {
        return {
            label: 'Unhealthy for Sensitive',
            color: 'var(--risk-orange)',
            recommendation: 'Sensitive individuals should limit prolonged exertion. Competitive events should be canceled.',
            nicaAction: NICA_ACTIONS.aqi.ORANGE
        };
    }
    if (aqi > AQI_THRESHOLDS.GREEN_MAX) {
        return {
            label: 'Moderate',
            color: 'var(--risk-yellow)',
            recommendation: 'Air quality is acceptable. Sensitive individuals may experience minor effects.',
            nicaAction: NICA_ACTIONS.aqi.YELLOW
        };
    }
    return {
        label: 'Good',
        color: 'var(--risk-green)',
        recommendation: 'Air quality is satisfactory. No restrictions needed.',
        nicaAction: ''
    };
}
