/**
 * Date utilities — countdown, next-race finder, race-day detection
 */

import { RACES } from '../config/raceSchedule.js';

/**
 * Find the next upcoming race (or currently active race)
 */
export function findNextRace(now = new Date()) {
    const today = now.toISOString().slice(0, 10);

    // First check if we're on a race day
    const activeRace = RACES.find(r => today >= r.dates.start && today <= r.dates.end);
    if (activeRace) return activeRace;

    // Find next future race
    const upcoming = RACES.filter(r => r.dates.start > today);
    return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Check if today is a race day for any race
 */
export function isRaceDay(now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    return RACES.some(r => today >= r.dates.start && today <= r.dates.end);
}

/**
 * Check if a specific race is happening today
 */
export function isRaceDayForRace(race, now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    return today >= race.dates.start && today <= race.dates.end;
}

/**
 * Get race status: 'past', 'active', 'upcoming'
 */
export function getRaceStatus(race, now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    if (today > race.dates.end) return 'past';
    if (today >= race.dates.start && today <= race.dates.end) return 'active';
    return 'upcoming';
}

/**
 * Calculate countdown to a race start date
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, total: number }}
 */
export function getCountdown(race, now = new Date()) {
    const raceStart = new Date(race.dates.start + 'T08:00:00');
    const diff = raceStart - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, total: diff };
}

/**
 * Format countdown for display
 */
export function formatCountdown(countdown) {
    if (countdown.total <= 0) return 'Race Day!';

    const parts = [];
    if (countdown.days > 0) parts.push(`${countdown.days}d`);
    if (countdown.hours > 0 || countdown.days > 0) parts.push(`${countdown.hours}h`);
    parts.push(`${countdown.minutes}m`);
    if (countdown.days === 0) parts.push(`${countdown.seconds}s`);

    return parts.join(' ');
}

/**
 * Format race date range for display
 */
export function formatRaceDates(race) {
    const start = new Date(race.dates.start + 'T12:00:00');
    const end = new Date(race.dates.end + 'T12:00:00');

    const opts = { month: 'short', day: 'numeric' };

    if (race.dates.start === race.dates.end) {
        return start.toLocaleDateString('en-US', { ...opts, weekday: 'short' });
    }

    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

/**
 * Get all remaining (upcoming + active) races
 */
export function getRemainingRaces(now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    return RACES.filter(r => r.dates.end >= today);
}

/**
 * Days until race start
 */
export function daysUntilRace(race, now = new Date()) {
    const raceStart = new Date(race.dates.start + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = raceStart - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Forecast confidence based on days until race
 */
export function getForecastConfidence(race, now = new Date()) {
    const days = daysUntilRace(race, now);
    if (days <= 0) return { label: 'Live conditions', level: 'high', days: 0 };
    if (days <= 3) return { label: 'High confidence', level: 'high', days };
    if (days <= 7) return { label: 'Moderate confidence', level: 'medium', days };
    if (days <= 14) return { label: 'Low confidence', level: 'low', days };
    return { label: 'Extended outlook', level: 'outlook', days };
}
