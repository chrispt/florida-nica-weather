/**
 * Formatting utilities
 * Adapted from Birding Weather Dashboard
 */

import { WIND_DIRECTIONS } from '../config/constants.js';
import store from '../state/store.js';

export function convertTemperature(celsius, unit = null) {
    const targetUnit = unit || store.get('tempUnit') || 'F';
    if (targetUnit === 'C') return Math.round(celsius);
    return Math.round((celsius * 9 / 5) + 32);
}

export function formatTemperature(celsius, unit = null) {
    const targetUnit = unit || store.get('tempUnit') || 'F';
    return `${convertTemperature(celsius, targetUnit)}°${targetUnit}`;
}

export function convertWindSpeed(kmh, unit = null) {
    const targetUnit = unit || store.get('speedUnit') || 'mph';
    if (targetUnit === 'kph') return Math.round(kmh);
    return Math.round(kmh * 0.621371);
}

export function formatWindSpeed(kmh, unit = null) {
    const targetUnit = unit || store.get('speedUnit') || 'mph';
    return `${convertWindSpeed(kmh, targetUnit)} ${targetUnit}`;
}

export function getWindDirectionLabel(degrees) {
    const normalized = ((degrees % 360) + 360) % 360;
    for (const dir of WIND_DIRECTIONS) {
        if (normalized >= dir.min && normalized < dir.max) return dir.label;
    }
    return 'N';
}

export function formatRelativeTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatPrecipitation(mm, unit = null) {
    const tempUnit = unit || store.get('tempUnit') || 'F';
    if (tempUnit === 'F') {
        const inches = mm / 25.4;
        if (mm === 0) return '0 in';
        return `${inches < 0.1 && inches > -0.1 ? inches.toFixed(2) : inches.toFixed(1)} in`;
    }
    if (mm === 0) return '0 mm';
    if (Math.abs(mm) < 1) return `${mm.toFixed(1)} mm`;
    return `${Math.round(mm)} mm`;
}

export function formatPercent(value) {
    return `${Math.round(value)}%`;
}

export function formatSoilMoisture(value) {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(0)}%`;
}
