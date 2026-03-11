/**
 * Open-Meteo Climate API client
 * Fetches 30-year precipitation normals for departure-from-normal calculation
 */

const CLIMATE_API_BASE = 'https://climate-api.open-meteo.com/v1/climate';

// Cache climate normals since they don't change
const climateCache = new Map();

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
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.warn(`Climate API error: ${response.status}`);
            const result = { normalPrecip7d: null, startDate, endDate };
            climateCache.set(cacheKey, result);
            return result;
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time || !data.daily.precipitation_sum) {
            const result = { normalPrecip7d: null, startDate, endDate };
            climateCache.set(cacheKey, result);
            return result;
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
        climateCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.warn('Climate normals fetch failed:', error.message);
        const result = { normalPrecip7d: null, startDate, endDate };
        climateCache.set(cacheKey, result);
        return result;
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
