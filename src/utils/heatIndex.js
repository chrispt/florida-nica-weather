/**
 * WBGT (Wet Bulb Globe Temperature) estimation and heat safety categorization
 *
 * Uses the simplified Dimiceli approximation for outdoor WBGT estimation.
 * This is an ESTIMATE — not a substitute for on-site WBGT measurement.
 */

import { WBGT_THRESHOLDS } from '../config/constants.js';

/**
 * Calculate estimated WBGT using the Dimiceli simplified approximation
 * WBGT_outdoor ≈ 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
 * Simplified: uses temperature, humidity, and wind to estimate wet bulb and globe temps
 *
 * @param {number} tempC - Air temperature in Celsius
 * @param {number} humidityPct - Relative humidity (0-100)
 * @param {number} windKmh - Wind speed in km/h
 * @returns {number} Estimated WBGT in Celsius
 */
export function calculateWBGT(tempC, humidityPct, windKmh) {
    if (tempC == null || humidityPct == null) return null;

    // Stull formula for wet bulb temperature (simplified)
    const T = tempC;
    const RH = humidityPct;

    // Wet bulb approximation (Stull 2011)
    const Tw = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659))
        + Math.atan(T + RH)
        - Math.atan(RH - 1.676331)
        + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH)
        - 4.686035;

    // Globe temperature approximation (simplified — assumes moderate solar radiation)
    // In full sun, globe temp is typically 7-15°C above ambient
    const solarAdder = 7; // conservative estimate for partial cloud/tree cover on trails
    const windFactor = Math.max(0.5, 1 - (windKmh / 40) * 0.3); // wind reduces globe temp effect
    const Tg = T + solarAdder * windFactor;

    // WBGT outdoor = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
    const wbgt = 0.7 * Tw + 0.2 * Tg + 0.1 * T;

    return wbgt;
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(c) {
    return (c * 9 / 5) + 32;
}

/**
 * Get WBGT category based on NICA thresholds (in Fahrenheit)
 * @param {number} wbgtF - WBGT in Fahrenheit
 * @returns {{level: string, label: string, color: string, recommendation: string}}
 */
export function getWBGTCategory(wbgtF) {
    if (wbgtF == null) {
        return { level: 'unknown', label: 'N/A', color: 'var(--color-text-muted)', recommendation: 'No data available' };
    }

    if (wbgtF > WBGT_THRESHOLDS.ORANGE_MAX_F) {
        return {
            level: 'red',
            label: 'Extreme Caution',
            color: 'var(--heat-red, var(--risk-red))',
            recommendation: 'Consider cancellation or significant course modifications. Mandatory extended rest periods. Ensure medical staff on standby.'
        };
    }
    if (wbgtF > WBGT_THRESHOLDS.YELLOW_MAX_F) {
        return {
            level: 'orange',
            label: 'High Caution',
            color: 'var(--heat-orange, var(--alert-watch))',
            recommendation: 'Increase hydration station frequency. Shorten race windows or add mandatory cool-down breaks. Monitor riders closely.'
        };
    }
    if (wbgtF > WBGT_THRESHOLDS.GREEN_MAX_F) {
        return {
            level: 'yellow',
            label: 'Moderate Caution',
            color: 'var(--heat-yellow, var(--risk-yellow))',
            recommendation: 'Ensure adequate hydration stations. Remind riders to pace themselves and recognize heat illness symptoms.'
        };
    }
    return {
        level: 'green',
        label: 'Normal',
        color: 'var(--heat-green, var(--risk-green))',
        recommendation: 'Standard hydration practices. No special heat precautions needed.'
    };
}
