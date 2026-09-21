/**
 * Season timeline — every event on a real time axis, one lane per conference.
 * Position encodes time, so the December gap, the race run and the State
 * Championship are visible at once. The shaded band is the forecast window.
 */

import { RACES, CONFERENCE_LABELS } from '../config/raceSchedule.js';
import { FORECAST_HORIZON_DAYS } from '../config/constants.js';
import { getRaceStatus, formatRaceDates } from '../utils/dateUtils.js';
import store from '../state/store.js';

const DAY_MS = 86400000;
const LANE_ORDER = ['all', 'north', 'south'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' to a whole day number, matching how dateUtils compares dates
const dayNumber = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / DAY_MS;
};

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderSeasonTimeline(container, onRaceClick, now = new Date()) {
    if (RACES.length === 0) { container.innerHTML = ''; return; }

    const todayIso = now.toISOString().slice(0, 10);
    const today = dayNumber(todayIso);
    const first = Math.min(...RACES.map(r => dayNumber(r.dates.start)));
    const last = Math.max(...RACES.map(r => dayNumber(r.dates.end)));

    // While the season is ahead, start at today so the forecast window sits on the
    // left edge. Otherwise frame the season itself. Either way leave two weeks of
    // room before the first event so its label is not clipped.
    const rangeStart = Math.min(today < first ? today : Infinity, first - 14);
    const rangeEnd = last + 14;
    const span = rangeEnd - rangeStart;
    const pct = (day) => ((day - rangeStart) / span) * 100;

    const activeId = store.get('activeRaceId');

    // Month gridlines
    const cursor = new Date(rangeStart * DAY_MS);
    let gridHtml = '';
    let y = cursor.getUTCFullYear();
    let m = cursor.getUTCMonth() + 1;
    for (;;) {
        if (m > 11) { m = 0; y += 1; }
        const day = Date.UTC(y, m, 1) / DAY_MS;
        if (day >= rangeEnd) break;
        const label = m === 0 ? `${MONTHS[m]} ${y}` : MONTHS[m];
        gridHtml += `<div class="timeline__month" style="left:${pct(day).toFixed(2)}%"><span>${label}</span></div>`;
        m += 1;
    }

    // Forecast window band and today marker
    let windowHtml = '';
    if (today >= rangeStart && today <= rangeEnd) {
        const width = Math.min(FORECAST_HORIZON_DAYS, rangeEnd - today) / span * 100;
        windowHtml = `
            <div class="timeline__window" style="left:${pct(today).toFixed(2)}%;width:${width.toFixed(2)}%"></div>
            <div class="timeline__today" style="left:${pct(today).toFixed(2)}%">
                <span>Today &middot; shaded = ${FORECAST_HORIZON_DAYS}-day forecast window</span>
            </div>`;
    }

    // Lanes
    const lanesHtml = LANE_ORDER.map(conf => {
        const events = RACES.filter(r => r.conference === conf)
            .sort((a, b) => a.dates.start.localeCompare(b.dates.start));
        if (events.length === 0) return '';

        const races = events.filter(e => e.eventType === 'race').length;
        const adventures = events.length - races;
        const subtitle = [
            races ? `${races} race${races !== 1 ? 's' : ''}` : '',
            adventures ? `${adventures} adventure day${adventures !== 1 ? 's' : ''}` : ''
        ].filter(Boolean).join(' + ');

        const markers = events.map((race, i) => {
            const mid = (dayNumber(race.dates.start) + dayNumber(race.dates.end) + 1) / 2;
            const status = getRaceStatus(race, now);
            const kind = race.championship ? 'championship' : race.eventType === 'race' ? 'race' : 'adventure';
            const classes = [
                'timeline__marker',
                `timeline__marker--${kind}`,
                status === 'past' ? 'is-past' : '',
                race.id === activeId ? 'is-active' : ''
            ].filter(Boolean).join(' ');
            // Alternate label sides so neighbours in one lane never collide
            const side = i % 2 === 0 ? 'up' : 'down';
            const title = escapeHtml(race.name);
            return `
                <button type="button" class="${classes}" style="left:${pct(mid).toFixed(2)}%" data-race-id="${race.id}"
                        aria-label="View ${title} weather details">
                    <span class="timeline__label timeline__label--${side}">
                        <span class="timeline__label-name">${title}</span>
                        <span class="timeline__label-dates">${formatRaceDates(race)}</span>
                        <span class="timeline__label-city">${escapeHtml(race.city)}</span>
                    </span>
                </button>`;
        }).join('');

        return `
            <div class="timeline__lane timeline__lane--${conf}">
                <div class="timeline__lane-head">
                    <span class="timeline__lane-dot"></span>
                    <span>
                        <span class="timeline__lane-name">${CONFERENCE_LABELS[conf]}</span>
                        <span class="timeline__lane-sub">${subtitle}</span>
                    </span>
                </div>
                <div class="timeline__track"><div class="timeline__line"></div>${markers}</div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="timeline" role="group" aria-label="Season timeline by conference">
            <div class="timeline__plot">
                <div class="timeline__overlay" aria-hidden="true">${gridHtml}${windowHtml}</div>
                ${lanesHtml}
            </div>
            <div class="timeline__legend">
                <span><i class="timeline__key timeline__key--race"></i>Race weekend</span>
                <span><i class="timeline__key timeline__key--adventure"></i>Adventure day (not a race)</span>
                <span><i class="timeline__key timeline__key--championship"></i>State Championship</span>
            </div>
        </div>`;

    container.querySelectorAll('.timeline__marker').forEach(btn => {
        btn.addEventListener('click', () => {
            const raceId = parseInt(btn.dataset.raceId, 10);
            if (onRaceClick) onRaceClick(raceId);
        });
    });
}
