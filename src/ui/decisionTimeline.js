/**
 * Decision Timeline Widget — milestones for league director go/no-go decisions
 */

import { daysUntilRace } from '../utils/dateUtils.js';
import { formatTemperature } from '../utils/formatting.js';
import { getWeatherIcon } from '../config/weatherCodes.js';
import { renderInfoButton, setupInfoButtons } from './infoButton.js';

const MILESTONES = [
    { hoursBeforeRace: 72, label: '72hr Assessment', action: 'Initial weather review. Brief coaching staff on outlook.' },
    { hoursBeforeRace: 48, label: '48hr Preliminary', action: 'Communicate preliminary status to teams. Begin contingency planning if needed.' },
    { hoursBeforeRace: 24, label: '24hr Go/No-Go', action: 'Firm go/no-go decision. Notify all teams and volunteers.' },
    { hoursBeforeRace: 5.5, label: 'Morning-of (5:30 AM)', action: 'Final conditions check. Confirm course is safe. Brief event staff.' },
    { hoursBeforeRace: 0, label: 'Race Start', action: 'Active monitoring. Lightning detection on. Course marshals deployed.' }
];

/**
 * Determine the current decision window based on days until race
 */
export function getCurrentDecisionWindow(race) {
    const days = daysUntilRace(race);
    const hoursUntil = days * 24;

    if (hoursUntil <= 0) return 4;        // Race Start
    if (hoursUntil <= 5.5) return 3;      // Morning-of
    if (hoursUntil <= 24) return 2;       // 24hr Go/No-Go
    if (hoursUntil <= 48) return 1;       // 48hr Preliminary
    if (hoursUntil <= 72) return 0;       // 72hr Assessment
    return -1;                             // Before any milestone
}

/**
 * Get the closest weather snapshot for a milestone time
 */
function getMilestoneSnapshot(weatherData, race, hoursBeforeRace) {
    if (!weatherData || !weatherData.hourly) return null;

    // Calculate the target time
    const raceStart = new Date(`${race.dates.start}T${String(race.raceHours.start).padStart(2, '0')}:00:00`);
    const targetTime = new Date(raceStart.getTime() - hoursBeforeRace * 60 * 60 * 1000);

    // Find closest hourly data point
    let closest = null;
    let closestDiff = Infinity;

    for (const h of weatherData.hourly) {
        const diff = Math.abs(h.time.getTime() - targetTime.getTime());
        if (diff < closestDiff) {
            closest = h;
            closestDiff = diff;
        }
    }

    // Only return if within 2 hours of target
    if (closest && closestDiff <= 2 * 60 * 60 * 1000) {
        return closest;
    }
    return null;
}

/**
 * Render the decision timeline
 * @param {HTMLElement} container
 * @param {object} race
 * @param {object} riskData
 * @param {object} weatherData
 */
export function renderDecisionTimeline(container, race, riskData, weatherData) {
    if (!container) return;

    const currentWindow = getCurrentDecisionWindow(race);
    const days = daysUntilRace(race);

    // Don't show if race is past
    if (days < -1) {
        container.innerHTML = '';
        return;
    }

    const milestones = MILESTONES.map((m, i) => {
        const snapshot = getMilestoneSnapshot(weatherData, race, m.hoursBeforeRace);
        const state = i < currentWindow ? 'past' : i === currentWindow ? 'active' : 'future';

        let snapshotHtml = '';
        if (snapshot) {
            const icon = getWeatherIcon(snapshot.weatherCode);
            snapshotHtml = `
                <div class="dt-milestone__snapshot">
                    <span class="dt-milestone__snapshot-icon">${icon.icon}</span>
                    <span>${formatTemperature(snapshot.temperature)}</span>
                    <span>${Math.round(snapshot.precipProbability || 0)}% precip</span>
                </div>`;
        } else {
            snapshotHtml = `<div class="dt-milestone__snapshot dt-milestone__snapshot--pending">Forecast pending</div>`;
        }

        return `
            <div class="dt-milestone dt-milestone--${state}">
                <div class="dt-milestone__dot"></div>
                <div class="dt-milestone__content">
                    <div class="dt-milestone__label">${m.label}</div>
                    ${snapshotHtml}
                    <div class="dt-milestone__action">${m.action}</div>
                </div>
            </div>`;
    }).join('');

    const riskLevel = riskData ? riskData.level : 'GREEN';
    const riskSummary = riskData ? riskData.summary : 'Loading...';

    container.innerHTML = `
        <div class="decision-timeline">
            <div class="decision-timeline__header">
                <div class="decision-timeline__title">Decision Timeline ${renderInfoButton('decisionTimeline')}</div>
                <div class="decision-timeline__status">
                    <span class="dt-status-badge dt-status-badge--${riskLevel}">${riskLevel}</span>
                    <span class="decision-timeline__summary">${riskSummary}</span>
                </div>
            </div>
            <div class="decision-timeline__line">
                ${milestones}
            </div>
        </div>`;

    setupInfoButtons(container);
}
