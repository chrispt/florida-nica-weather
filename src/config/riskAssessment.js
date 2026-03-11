/**
 * Pure risk scoring functions for race go/no-go decisions.
 *
 * Each function returns 0-100. Thresholds:
 *   GREEN  < 30   — No concerns
 *   YELLOW 30-60  — Monitor closely
 *   RED    > 60   — Likely cancellation risk
 */

import {
    THUNDERSTORM_CODES, HEAVY_RAIN_CODES, RAIN_CODES,
    TRAIL_THRESHOLDS, WIND_THRESHOLDS, RISK_THRESHOLDS,
    CAPE_THRESHOLDS, NWS_AUTO_RED_EVENTS, WBGT_THRESHOLDS
} from './constants.js';
import { calculateWBGT, celsiusToFahrenheit } from '../utils/heatIndex.js';

/**
 * Lightning risk from thunderstorm codes + precip probability + CAPE during race hours
 */
export function scoreLightning(raceHourlyData) {
    const details = { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0, capeMax: 0, liftedIndexMin: null };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let score = 0;

    // Check for thunderstorm weather codes during race hours
    const thunderstormHoursList = raceHourlyData.filter(h =>
        THUNDERSTORM_CODES.includes(h.weatherCode)
    );
    details.thunderstormHours = thunderstormHoursList.length;

    if (thunderstormHoursList.length > 0) {
        score = Math.min(100, 60 + thunderstormHoursList.length * 10);
    }

    // Factor in high precip probability (proxy for storm likelihood)
    const maxPrecipProb = Math.max(...raceHourlyData.map(h => h.precipProbability || 0));
    details.maxPrecipProb = maxPrecipProb;

    if (maxPrecipProb > 70) {
        score = Math.max(score, 30 + (maxPrecipProb - 70));
    }

    // Any rain codes also raise lightning concern in FL summer pattern
    const rainHoursList = raceHourlyData.filter(h =>
        [...RAIN_CODES, ...THUNDERSTORM_CODES].includes(h.weatherCode)
    );
    details.rainHours = rainHoursList.length;

    if (rainHoursList.length >= 3) {
        score = Math.max(score, 25 + rainHoursList.length * 5);
    }

    // CAPE-based scoring (Phase 2)
    const capeValues = raceHourlyData.map(h => h.cape).filter(v => v != null);
    if (capeValues.length > 0) {
        const capeMax = Math.max(...capeValues);
        details.capeMax = Math.round(capeMax);

        if (capeMax > CAPE_THRESHOLDS.EXTREME) {
            score = Math.max(score, score + 40);
        } else if (capeMax > CAPE_THRESHOLDS.HIGH) {
            score = Math.max(score, score + 25);
        } else if (capeMax > CAPE_THRESHOLDS.MODERATE) {
            score = Math.max(score, score + 10);
        }
    }

    // Lifted index scoring
    const liValues = raceHourlyData.map(h => h.liftedIndex).filter(v => v != null);
    if (liValues.length > 0) {
        const liMin = Math.min(...liValues);
        details.liftedIndexMin = Math.round(liMin);

        if (liMin < -3) {
            score += 10;
        }
    }

    return { score: Math.min(100, Math.round(score)), details };
}

/**
 * Trail damage risk from cumulative rain, soil moisture, and forecast rain
 * @param {object} weatherData
 * @param {string} raceDateStr
 * @param {number|null} climateDeparture - mm above/below normal (optional, Phase 6)
 */
export function scoreTrailDamage(weatherData, raceDateStr, climateDeparture = null) {
    const details = { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0, climateDeparture };
    if (!weatherData || !weatherData.hourly) return { score: 0, details };

    const raceDate = new Date(raceDateStr + 'T00:00:00');

    let score = 0;

    // 1. 7-day cumulative rainfall leading up to race
    const sevenDaysBefore = new Date(raceDate);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);

    const pastRain = weatherData.hourly
        .filter(h => h.time >= sevenDaysBefore && h.time < raceDate)
        .reduce((sum, h) => sum + (h.precipitation || 0), 0);
    details.pastRain7d = Math.round(pastRain);

    if (pastRain > TRAIL_THRESHOLDS.RAIN_7DAY_CRITICAL_MM) {
        score += 50;
    } else if (pastRain > TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM) {
        score += 25 + ((pastRain - TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM) /
            (TRAIL_THRESHOLDS.RAIN_7DAY_CRITICAL_MM - TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM)) * 25;
    }

    // 2. Soil moisture levels (most recent available before race)
    const soilReadings = weatherData.hourly
        .filter(h => h.time <= raceDate && h.soilMoisture0to7 !== null)
        .slice(-24);

    if (soilReadings.length > 0) {
        const avgSoilMoisture = soilReadings.reduce((s, h) => s + h.soilMoisture0to7, 0) / soilReadings.length;
        details.avgSoilMoisture = avgSoilMoisture;

        if (avgSoilMoisture > TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL) {
            score += 40;
        } else if (avgSoilMoisture > TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH) {
            score += 15 + ((avgSoilMoisture - TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH) /
                (TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL - TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH)) * 25;
        }
    }

    // 3. Forecast rain on race day
    const raceDayRain = weatherData.hourly
        .filter(h => {
            const hDate = h.time.toISOString().slice(0, 10);
            return hDate === raceDateStr;
        })
        .reduce((sum, h) => sum + (h.precipitation || 0), 0);
    details.raceDayRain = Math.round(raceDayRain);

    if (raceDayRain > 20) {
        score += 30;
    } else if (raceDayRain > 5) {
        score += 10 + (raceDayRain / 20) * 20;
    }

    // 4. Rain intensity — any single hour with heavy rain
    const maxHourlyRain = Math.max(
        ...weatherData.hourly
            .filter(h => {
                const hDate = h.time.toISOString().slice(0, 10);
                return hDate === raceDateStr;
            })
            .map(h => h.precipitation || 0),
        0
    );
    details.maxHourlyRain = Math.round(maxHourlyRain);

    if (maxHourlyRain > TRAIL_THRESHOLDS.RAIN_INTENSITY_HIGH_MM) {
        score += 15;
    }

    // 5. Departure from normal rainfall (Phase 6)
    if (climateDeparture != null) {
        if (climateDeparture > 100) {
            score += 20;
        } else if (climateDeparture > 50) {
            score += 10;
        }
    }

    return { score: Math.min(100, Math.round(score)), details };
}

/**
 * Wind risk from sustained speeds and gusts
 */
export function scoreWind(raceHourlyData) {
    const details = { maxSustained: 0, maxGust: 0 };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let score = 0;

    const maxWind = Math.max(...raceHourlyData.map(h => h.windSpeed || 0));
    const maxGust = Math.max(...raceHourlyData.map(h => h.windGusts || 0));
    details.maxSustained = Math.round(maxWind);
    details.maxGust = Math.round(maxGust);

    // Sustained wind scoring
    if (maxWind > WIND_THRESHOLDS.WARNING_KMH) {
        score += 50 + ((maxWind - WIND_THRESHOLDS.WARNING_KMH) / 20) * 30;
    } else if (maxWind > WIND_THRESHOLDS.ADVISORY_KMH) {
        score += 20 + ((maxWind - WIND_THRESHOLDS.ADVISORY_KMH) /
            (WIND_THRESHOLDS.WARNING_KMH - WIND_THRESHOLDS.ADVISORY_KMH)) * 30;
    }

    // Gust scoring
    if (maxGust > WIND_THRESHOLDS.GUST_WARNING_KMH) {
        score += 30;
    } else if (maxGust > WIND_THRESHOLDS.GUST_ADVISORY_KMH) {
        score += 15;
    }

    return { score: Math.min(100, Math.round(score)), details };
}

/**
 * Heat risk from estimated WBGT during race hours (Phase 3)
 */
export function scoreHeatRisk(raceHourlyData) {
    const details = { peakWBGT_F: null, peakHour: null };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let peakWBGT_F = 0;
    let peakHour = null;

    for (const h of raceHourlyData) {
        const wbgtC = calculateWBGT(h.temperature, h.humidity, h.windSpeed || 0);
        if (wbgtC == null) continue;
        const wbgtF = celsiusToFahrenheit(wbgtC);
        if (wbgtF > peakWBGT_F) {
            peakWBGT_F = wbgtF;
            peakHour = h.time;
        }
    }

    details.peakWBGT_F = Math.round(peakWBGT_F);
    details.peakHour = peakHour;

    let score = 0;
    if (peakWBGT_F > WBGT_THRESHOLDS.ORANGE_MAX_F) {
        // >90°F: 80-100
        score = 80 + Math.min(20, (peakWBGT_F - WBGT_THRESHOLDS.ORANGE_MAX_F) * 2);
    } else if (peakWBGT_F > WBGT_THRESHOLDS.YELLOW_MAX_F) {
        // 87-90°F: 50-80
        const range = WBGT_THRESHOLDS.ORANGE_MAX_F - WBGT_THRESHOLDS.YELLOW_MAX_F;
        score = 50 + ((peakWBGT_F - WBGT_THRESHOLDS.YELLOW_MAX_F) / range) * 30;
    } else if (peakWBGT_F > WBGT_THRESHOLDS.GREEN_MAX_F) {
        // 82-87°F: 20-50
        const range = WBGT_THRESHOLDS.YELLOW_MAX_F - WBGT_THRESHOLDS.GREEN_MAX_F;
        score = 20 + ((peakWBGT_F - WBGT_THRESHOLDS.GREEN_MAX_F) / range) * 30;
    }

    return { score: Math.min(100, Math.round(score)), details };
}

/**
 * Compute overall risk and level from individual scores
 * Overall = max(lightning, trailDamage, wind * 0.5, heat)
 */
export function computeOverallRisk(lightning, trailDamage, wind, heat = 0) {
    const overall = Math.round(Math.max(lightning, trailDamage, wind * 0.5, heat));

    let level;
    if (overall > RISK_THRESHOLDS.YELLOW_MAX) {
        level = 'RED';
    } else if (overall > RISK_THRESHOLDS.GREEN_MAX) {
        level = 'YELLOW';
    } else {
        level = 'GREEN';
    }

    return { overall, level };
}

/**
 * Get risk summary text for a given level
 */
export function getRiskSummary(level, lightning, trailDamage, wind, heat = 0) {
    const factors = [];
    if (lightning > 30) factors.push('lightning');
    if (trailDamage > 30) factors.push('trail damage');
    if (wind > 60) factors.push('wind');
    if (heat > 30) factors.push('heat');

    switch (level) {
        case 'GREEN':
            return 'Conditions look good for racing';
        case 'YELLOW':
            return `Monitor: ${factors.join(', ') || 'conditions may change'}`;
        case 'RED':
            return `High risk: ${factors.join(', ') || 'severe conditions expected'}`;
        default:
            return 'Unable to assess';
    }
}

/**
 * Apply NWS alert overrides — force RED if auto-red events are active during race window
 * @param {object} riskResult - existing risk assessment result
 * @param {Array} alerts - NWS alerts filtered for race window
 * @returns {object} possibly overridden risk result
 */
export function applyNWSOverrides(riskResult, alerts) {
    if (!alerts || alerts.length === 0) return riskResult;

    const autoRedAlerts = alerts.filter(a =>
        NWS_AUTO_RED_EVENTS.includes(a.event)
    );

    if (autoRedAlerts.length > 0) {
        return {
            ...riskResult,
            overall: 100,
            level: 'RED',
            summary: `NWS ${autoRedAlerts[0].event} active — race cancellation required`,
            nwsOverride: true,
            nwsOverrideEvent: autoRedAlerts[0].event
        };
    }

    return riskResult;
}

/**
 * Full risk assessment for a single race
 * @param {object} weatherData
 * @param {object} race
 * @param {Array} alerts - optional NWS alerts
 * @param {number|null} climateDeparture - optional mm above/below normal
 */
export function assessRaceRisk(weatherData, race, alerts = [], climateDeparture = null) {
    if (!weatherData || !weatherData.hourly) {
        return {
            lightning: 0, trailDamage: 0, wind: 0, heat: 0, overall: 0, level: 'GREEN',
            summary: 'No weather data available',
            lightningDetails: { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0, capeMax: 0, liftedIndexMin: null },
            trailDamageDetails: { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0, climateDeparture: null },
            windDetails: { maxSustained: 0, maxGust: 0 },
            heatDetails: { peakWBGT_F: null, peakHour: null }
        };
    }

    // Get hourly data for race day(s) during race hours
    const raceHourlyData = getRaceHourlyWindow(weatherData, race);

    const lightningResult = scoreLightning(raceHourlyData);
    const trailResult = scoreTrailDamage(weatherData, race.dates.start, climateDeparture);
    const windResult = scoreWind(raceHourlyData);
    const heatResult = scoreHeatRisk(raceHourlyData);

    const lightning = lightningResult.score;
    const trailDamage = trailResult.score;
    const wind = windResult.score;
    const heat = heatResult.score;

    const { overall, level } = computeOverallRisk(lightning, trailDamage, wind, heat);
    const summary = getRiskSummary(level, lightning, trailDamage, wind, heat);

    let result = {
        lightning, trailDamage, wind, heat, overall, level, summary,
        lightningDetails: lightningResult.details,
        trailDamageDetails: trailResult.details,
        windDetails: windResult.details,
        heatDetails: heatResult.details
    };

    // Apply NWS overrides
    result = applyNWSOverrides(result, alerts);

    return result;
}

/**
 * Extract hourly data for race hours (both days of a 2-day event)
 */
export function getRaceHourlyWindow(weatherData, race) {
    const startDate = race.dates.start;
    const endDate = race.dates.end;
    const { start: startHour, end: endHour } = race.raceHours;

    return weatherData.hourly.filter(h => {
        const dateStr = h.time.toISOString().slice(0, 10);
        const hour = h.time.getHours();
        return dateStr >= startDate && dateStr <= endDate && hour >= startHour && hour <= endHour;
    });
}
