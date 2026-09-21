/**
 * All races card grid with mini risk badges
 */

import { RACES, SEASON, CONFERENCE_LABELS } from '../config/raceSchedule.js';
import { getRaceStatus, formatRaceDates, daysUntilRace, formatForecastOpenDate, getForecastConfidence } from '../utils/dateUtils.js';
import { renderSeasonTimeline } from './seasonTimeline.js';
import { renderFloridaMap } from './floridaMap.js';
import { STORAGE_KEYS } from '../config/constants.js';
import store from '../state/store.js';

// Short conference labels — the cards are narrow, so the full
// "North Conference" wraps awkwardly at mobile widths.
const CONFERENCE_SHORT = { all: 'All', north: 'North', south: 'South' };

// Storage can be blocked (private mode) or throw; the view still works without it
function readView() {
    try { return localStorage.getItem(STORAGE_KEYS.EVENTS_VIEW) === 'map' ? 'map' : 'timeline'; }
    catch { return 'timeline'; }
}
function saveView(view) {
    try { localStorage.setItem(STORAGE_KEYS.EVENTS_VIEW, view); } catch { /* ignore */ }
}

function renderView(host, view, onRaceClick) {
    if (view === 'map') renderFloridaMap(host, onRaceClick);
    else renderSeasonTimeline(host, onRaceClick);
}

export function renderAllRaces(container, onRaceClick) {
    const riskData = store.get('riskData') || {};
    const view = readView();

    const cards = RACES.map(race => {
        const status = getRaceStatus(race);
        const risk = riskData[race.id];
        const activeId = store.get('activeRaceId');
        const isRace = race.eventType === 'race';

        const statusClass = status === 'past' ? ' race-card--past'
            : race.id === activeId ? ' race-card--active' : '';

        // Three states: no score yet (beyond the forecast window), a score that can
        // still move (low confidence), and a firm score. Never show a score we don't have.
        const hasScore = risk && risk.forecastAvailable !== false;
        const confidence = getForecastConfidence(race);
        const isTentative = hasScore && status === 'upcoming'
            && (confidence.level === 'low' || confidence.level === 'outlook');

        const badge = hasScore
            ? `<span class="race-card__badge race-card__badge--${risk.level}${isTentative ? ' race-card__badge--tentative' : ''}"${isTentative ? ' title="Forecast can still change"' : ''}>${risk.level} ${risk.overall}</span>`
            : `<span class="race-card__badge race-card__badge--none">${risk && status === 'upcoming' ? 'No forecast' : '--'}</span>`;

        // Races carry their season race number; adventure days sit outside
        // that count, so they get a marker instead.
        const marker = isRace
            ? `<span class="race-card__number">${race.raceNumber}</span>`
            : `<span class="race-card__number race-card__number--adventure" title="Adventure day">AD</span>`;

        const conference = `<span class="race-card__conf race-card__conf--${race.conference}" title="${CONFERENCE_LABELS[race.conference]}">${CONFERENCE_SHORT[race.conference]}</span>`;

        const days = daysUntilRace(race);
        let statusText = '';
        if (status === 'past') statusText = 'Completed';
        else if (status === 'active') statusText = isRace ? 'Race Day!' : 'Event Day!';
        else if (days <= 14) statusText = `${days} day${days !== 1 ? 's' : ''} away`;
        else statusText = `${days} days away`;
        // Tell people when a score will appear instead of leaving a blank badge
        if (risk && !hasScore && status === 'upcoming') {
            statusText += ` · forecast opens ${formatForecastOpenDate(race)}`;
        }

        return `
            <button class="race-card${statusClass}${isTentative ? ' race-card--tentative' : ''}" data-race-id="${race.id}" type="button" aria-label="View ${race.name} weather details">
                <div class="race-card__header">
                    ${marker}
                    ${badge}
                </div>
                <div class="race-card__name">${race.name}</div>
                <div class="race-card__venue">${race.venue} — ${race.city}</div>
                <div class="race-card__dates">${conference}${formatRaceDates(race)}</div>
                <div class="race-card__status">${statusText}</div>
            </button>`;
    }).join('');

    container.innerHTML = `
        <div class="all-races">
            <div class="all-races__head">
                <div class="all-races__title">Season ${SEASON} — All Events</div>
                <div class="view-toggle" role="group" aria-label="Event view">
                    <button type="button" class="view-toggle__btn" data-view="timeline" aria-pressed="${view === 'timeline'}">Timeline</button>
                    <button type="button" class="view-toggle__btn" data-view="map" aria-pressed="${view === 'map'}">Map</button>
                </div>
            </div>
            <div class="all-races__view"></div>
            <div class="race-cards">${cards}</div>
        </div>`;

    // The timeline and map are hidden on narrow screens by CSS; the cards below always work
    const viewHost = container.querySelector('.all-races__view');
    renderView(viewHost, view, onRaceClick);
    container.querySelectorAll('.view-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const next = btn.dataset.view;
            saveView(next);
            container.querySelectorAll('.view-toggle__btn').forEach(b =>
                b.setAttribute('aria-pressed', String(b.dataset.view === next)));
            renderView(viewHost, next, onRaceClick);
        });
    });

    // Click handlers — all races are clickable, including past ones
    container.querySelectorAll('.race-card').forEach(card => {
        card.addEventListener('click', () => {
            const raceId = parseInt(card.dataset.raceId, 10);
            if (onRaceClick) onRaceClick(raceId);
        });
    });
}
