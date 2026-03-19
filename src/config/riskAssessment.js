/**
 * Pure risk scoring functions for race go/no-go decisions.
 *
 * 4-level system per NICA weather guidelines:
 *   GREEN  0-25   — No concerns
 *   YELLOW 25-50  — Monitor closely
 *   ORANGE 50-75  — Caution: activity may need modification
 *   RED    75-100 — Likely cancellation
 */

import {
    THUNDERSTORM_CODES, HEAVY_RAIN_CODES, RAIN_CODES,
    TRAIL_THRESHOLDS, WIND_THRESHOLDS, RISK_THRESHOLDS,
    CAPE_THRESHOLDS, NWS_AUTO_RED_EVENTS, NWS_AUTO_ORANGE_EVENTS,
    HEAT_INDEX_THRESHOLDS, HEAVY_RAIN_RATE_THRESHOLDS,
    AQI_THRESHOLDS, NICA_ACTIONS
} from './constants.js';
import { calculateHeatIndex, celsiusToFahrenheit } from '../utils/heatIndex.js';

/**
 * Lightning risk from thunderstorm codes + precip probability + CAPE during race hours
 */
export function scoreLightning(raceHourlyData) {
    const details = { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0, capeMax: 0, liftedIndexMin: null, nicaAction: '' };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let score = 0;

    // Check for thunderstorm weather codes during race hours
    const thunderstormHoursList = raceHourlyData.filter(h =>
        THUNDERSTORM_CODES.includes(h.weatherCode)
    );
    details.thunderstormHours = thunderstormHoursList.length;

    if (thunderstormHoursList.length > 0) {
        // ORANGE base (50) + 8 per storm hour, capped at RED territory
        score = Math.min(100, 50 + thunderstormHoursList.length * 8);
    }

    // Factor in high precip probability
    const maxPrecipProb = Math.max(...raceHourlyData.map(h => h.precipProbability || 0));
    details.maxPrecipProb = maxPrecipProb;

    if (maxPrecipProb > 70) {
        score = Math.max(score, 25 + ((maxPrecipProb - 70) / 30) * 25);
    }

    // Rain codes raise lightning concern in FL summer pattern
    const rainHoursList = raceHourlyData.filter(h =>
        [...RAIN_CODES, ...THUNDERSTORM_CODES].includes(h.weatherCode)
    );
    details.rainHours = rainHoursList.length;

    if (rainHoursList.length >= 3) {
        score = Math.max(score, 20 + rainHoursList.length * 4);
    }

    // CAPE-based scoring
    const capeValues = raceHourlyData.map(h => h.cape).filter(v => v != null);
    if (capeValues.length > 0) {
        const capeMax = Math.max(...capeValues);
        details.capeMax = Math.round(capeMax);

        if (capeMax > CAPE_THRESHOLDS.EXTREME) {
            score = Math.max(score, 75);
        } else if (capeMax > CAPE_THRESHOLDS.HIGH) {
            score = Math.max(score, 50);
        } else if (capeMax > CAPE_THRESHOLDS.MODERATE) {
            score = Math.max(score, 25);
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

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('lightning', score);
    return { score, details };
}

/**
 * Trail damage risk from cumulative rain, soil moisture, and forecast rain
 */
export function scoreTrailDamage(weatherData, raceDateStr, climateDeparture = null) {
    const details = { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0, climateDeparture, nicaAction: '' };
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
        score += 45;
    } else if (pastRain > TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM) {
        score += 20 + ((pastRain - TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM) /
            (TRAIL_THRESHOLDS.RAIN_7DAY_CRITICAL_MM - TRAIL_THRESHOLDS.RAIN_7DAY_HIGH_MM)) * 25;
    }

    // 2. Soil moisture levels
    const soilReadings = weatherData.hourly
        .filter(h => h.time <= raceDate && h.soilMoisture0to7 !== null)
        .slice(-24);

    if (soilReadings.length > 0) {
        const avgSoilMoisture = soilReadings.reduce((s, h) => s + h.soilMoisture0to7, 0) / soilReadings.length;
        details.avgSoilMoisture = avgSoilMoisture;

        if (avgSoilMoisture > TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL) {
            score += 35;
        } else if (avgSoilMoisture > TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH) {
            score += 12 + ((avgSoilMoisture - TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH) /
                (TRAIL_THRESHOLDS.SOIL_MOISTURE_CRITICAL - TRAIL_THRESHOLDS.SOIL_MOISTURE_HIGH)) * 23;
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
        score += 25;
    } else if (raceDayRain > 5) {
        score += 8 + (raceDayRain / 20) * 17;
    }

    // 4. Rain intensity
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
        score += 12;
    }

    // 5. Departure from normal rainfall
    if (climateDeparture != null) {
        if (climateDeparture > 100) {
            score += 15;
        } else if (climateDeparture > 50) {
            score += 8;
        }
    }

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('trailDamage', score);
    return { score, details };
}

/**
 * Wind risk from sustained speeds and gusts
 */
export function scoreWind(raceHourlyData) {
    const details = { maxSustained: 0, maxGust: 0, nicaAction: '' };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let score = 0;

    const maxWind = Math.max(...raceHourlyData.map(h => h.windSpeed || 0));
    const maxGust = Math.max(...raceHourlyData.map(h => h.windGusts || 0));
    details.maxSustained = Math.round(maxWind);
    details.maxGust = Math.round(maxGust);

    // Sustained wind scoring — 4 bands
    if (maxWind > WIND_THRESHOLDS.WARNING_KMH) {
        // >56 km/h (35 mph) sustained = RED zone
        score += 75 + Math.min(25, ((maxWind - WIND_THRESHOLDS.WARNING_KMH) / 20) * 25);
    } else if (maxWind > WIND_THRESHOLDS.ADVISORY_KMH) {
        // 40-56 km/h (25-35 mph) = YELLOW-ORANGE zone
        score += 25 + ((maxWind - WIND_THRESHOLDS.ADVISORY_KMH) /
            (WIND_THRESHOLDS.WARNING_KMH - WIND_THRESHOLDS.ADVISORY_KMH)) * 50;
    }

    // Gust scoring — ORANGE if gusts exceed advisory
    if (maxGust > WIND_THRESHOLDS.GUST_WARNING_KMH) {
        score = Math.max(score, 75);
    } else if (maxGust > WIND_THRESHOLDS.GUST_ADVISORY_KMH) {
        score = Math.max(score, 50);
    }

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('wind', score);
    return { score, details };
}

/**
 * Heat risk using NWS Heat Index (replacing WBGT)
 */
export function scoreHeatRisk(raceHourlyData) {
    const details = { peakHeatIndex_F: null, peakHour: null, nicaAction: '' };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let peakHI_F = 0;
    let peakHour = null;

    for (const h of raceHourlyData) {
        const hiF = calculateHeatIndex(h.temperature, h.humidity);
        if (hiF == null) continue;
        if (hiF > peakHI_F) {
            peakHI_F = hiF;
            peakHour = h.time;
        }
    }

    details.peakHeatIndex_F = Math.round(peakHI_F);
    details.peakHour = peakHour;

    let score = 0;
    if (peakHI_F > HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F) {
        // >105°F: RED (75-100)
        score = 75 + Math.min(25, (peakHI_F - HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F) * 2.5);
    } else if (peakHI_F > HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F) {
        // 100-105°F: ORANGE (50-75)
        const range = HEAT_INDEX_THRESHOLDS.ORANGE_MAX_F - HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F;
        score = 50 + ((peakHI_F - HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F) / range) * 25;
    } else if (peakHI_F > HEAT_INDEX_THRESHOLDS.GREEN_MAX_F) {
        // 95-100°F: YELLOW (25-50)
        const range = HEAT_INDEX_THRESHOLDS.YELLOW_MAX_F - HEAT_INDEX_THRESHOLDS.GREEN_MAX_F;
        score = 25 + ((peakHI_F - HEAT_INDEX_THRESHOLDS.GREEN_MAX_F) / range) * 25;
    }

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('heat', score);
    return { score, details };
}

/**
 * Heavy rain risk — scores hourly rain rate during race hours
 * Separate from Trail Damage — this is about immediate safety
 */
export function scoreHeavyRain(raceHourlyData) {
    const details = { maxRainRateMmHr: 0, maxRainRateHour: null, nicaAction: '' };
    if (!raceHourlyData || raceHourlyData.length === 0) return { score: 0, details };

    let maxRate = 0;
    let maxRateHour = null;

    for (const h of raceHourlyData) {
        const rate = h.precipitation || 0;
        if (rate > maxRate) {
            maxRate = rate;
            maxRateHour = h.time;
        }
    }

    details.maxRainRateMmHr = Math.round(maxRate * 100) / 100;
    details.maxRainRateHour = maxRateHour;

    let score = 0;
    if (maxRate > HEAVY_RAIN_RATE_THRESHOLDS.ORANGE_MAX_MM_HR) {
        // >10.16 mm/hr (0.40 in/hr): RED
        score = 75 + Math.min(25, ((maxRate - HEAVY_RAIN_RATE_THRESHOLDS.ORANGE_MAX_MM_HR) / 5) * 25);
    } else if (maxRate > HEAVY_RAIN_RATE_THRESHOLDS.YELLOW_MAX_MM_HR) {
        // 5.08-10.16 mm/hr: ORANGE
        const range = HEAVY_RAIN_RATE_THRESHOLDS.ORANGE_MAX_MM_HR - HEAVY_RAIN_RATE_THRESHOLDS.YELLOW_MAX_MM_HR;
        score = 50 + ((maxRate - HEAVY_RAIN_RATE_THRESHOLDS.YELLOW_MAX_MM_HR) / range) * 25;
    } else if (maxRate > 0.25) {
        // 0.25-5.08 mm/hr: YELLOW range
        score = 5 + ((maxRate - 0.25) / (HEAVY_RAIN_RATE_THRESHOLDS.YELLOW_MAX_MM_HR - 0.25)) * 45;
    }

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('heavyRain', score);
    return { score, details };
}

/**
 * Air quality risk from AQI data during race hours
 */
export function scoreAirQuality(aqiData, race) {
    const details = { peakAQI: 0, peakHour: null, nicaAction: '' };
    if (!aqiData || aqiData.length === 0) return { score: 0, details };

    // Filter AQI to race hours
    const startDate = race.dates.start;
    const endDate = race.dates.end;
    const { start: startHour, end: endHour } = race.raceHours;

    const raceAQI = aqiData.filter(d => {
        if (d.aqi == null) return false;
        const dateStr = d.time.toISOString().slice(0, 10);
        const hour = d.time.getHours();
        return dateStr >= startDate && dateStr <= endDate && hour >= startHour && hour <= endHour;
    });

    if (raceAQI.length === 0) return { score: 0, details };

    let peakAQI = 0;
    let peakHour = null;

    for (const d of raceAQI) {
        if (d.aqi > peakAQI) {
            peakAQI = d.aqi;
            peakHour = d.time;
        }
    }

    details.peakAQI = peakAQI;
    details.peakHour = peakHour;

    let score = 0;
    if (peakAQI > AQI_THRESHOLDS.ORANGE_MAX) {
        // >150: RED
        score = 75 + Math.min(25, ((peakAQI - AQI_THRESHOLDS.ORANGE_MAX) / 50) * 25);
    } else if (peakAQI > AQI_THRESHOLDS.YELLOW_MAX) {
        // 100-150: ORANGE
        const range = AQI_THRESHOLDS.ORANGE_MAX - AQI_THRESHOLDS.YELLOW_MAX;
        score = 50 + ((peakAQI - AQI_THRESHOLDS.YELLOW_MAX) / range) * 25;
    } else if (peakAQI > AQI_THRESHOLDS.GREEN_MAX) {
        // 50-100: YELLOW
        const range = AQI_THRESHOLDS.YELLOW_MAX - AQI_THRESHOLDS.GREEN_MAX;
        score = 25 + ((peakAQI - AQI_THRESHOLDS.GREEN_MAX) / range) * 25;
    }

    score = Math.min(100, Math.round(score));
    details.nicaAction = getNicaAction('aqi', score);
    return { score, details };
}

/**
 * Compute overall risk and level from individual scores
 * Overall = max of ALL categories (no weighting — NICA treats all equally)
 */
export function computeOverallRisk(scores) {
    const { lightning = 0, trailDamage = 0, wind = 0, heat = 0, heavyRain = 0, aqi = 0 } = scores;
    const overall = Math.round(Math.max(lightning, trailDamage, wind, heat, heavyRain, aqi));

    let level;
    if (overall > RISK_THRESHOLDS.ORANGE_MAX) {
        level = 'RED';
    } else if (overall > RISK_THRESHOLDS.YELLOW_MAX) {
        level = 'ORANGE';
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
export function getRiskSummary(level, scores) {
    const { lightning = 0, trailDamage = 0, wind = 0, heat = 0, heavyRain = 0, aqi = 0 } = scores;
    const factors = [];
    if (lightning > 25) factors.push('lightning');
    if (trailDamage > 25) factors.push('trail damage');
    if (wind > 25) factors.push('wind');
    if (heat > 25) factors.push('heat');
    if (heavyRain > 25) factors.push('heavy rain');
    if (aqi > 25) factors.push('air quality');

    switch (level) {
        case 'GREEN':
            return 'Conditions look good for racing';
        case 'YELLOW':
            return `Monitor: ${factors.join(', ') || 'conditions may change'}`;
        case 'ORANGE':
            return `Caution: ${factors.join(', ') || 'conditions'} — activity may need modification`;
        case 'RED':
            return `High risk: ${factors.join(', ') || 'severe conditions expected'}`;
        default:
            return 'Unable to assess';
    }
}

/**
 * Apply NWS alert overrides
 * Warnings → force RED, Watches → force ORANGE minimum
 */
export function applyNWSOverrides(riskResult, alerts) {
    if (!alerts || alerts.length === 0) return riskResult;

    // Check for RED overrides (Warnings)
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

    // Check for ORANGE overrides (Watches)
    const autoOrangeAlerts = alerts.filter(a =>
        NWS_AUTO_ORANGE_EVENTS.includes(a.event)
    );

    if (autoOrangeAlerts.length > 0 && riskResult.overall < 50) {
        return {
            ...riskResult,
            overall: Math.max(riskResult.overall, 60),
            level: riskResult.level === 'GREEN' || riskResult.level === 'YELLOW' ? 'ORANGE' : riskResult.level,
            summary: `NWS ${autoOrangeAlerts[0].event} active — enhanced monitoring required`,
            nwsOverride: true,
            nwsOverrideEvent: autoOrangeAlerts[0].event
        };
    }

    return riskResult;
}

/**
 * Full risk assessment for a single race
 */
export function assessRaceRisk(weatherData, race, alerts = [], climateDeparture = null, aqiData = null, lightningStrikeData = null) {
    if (!weatherData || !weatherData.hourly) {
        return {
            lightning: 0, trailDamage: 0, wind: 0, heat: 0, heavyRain: 0, aqi: 0,
            overall: 0, level: 'GREEN',
            summary: 'No weather data available',
            lightningDetails: { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0, capeMax: 0, liftedIndexMin: null, nicaAction: '' },
            trailDamageDetails: { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0, climateDeparture: null, nicaAction: '' },
            windDetails: { maxSustained: 0, maxGust: 0, nicaAction: '' },
            heatDetails: { peakHeatIndex_F: null, peakHour: null, nicaAction: '' },
            heavyRainDetails: { maxRainRateMmHr: 0, maxRainRateHour: null, nicaAction: '' },
            aqiDetails: { peakAQI: 0, peakHour: null, nicaAction: '' }
        };
    }

    // Get hourly data for race day(s) during race hours
    const raceHourlyData = getRaceHourlyWindow(weatherData, race);

    const lightningResult = scoreLightning(raceHourlyData);
    const trailResult = scoreTrailDamage(weatherData, race.dates.start, climateDeparture);
    const windResult = scoreWind(raceHourlyData);
    const heatResult = scoreHeatRisk(raceHourlyData);
    const heavyRainResult = scoreHeavyRain(raceHourlyData);
    const aqiResult = scoreAirQuality(aqiData, race);

    // Real-time lightning strike override
    if (lightningStrikeData && lightningStrikeData.dangerCount > 0) {
        lightningResult.score = 100;
        lightningResult.details.realTimeStrikes = lightningStrikeData.dangerCount;
        lightningResult.details.closestStrikeMiles = lightningStrikeData.closestStrike?.distanceMiles || null;
    }

    const scores = {
        lightning: lightningResult.score,
        trailDamage: trailResult.score,
        wind: windResult.score,
        heat: heatResult.score,
        heavyRain: heavyRainResult.score,
        aqi: aqiResult.score
    };

    const { overall, level } = computeOverallRisk(scores);
    const summary = getRiskSummary(level, scores);

    let result = {
        ...scores, overall, level, summary,
        lightningDetails: lightningResult.details,
        trailDamageDetails: trailResult.details,
        windDetails: windResult.details,
        heatDetails: heatResult.details,
        heavyRainDetails: heavyRainResult.details,
        aqiDetails: aqiResult.details
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

/**
 * Helper: get NICA action text based on category and score
 */
function getNicaAction(category, score) {
    const actions = NICA_ACTIONS[category];
    if (!actions) return '';

    if (score > RISK_THRESHOLDS.ORANGE_MAX) return actions.RED;
    if (score > RISK_THRESHOLDS.YELLOW_MAX) return actions.ORANGE;
    if (score > RISK_THRESHOLDS.GREEN_MAX) return actions.YELLOW;
    return actions.GREEN;
}
