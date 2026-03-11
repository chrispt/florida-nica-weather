/**
 * NWS Alerts API client
 * Fetches active weather alerts for a given location from the National Weather Service
 */

import { NWS_ALERTS_BASE, NWS_USER_AGENT } from '../config/constants.js';

/**
 * Fetch active NWS alerts for a lat/lon point
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{alerts: Array, fetchedAt: Date}>}
 */
export async function fetchNWSAlerts(lat, lon) {
    const url = `${NWS_ALERTS_BASE}?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual&message_type=alert`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/geo+json',
                'User-Agent': NWS_USER_AGENT
            }
        });

        if (!response.ok) {
            console.warn(`NWS Alerts API error: ${response.status}`);
            return { alerts: [], fetchedAt: new Date() };
        }

        const data = await response.json();
        const alerts = (data.features || []).map(transformAlert);

        return { alerts, fetchedAt: new Date() };
    } catch (error) {
        console.warn('NWS Alerts fetch failed:', error.message);
        return { alerts: [], fetchedAt: new Date() };
    }
}

/**
 * Transform a GeoJSON alert feature into a simplified object
 */
function transformAlert(feature) {
    const p = feature.properties;
    return {
        id: p.id,
        event: p.event,
        severity: p.severity,       // Extreme, Severe, Moderate, Minor, Unknown
        certainty: p.certainty,     // Observed, Likely, Possible, Unlikely
        urgency: p.urgency,         // Immediate, Expected, Future, Unknown
        headline: p.headline,
        description: p.description,
        instruction: p.instruction,
        onset: p.onset ? new Date(p.onset) : null,
        expires: p.expires ? new Date(p.expires) : null,
        senderName: p.senderName
    };
}

/**
 * Check if any alerts overlap with a race window
 * @param {Array} alerts
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @param {{start: number, end: number}} raceHours
 * @returns {Array} alerts that overlap with the race window
 */
export function filterAlertsForRaceWindow(alerts, startDateStr, endDateStr, raceHours) {
    const raceStart = new Date(`${startDateStr}T${String(raceHours.start).padStart(2, '0')}:00:00`);
    const raceEnd = new Date(`${endDateStr}T${String(raceHours.end).padStart(2, '0')}:00:00`);

    return alerts.filter(alert => {
        const alertStart = alert.onset || new Date(0);
        const alertEnd = alert.expires || new Date('2099-12-31');
        // Check overlap: alert overlaps race if alert starts before race ends AND alert ends after race starts
        return alertStart <= raceEnd && alertEnd >= raceStart;
    });
}
