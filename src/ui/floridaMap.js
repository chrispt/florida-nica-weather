/**
 * Venue map — every event pinned at its real coordinates on a schematic
 * Florida outline, beside a chronological list. Answers "where is everyone
 * going?" so conditions can be compared across the state.
 */

import { RACES, CONFERENCE_LABELS } from '../config/raceSchedule.js';
import { FLORIDA_OUTLINE } from '../config/floridaOutline.js';
import { getRaceStatus, formatRaceDates } from '../utils/dateUtils.js';
import store from '../state/store.js';

const K = 100;                              // pixels per degree of latitude
const LON_SQUASH = Math.cos(28 * Math.PI / 180); // equirectangular, centered on Florida
const PAD = 16;
const LABEL_ROOM = 120;                     // right margin so east-coast city labels fit

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function makeProjection() {
    const lons = FLORIDA_OUTLINE.map(p => p[0]).concat(RACES.map(r => r.lon));
    const lats = FLORIDA_OUTLINE.map(p => p[1]).concat(RACES.map(r => r.lat));
    const minLon = Math.min(...lons), maxLat = Math.max(...lats);
    const width = (Math.max(...lons) - minLon) * LON_SQUASH * K + PAD * 2 + LABEL_ROOM;
    const height = (maxLat - Math.min(...lats)) * K + PAD * 2;
    const project = (lon, lat) => [
        PAD + (lon - minLon) * LON_SQUASH * K,
        PAD + (maxLat - lat) * K
    ];
    return { project, width, height };
}

const kindOf = (race) => race.championship ? 'championship' : race.eventType === 'race' ? 'race' : 'adventure';
const markOf = (race) => race.eventType === 'race' ? String(race.raceNumber) : 'AD';

export function renderFloridaMap(container, onRaceClick, now = new Date()) {
    if (RACES.length === 0) { container.innerHTML = ''; return; }

    const { project, width, height } = makeProjection();
    const activeId = store.get('activeRaceId');

    const outline = FLORIDA_OUTLINE
        .map(([lon, lat], i) => {
            const [x, y] = project(lon, lat);
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ') + ' Z';

    const stateClasses = (race) => [
        `fmap--${kindOf(race)}`,
        `fmap--${race.conference}`,
        getRaceStatus(race, now) === 'past' ? 'is-past' : '',
        race.id === activeId ? 'is-active' : ''
    ].filter(Boolean).join(' ');

    const pins = RACES.map(race => {
        const [x, y] = project(race.lon, race.lat);
        const name = escapeHtml(race.name);
        return `
            <button type="button" class="fmap__pin ${stateClasses(race)}" data-race-id="${race.id}"
                    style="left:${(x / width * 100).toFixed(2)}%;top:${(y / height * 100).toFixed(2)}%"
                    aria-label="View ${name} weather details">
                <span class="fmap__mark">${markOf(race)}</span>
                <span class="fmap__city">${escapeHtml(race.city)}</span>
            </button>`;
    }).join('');

    // Season order, not id order, so the list reads as a calendar
    const ordered = [...RACES].sort((a, b) => a.dates.start.localeCompare(b.dates.start));
    const rows = ordered.map(race => `
        <li>
            <button type="button" class="fmap__row ${stateClasses(race)}" data-race-id="${race.id}">
                <span class="fmap__row-date">${formatRaceDates(race)}</span>
                <span class="fmap__dot"><span class="fmap__mark">${markOf(race)}</span></span>
                <span class="fmap__row-text">
                    <span class="fmap__row-name">${escapeHtml(race.name)}</span>
                    <span class="fmap__row-venue">${escapeHtml(race.venue)}, ${escapeHtml(race.city)}</span>
                </span>
                <span class="fmap__radar" title="NWS radar station serving this venue">${escapeHtml(race.radarStation || '')}</span>
            </button>
        </li>`).join('');

    container.innerHTML = `
        <div class="fmap" role="group" aria-label="Venue map">
            <div class="fmap__stage" style="aspect-ratio:${width.toFixed(0)} / ${height.toFixed(0)}">
                <svg class="fmap__svg" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" aria-hidden="true" focusable="false">
                    <path class="fmap__land" d="${outline}"/>
                </svg>
                ${pins}
            </div>
            <div class="fmap__side">
                <div class="fmap__side-title">Season order</div>
                <ol class="fmap__list">${rows}</ol>
                <div class="fmap__legend">
                    ${Object.entries(CONFERENCE_LABELS).map(([key, label]) =>
                        `<span><i class="fmap__key fmap__key--${key}"></i>${label}</span>`).join('')}
                    <span><i class="fmap__key fmap__key--ad"></i>Adventure day (not a race)</span>
                </div>
                <p class="fmap__note">Outline is schematic. Pins use each venue's real coordinates. Radar codes are the NWS station serving that exact point.</p>
            </div>
        </div>`;

    // Hovering or focusing a pin lights its list row, and the other way round
    const setHover = (id, on) => {
        container.querySelectorAll(`[data-race-id="${id}"]`).forEach(el => el.classList.toggle('is-hover', on));
    };
    container.querySelectorAll('[data-race-id]').forEach(el => {
        const id = el.dataset.raceId;
        el.addEventListener('mouseenter', () => setHover(id, true));
        el.addEventListener('mouseleave', () => setHover(id, false));
        el.addEventListener('focus', () => setHover(id, true));
        el.addEventListener('blur', () => setHover(id, false));
        el.addEventListener('click', () => { if (onRaceClick) onRaceClick(parseInt(id, 10)); });
    });
}
