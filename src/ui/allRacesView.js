/**
 * All races card grid with mini risk badges
 */

import { RACES } from '../config/raceSchedule.js';
import { getRaceStatus, formatRaceDates, daysUntilRace } from '../utils/dateUtils.js';
import store from '../state/store.js';

export function renderAllRaces(container, onRaceClick) {
    const riskData = store.get('riskData') || {};

    const cards = RACES.map(race => {
        const status = getRaceStatus(race);
        const risk = riskData[race.id];
        const activeId = store.get('activeRaceId');

        const statusClass = status === 'past' ? ' race-card--past'
            : race.id === activeId ? ' race-card--active' : '';

        const badge = risk
            ? `<span class="race-card__badge race-card__badge--${risk.level}">${risk.level} ${risk.overall}</span>`
            : `<span class="race-card__badge race-card__badge--none">--</span>`;

        const days = daysUntilRace(race);
        let statusText = '';
        if (status === 'past') statusText = 'Completed';
        else if (status === 'active') statusText = 'Race Day!';
        else if (days <= 14) statusText = `${days} day${days !== 1 ? 's' : ''} away`;
        else statusText = `${days} days away`;

        return `
            <div class="race-card${statusClass}" data-race-id="${race.id}">
                <div class="race-card__header">
                    <span class="race-card__number">${race.id}</span>
                    ${badge}
                </div>
                <div class="race-card__name">${race.name}</div>
                <div class="race-card__venue">${race.venue} — ${race.city}</div>
                <div class="race-card__dates">${formatRaceDates(race)}</div>
                <div class="race-card__status">${statusText}</div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="all-races">
            <div class="all-races__title">Season 7 — All Races</div>
            <div class="race-cards">${cards}</div>
        </div>`;

    // Click handlers
    container.querySelectorAll('.race-card:not(.race-card--past)').forEach(card => {
        card.addEventListener('click', () => {
            const raceId = parseInt(card.dataset.raceId, 10);
            if (onRaceClick) onRaceClick(raceId);
        });
    });
}
