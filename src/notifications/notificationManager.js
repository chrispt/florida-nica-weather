/**
 * Notification Manager — detects risk level transitions and sends browser notifications
 */

import { STORAGE_KEYS } from '../config/constants.js';

/**
 * Initialize notification preferences from localStorage
 * @returns {{enabled: boolean, transitions: string[]}}
 */
export function initNotifications() {
    return getNotificationPrefs();
}

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPrefs() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) { /* ignore */ }
    return { enabled: false, transitions: ['toRed', 'toOrange', 'toYellow', 'toGreen'] };
}

/**
 * Save notification preferences to localStorage
 */
export function setNotificationPrefs(prefs) {
    try {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(prefs));
    } catch (e) { /* ignore */ }
}

/**
 * Get previous risk levels from localStorage
 * @returns {Object} - { [raceId]: 'GREEN'|'YELLOW'|'RED' }
 */
export function getPreviousRiskLevels() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PREVIOUS_RISK_LEVELS);
        if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return {};
}

/**
 * Save previous risk levels to localStorage
 */
export function savePreviousRiskLevels(levels) {
    try {
        localStorage.setItem(STORAGE_KEYS.PREVIOUS_RISK_LEVELS, JSON.stringify(levels));
    } catch (e) { /* ignore */ }
}

/**
 * Check for risk level transitions
 * @param {Object} riskData - { [raceId]: {level, ...} }
 * @param {Object} previousLevels - { [raceId]: 'GREEN'|'YELLOW'|'RED' }
 * @returns {Array<{raceId, raceName, from, to}>}
 */
export function checkForRiskTransitions(riskData, previousLevels) {
    const transitions = [];

    for (const [raceId, risk] of Object.entries(riskData)) {
        const prev = previousLevels[raceId];
        if (prev && prev !== risk.level) {
            transitions.push({
                raceId,
                from: prev,
                to: risk.level
            });
        }
    }

    return transitions;
}

/**
 * Send browser notification for a risk transition
 * @param {object} transition - { raceId, raceName, from, to }
 * @param {string} raceName
 */
export async function sendRiskNotification(transition, raceName) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    const levelEmoji = { GREEN: '\u2705', YELLOW: '\u26A0\uFE0F', ORANGE: '\uD83D\uDFE0', RED: '\uD83D\uDED1' };
    const icon = levelEmoji[transition.to] || '';

    new Notification(`${icon} ${raceName} — Risk Changed`, {
        body: `Risk level changed from ${transition.from} to ${transition.to}`,
        tag: `risk-${transition.raceId}`,
        requireInteraction: false
    });
}

/**
 * Check if a transition matches the user's notification preferences
 */
export function shouldNotify(transition, prefs) {
    if (!prefs.enabled) return false;

    const transType = `to${transition.to.charAt(0) + transition.to.slice(1).toLowerCase()}`;
    return prefs.transitions.includes(transType);
}
