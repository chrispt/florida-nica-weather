/**
 * Heat Index calculation (NWS Rothfusz regression) and heat safety categorization
 *
 * Also retains WBGT estimation for backward compatibility.
 */

import { WBGT_THRESHOLDS, HEAT_INDEX_THRESHOLDS, NICA_ACTIONS } from '../config/constants.js';

/**
 * Calculate Heat Index using the NWS Rothfusz regression equation
 * Accepts Celsius temperature, converts internally, returns °F
 *
 * @param {number} tempC - Air temperature in Celsius
 * @param {number} humidityPct - Relative humidity (0-100)
 * @returns {number|null} Heat Index in Fahrenheit
 */
export function calculateHeatIndex(tempC, humidityPct) {
    if (tempC == null || humidityPct == null) return null;

    const T = celsiusToFahrenheit(tempC);
    const RH = humidityPct;

    // Simple formula for low heat index values
    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

    if (HI >= 80) {
        // Full Rothfusz regression
        HI = -42.379
            + 2.04901523 * T
            + 10.14333127 * RH
            - 0.22475541 * T * RH
            - 0.00683783 * T * T
            - 0.05481717 * RH * RH
            + 0.00122874 * T * T * RH
            + 0.00085282 * T * RH * RH
            - 0.00000199 * T * T * RH * RH;

        // Adjustment for low humidity
        if (RH < 13 && T >= 80 && T <= 112) {
            HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
        }

        // Adjustment for high humidity
        if (RH > 85 && T >= 80 && T <= 87) {
            HI += ((RH - 85) / 10) * ((87 - T) / 5);
        }
    }

    return HI;
}

/**
 * Get Heat Index category based on NICA thresholds (in Fahrenheit)
 * @param {number} heatIndexF - Heat Index in Fahrenheit
 * @returns {{level: string, label: string, color: string, recommendation: string, nicaAction: string}}
 */
export function getHeatIndexCategory(heatIndexF) {
    if (heatIndexF == null) {
        return { level: 'unknown', label: 'N/A', color: 'var(--color-text-muted)', recommendation: 'No data available', nicaAction: '' };
    }

    if (heatIndexF > HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F) {
        return {
            level: 'red',
            label: 'Extreme',
            color: 'var(--heat-red, var(--risk-red))',
            recommendation: 'Cancel outdoor activity. Heat Index exceeds safe limits for athletic competition.',
            nicaAction: NICA_ACTIONS.heat.RED
        };
    }
    if (heatIndexF > HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F) {
        return {
            level: 'orange',
            label: 'High Caution',
            color: 'var(--heat-orange, var(--alert-watch))',
            recommendation: 'Max activity: 1 hour. Mandatory cool-down breaks. Increase hydration stations.',
            nicaAction: NICA_ACTIONS.heat.ORANGE
        };
    }
    if (heatIndexF > HEAT_INDEX_THRESHOLDS.GREEN_MAX_F) {
        return {
            level: 'yellow',
            label: 'Moderate Caution',
            color: 'var(--heat-yellow, var(--risk-yellow))',
            recommendation: 'Max activity: 2 hours. Ensure adequate hydration. Remind riders to pace themselves.',
            nicaAction: NICA_ACTIONS.heat.YELLOW
        };
    }
    return {
        level: 'green',
        label: 'Normal',
        color: 'var(--heat-green, var(--risk-green))',
        recommendation: 'Standard hydration practices. No special heat precautions needed.',
        nicaAction: NICA_ACTIONS.heat.GREEN
    };
}

/**
 * Calculate estimated WBGT using the Dimiceli simplified approximation (legacy)
 */
export function calculateWBGT(tempC, humidityPct, windKmh) {
    if (tempC == null || humidityPct == null) return null;

    const T = tempC;
    const RH = humidityPct;

    // Wet bulb approximation (Stull 2011)
    const Tw = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659))
        + Math.atan(T + RH)
        - Math.atan(RH - 1.676331)
        + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH)
        - 4.686035;

    const solarAdder = 7;
    const windFactor = Math.max(0.5, 1 - (windKmh / 40) * 0.3);
    const Tg = T + solarAdder * windFactor;

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
 * Get WBGT category based on NICA thresholds (legacy — kept for reference)
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
            recommendation: 'Consider cancellation or significant course modifications.'
        };
    }
    if (wbgtF > WBGT_THRESHOLDS.YELLOW_MAX_F) {
        return {
            level: 'orange',
            label: 'High Caution',
            color: 'var(--heat-orange, var(--alert-watch))',
            recommendation: 'Increase hydration station frequency. Shorten race windows.'
        };
    }
    if (wbgtF > WBGT_THRESHOLDS.GREEN_MAX_F) {
        return {
            level: 'yellow',
            label: 'Moderate Caution',
            color: 'var(--heat-yellow, var(--risk-yellow))',
            recommendation: 'Ensure adequate hydration stations.'
        };
    }
    return {
        level: 'green',
        label: 'Normal',
        color: 'var(--heat-green, var(--risk-green))',
        recommendation: 'Standard hydration practices. No special heat precautions needed.'
    };
}
