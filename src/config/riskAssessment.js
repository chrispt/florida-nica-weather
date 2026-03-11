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
    TRAIL_THRESHOLDS, WIND_THRESHOLDS, RISK_THRESHOLDS
} from './constants.js';

/**
 * Lightning risk from thunderstorm codes + precip probability during race hours
 */
export function scoreLightning(raceHourlyData) {
    const details = { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0 };
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

    return { score: Math.min(100, Math.round(score)), details };
}

/**
 * Trail damage risk from cumulative rain, soil moisture, and forecast rain
 */
export function scoreTrailDamage(weatherData, raceDateStr) {
    const details = { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0 };
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
 * Compute overall risk and level from individual scores
 * Overall = max(lightning, trailDamage, wind * 0.5)
 * Wind is weighted down since it's a secondary concern for MTB racing
 */
export function computeOverallRisk(lightning, trailDamage, wind) {
    const overall = Math.round(Math.max(lightning, trailDamage, wind * 0.5));

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
export function getRiskSummary(level, lightning, trailDamage, wind) {
    const factors = [];
    if (lightning > 30) factors.push('lightning');
    if (trailDamage > 30) factors.push('trail damage');
    if (wind > 60) factors.push('wind');

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
 * Full risk assessment for a single race
 */
export function assessRaceRisk(weatherData, race) {
    if (!weatherData || !weatherData.hourly) {
        return {
            lightning: 0, trailDamage: 0, wind: 0, overall: 0, level: 'GREEN',
            summary: 'No weather data available',
            lightningDetails: { thunderstormHours: 0, maxPrecipProb: 0, rainHours: 0 },
            trailDamageDetails: { pastRain7d: 0, avgSoilMoisture: 0, raceDayRain: 0, maxHourlyRain: 0 },
            windDetails: { maxSustained: 0, maxGust: 0 }
        };
    }

    // Get hourly data for race day(s) during race hours
    const raceHourlyData = getRaceHourlyWindow(weatherData, race);

    const lightningResult = scoreLightning(raceHourlyData);
    const trailResult = scoreTrailDamage(weatherData, race.dates.start);
    const windResult = scoreWind(raceHourlyData);

    const lightning = lightningResult.score;
    const trailDamage = trailResult.score;
    const wind = windResult.score;

    const { overall, level } = computeOverallRisk(lightning, trailDamage, wind);
    const summary = getRiskSummary(level, lightning, trailDamage, wind);

    return {
        lightning, trailDamage, wind, overall, level, summary,
        lightningDetails: lightningResult.details,
        trailDamageDetails: trailResult.details,
        windDetails: windResult.details
    };
}

/**
 * Extract hourly data for race hours (both days of a 2-day event)
 */
function getRaceHourlyWindow(weatherData, race) {
    const startDate = race.dates.start;
    const endDate = race.dates.end;
    const { start: startHour, end: endHour } = race.raceHours;

    return weatherData.hourly.filter(h => {
        const dateStr = h.time.toISOString().slice(0, 10);
        const hour = h.time.getHours();
        return dateStr >= startDate && dateStr <= endDate && hour >= startHour && hour <= endHour;
    });
}
