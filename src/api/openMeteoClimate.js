/**
 * Open-Meteo Climate API client
 * Fetches 30-year precipitation normals for departure-from-normal calculation
 */

import { fetchWithRetry } from './client.js';
import { STORAGE_KEYS } from '../config/constants.js';

const CLIMATE_API_BASE = 'https://climate-api.open-meteo.com/v1/climate';

// Normals cover 1991-2020 and never change. Each request downloads about 11,000 days
// of data, so they are kept in memory and in localStorage. That drops the heaviest
// call on every visit after the first and keeps it clear of Open-Meteo's rate limit.
const climateCache = new Map();
const STORED_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Storage can be blocked (private mode) or full; the fetch path still works without it
function readStored() {
    try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIMATE_NORMALS) || '{}');
        const now = Date.now();
        const live = {};
        for (const [key, entry] of Object.entries(all)) {
            if (entry && typeof entry.n === 'number' && now - entry.t < STORED_TTL_MS) live[key] = entry;
        }
        return live;
    } catch {
        return {};
    }
}

function writeStored(key, normalPrecip7d) {
    try {
        const all = readStored();
        all[key] = { n: normalPrecip7d, t: Date.now() };
        localStorage.setItem(STORAGE_KEYS.CLIMATE_NORMALS, JSON.stringify(all));
    } catch { /* ignore */ }
}

/**
 * Fetch 30-year precipitation normal for a 7-day window before a race date
 * @param {number} lat
 * @param {number} lon
 * @param {string} raceDateStr - YYYY-MM-DD
 * @returns {Promise<{normalPrecip7d: number|null, startDate: string, endDate: string}>}
 */
export async function fetchClimatePrecipNormal(lat, lon, raceDateStr) {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${raceDateStr}`;
    if (climateCache.has(cacheKey)) {
        return climateCache.get(cacheKey);
    }

    // Calculate 7-day window before race
    const raceDate = new Date(raceDateStr + 'T00:00:00');
    const windowStart = new Date(raceDate);
    windowStart.setDate(windowStart.getDate() - 7);

    const startDate = windowStart.toISOString().slice(0, 10);
    const endDate = raceDateStr;

    const stored = readStored()[cacheKey];
    if (stored) {
        const result = { normalPrecip7d: stored.n, startDate, endDate };
        climateCache.set(cacheKey, result);
        return result;
    }

    // Use ERA5 reanalysis data (1950-2020 normals)
    // We request daily precipitation sum across a representative date range
    const startMonth = windowStart.getMonth() + 1;
    const startDay = windowStart.getDate();
    const endMonth = raceDate.getMonth() + 1;
    const endDay = raceDate.getDate();

    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        start_date: '1991-01-01',
        end_date: '2020-12-31',
        models: 'EC_Earth3P_HR',
        daily: 'precipitation_sum'
    });

    try {
        const url = `${CLIMATE_API_BASE}?${params.toString()}`;
        const response = await fetchWithRetry(url, {
            headers: { 'Accept': 'application/json' }
        });

        // Failures are deliberately not cached: a 429 should not blank this venue's
        // climate line for the rest of the session once the limit has cleared.
        if (!response.ok) {
            console.warn(`Climate API error: ${response.status}`);
            return { normalPrecip7d: null, startDate, endDate };
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time || !data.daily.precipitation_sum) {
            return { normalPrecip7d: null, startDate, endDate };
        }

        // Filter for matching month-day window across all years, then average
        const matchingDays = [];
        for (let i = 0; i < data.daily.time.length; i++) {
            const d = new Date(data.daily.time[i] + 'T00:00:00');
            const month = d.getMonth() + 1;
            const day = d.getDate();

            if (isInWindow(month, day, startMonth, startDay, endMonth, endDay)) {
                const precip = data.daily.precipitation_sum[i];
                if (precip != null) matchingDays.push(precip);
            }
        }

        // Average 7-day precipitation for this calendar window
        let normalPrecip7d = null;
        if (matchingDays.length > 0) {
            // Group by year and sum the 7-day window per year, then average
            const totalSum = matchingDays.reduce((s, v) => s + v, 0);
            const yearsCount = 30; // 1991-2020
            normalPrecip7d = Math.round(totalSum / yearsCount);
        }

        const result = { normalPrecip7d, startDate, endDate };
        if (normalPrecip7d != null) {
            climateCache.set(cacheKey, result);
            writeStored(cacheKey, normalPrecip7d);
        }
        return result;
    } catch (error) {
        console.warn('Climate normals fetch failed:', error.message);
        return { normalPrecip7d: null, startDate, endDate };
    }
}

/**
 * Check if a month/day falls within a window (handles year boundary)
 */
function isInWindow(month, day, startMonth, startDay, endMonth, endDay) {
    const md = month * 100 + day;
    const startMd = startMonth * 100 + startDay;
    const endMd = endMonth * 100 + endDay;

    if (startMd <= endMd) {
        return md >= startMd && md <= endMd;
    }
    // Window crosses year boundary
    return md >= startMd || md <= endMd;
}
