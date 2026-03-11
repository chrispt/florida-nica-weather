/**
 * Open-Meteo Weather API integration
 * Fetches hourly + daily forecasts with soil moisture for trail assessment
 */

import { fetchWithErrorHandling } from './client.js';
import { OPEN_METEO_BASE, HOURLY_PARAMS, DAILY_PARAMS } from '../config/constants.js';

/**
 * Fetch weather data for a race venue
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function fetchRaceWeather(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        hourly: HOURLY_PARAMS,
        daily: DAILY_PARAMS,
        past_days: 7,
        forecast_days: 16,
        timezone: 'auto'
    });

    const url = `${OPEN_METEO_BASE}?${params.toString()}`;
    const { data, error } = await fetchWithErrorHandling(url);

    if (error) return { data: null, error };

    const transformed = transformRaceWeatherData(data);
    if (!transformed) {
        return { data: null, error: new Error('Unexpected weather data format') };
    }
    return { data: transformed, error: null };
}

/**
 * Transform Open-Meteo response into race-weather format
 */
function transformRaceWeatherData(apiData) {
    const { hourly, daily } = apiData;
    if (!hourly || !hourly.time) return null;

    // Build hourly array
    const hourlyData = hourly.time.map((time, i) => ({
        time: new Date(time),
        temperature: hourly.temperature_2m[i],
        humidity: hourly.relative_humidity_2m[i],
        precipitation: hourly.precipitation[i],
        precipProbability: hourly.precipitation_probability[i],
        weatherCode: hourly.weather_code[i],
        windSpeed: hourly.wind_speed_10m[i],
        windDirection: hourly.wind_direction_10m[i],
        windGusts: hourly.wind_gusts_10m[i],
        soilMoisture0to7: hourly.soil_moisture_0_to_7cm?.[i] ?? null,
        soilMoisture7to28: hourly.soil_moisture_7_to_28cm?.[i] ?? null,
        apparentTemperature: hourly.apparent_temperature?.[i] ?? null,
        uvIndex: hourly.uv_index?.[i] ?? null
    }));

    // Build daily array
    const dailyData = daily && daily.time ? daily.time.map((time, i) => ({
        date: time,
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        precipSum: daily.precipitation_sum[i],
        precipProbMax: daily.precipitation_probability_max[i],
        windMax: daily.wind_speed_10m_max[i],
        gustMax: daily.wind_gusts_10m_max[i],
        weatherCode: daily.weather_code[i]
    })) : [];

    return {
        hourly: hourlyData,
        daily: dailyData,
        fetchedAt: new Date()
    };
}
