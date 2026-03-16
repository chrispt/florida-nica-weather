/**
 * Application constants and configuration
 */

export const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_AQ_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// NWS Alerts API
export const NWS_ALERTS_BASE = 'https://api.weather.gov/alerts/active';
export const NWS_USER_AGENT = '(FloridaNICAWeather, contact@floridamtb.org)';
export const NWS_AUTO_RED_EVENTS = ['Tornado Warning', 'Severe Thunderstorm Warning', 'Flash Flood Warning'];
export const NWS_AUTO_ORANGE_EVENTS = ['Severe Thunderstorm Watch', 'Flash Flood Watch', 'Tornado Watch'];

// Hourly parameters including soil moisture for trail condition assessment
export const HOURLY_PARAMS = [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'precipitation_probability',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'soil_moisture_0_to_7cm',
    'soil_moisture_7_to_28cm',
    'apparent_temperature',
    'uv_index',
    'cape',
    'lifted_index'
].join(',');

// Daily summary parameters
export const DAILY_PARAMS = [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'weather_code'
].join(',');

// Refresh intervals (milliseconds)
export const REFRESH_INTERVAL_NORMAL = 15 * 60 * 1000;  // 15 minutes
export const REFRESH_INTERVAL_RACEDAY = 5 * 60 * 1000;  // 5 minutes

// Risk thresholds — 4-level system per NICA guidelines
export const RISK_THRESHOLDS = {
    GREEN_MAX: 25,
    YELLOW_MAX: 50,
    ORANGE_MAX: 75
    // Above 75 = RED
};

// CAPE thresholds (J/kg) for thunderstorm potential
export const CAPE_THRESHOLDS = {
    MODERATE: 1000,
    HIGH: 2000,
    EXTREME: 3500
};

// WBGT thresholds (°F) — legacy, kept for backward compatibility
export const WBGT_THRESHOLDS = {
    GREEN_MAX_F: 82,
    YELLOW_MAX_F: 87,
    ORANGE_MAX_F: 90
};

// Heat Index thresholds (°F) per official NICA weather guidelines
export const HEAT_INDEX_THRESHOLDS = {
    GREEN_MAX_F: 95,
    YELLOW_MAX_F: 100,
    ORANGE_MAX_F: 105
};

// Heavy rain rate thresholds (mm/hr)
export const HEAVY_RAIN_RATE_THRESHOLDS = {
    YELLOW_MAX_MM_HR: 5.08,   // 0.20 in/hr
    ORANGE_MAX_MM_HR: 10.16   // 0.40 in/hr
};

// Air Quality Index thresholds (US AQI)
export const AQI_THRESHOLDS = {
    GREEN_MAX: 50,
    YELLOW_MAX: 100,
    ORANGE_MAX: 150
};

// NICA recommended actions per category and risk level
export const NICA_ACTIONS = {
    heat: {
        GREEN: 'Standard hydration practices',
        YELLOW: 'Max activity: 2 hours. Increase hydration stations.',
        ORANGE: 'Max activity: 1 hour. Mandatory cool-down breaks.',
        RED: 'Cancel outdoor activity'
    },
    lightning: {
        GREEN: 'No restrictions',
        YELLOW: 'Monitor radar closely',
        ORANGE: 'Prepare for activity stoppage',
        RED: 'Stop activity. 30-min wait after last strike.'
    },
    wind: {
        GREEN: 'No restrictions',
        YELLOW: 'Monitor conditions',
        ORANGE: 'Course modifications may be needed',
        RED: 'Cancel or delay'
    },
    heavyRain: {
        GREEN: 'No restrictions',
        YELLOW: 'Monitor trail conditions',
        ORANGE: 'Evacuate trails. Seek shelter.',
        RED: 'Cancel activity'
    },
    aqi: {
        GREEN: 'No restrictions',
        YELLOW: 'Sensitive individuals may limit exertion',
        ORANGE: 'Competitive events canceled. Non-competitive reduced.',
        RED: 'All outdoor activity canceled'
    },
    trailDamage: {
        GREEN: 'Trails in good condition',
        YELLOW: 'Monitor trail conditions',
        ORANGE: 'Course modifications likely needed',
        RED: 'Trails unsafe — cancel or relocate'
    }
};

// Nowcast proximity threshold — only fetch for races within this many days
export const NOWCAST_PROXIMITY_DAYS = 2;

// Weather code classifications
export const THUNDERSTORM_CODES = [95, 96, 99];
export const RAIN_CODES = [51, 53, 55, 61, 63, 65, 80, 81, 82];
export const HEAVY_RAIN_CODES = [65, 82];

// Trail condition thresholds
export const TRAIL_THRESHOLDS = {
    SOIL_MOISTURE_HIGH: 0.35,      // m³/m³ — saturated for Florida sandy soils
    SOIL_MOISTURE_CRITICAL: 0.45,
    RAIN_7DAY_HIGH_MM: 75,         // 7-day cumulative rain concern threshold
    RAIN_7DAY_CRITICAL_MM: 125,
    RAIN_INTENSITY_HIGH_MM: 10,    // Hourly rain intensity concern
};

// Wind thresholds (km/h, Open-Meteo default)
export const WIND_THRESHOLDS = {
    ADVISORY_KMH: 40,     // ~25 mph
    WARNING_KMH: 56,      // ~35 mph
    GUST_ADVISORY_KMH: 56,
    GUST_WARNING_KMH: 72  // ~45 mph
};

// WMO weather code descriptions
export const WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm w/ slight hail',
    99: 'Thunderstorm w/ heavy hail'
};

export const WEATHER_ICONS = {
    0: { icon: '\u2600\uFE0F', class: 'sunny' },
    1: { icon: '\uD83C\uDF24\uFE0F', class: 'sunny' },
    2: { icon: '\u26C5', class: 'cloudy' },
    3: { icon: '\u2601\uFE0F', class: 'cloudy' },
    45: { icon: '\uD83C\uDF2B\uFE0F', class: 'cloudy' },
    48: { icon: '\uD83C\uDF2B\uFE0F', class: 'cloudy' },
    51: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    53: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    55: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    61: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    63: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    65: { icon: '\uD83C\uDF27\uFE0F', class: 'rainy' },
    80: { icon: '\uD83C\uDF26\uFE0F', class: 'rainy' },
    81: { icon: '\uD83C\uDF26\uFE0F', class: 'rainy' },
    82: { icon: '\uD83C\uDF26\uFE0F', class: 'rainy' },
    95: { icon: '\u26C8\uFE0F', class: 'stormy' },
    96: { icon: '\u26C8\uFE0F', class: 'stormy' },
    99: { icon: '\u26C8\uFE0F', class: 'stormy' }
};

// Wind direction labels
export const WIND_DIRECTIONS = [
    { min: 11.25, max: 33.75, label: 'NNE' },
    { min: 33.75, max: 56.25, label: 'NE' },
    { min: 56.25, max: 78.75, label: 'ENE' },
    { min: 78.75, max: 101.25, label: 'E' },
    { min: 101.25, max: 123.75, label: 'ESE' },
    { min: 123.75, max: 146.25, label: 'SE' },
    { min: 146.25, max: 168.75, label: 'SSE' },
    { min: 168.75, max: 191.25, label: 'S' },
    { min: 191.25, max: 213.75, label: 'SSW' },
    { min: 213.75, max: 236.25, label: 'SW' },
    { min: 236.25, max: 258.75, label: 'WSW' },
    { min: 258.75, max: 281.25, label: 'W' },
    { min: 281.25, max: 303.75, label: 'WNW' },
    { min: 303.75, max: 326.25, label: 'NW' },
    { min: 326.25, max: 348.75, label: 'NNW' }
];

// UV Index thresholds
export const UV_THRESHOLDS = [
    { max: 2, label: 'Low', color: 'var(--uv-low, #4ade80)' },
    { max: 5, label: 'Moderate', color: 'var(--uv-moderate, #facc15)' },
    { max: 7, label: 'High', color: 'var(--uv-high, #fb923c)' },
    { max: 10, label: 'Very High', color: 'var(--uv-very-high, #ef4444)' },
    { max: Infinity, label: 'Extreme', color: 'var(--uv-extreme, #a855f7)' }
];

// localStorage keys
export const STORAGE_KEYS = {
    TEMP_UNIT: 'nicaWeather_tempUnit',
    SPEED_UNIT: 'nicaWeather_speedUnit',
    NOTIFICATION_PREFS: 'nicaWeather_notifPrefs',
    PREVIOUS_RISK_LEVELS: 'nicaWeather_prevRiskLevels'
};
