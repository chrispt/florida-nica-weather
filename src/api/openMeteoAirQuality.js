/**
 * Open-Meteo Air Quality API integration
 * Fetches US AQI data for race venues
 */

import { fetchWithErrorHandling } from './client.js';
import { OPEN_METEO_AQ_BASE } from '../config/constants.js';

/**
 * Fetch air quality data for a race venue
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function fetchAirQuality(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        hourly: 'us_aqi',
        forecast_days: 3,
        timezone: 'auto'
    });

    const url = `${OPEN_METEO_AQ_BASE}?${params.toString()}`;
    const { data, error } = await fetchWithErrorHandling(url);

    if (error) {
        console.warn('AQI fetch failed (non-critical):', error.message);
        return { data: null, error };
    }

    if (!data.hourly || !data.hourly.time) {
        return { data: null, error: new Error('No AQI data available') };
    }

    const aqiData = data.hourly.time.map((time, i) => ({
        time: new Date(time),
        aqi: data.hourly.us_aqi?.[i] ?? null
    }));

    return { data: aqiData, error: null };
}
