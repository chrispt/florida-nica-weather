/**
 * Weather code helpers — WMO code descriptions and icons.
 */

import { WEATHER_CODES, WEATHER_ICONS } from './constants.js';

export function getWeatherDescription(code) {
    return WEATHER_CODES[code] || 'Unknown';
}

export function getWeatherIcon(code) {
    return WEATHER_ICONS[code] || { icon: '\uD83C\uDF21\uFE0F', class: 'cloudy' };
}
