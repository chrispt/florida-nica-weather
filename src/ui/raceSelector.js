/**
 * Race Selector — compact dropdown in the header for quick race switching
 */

import { RACES } from '../config/raceSchedule.js';
import { getRaceStatus, daysUntilRace } from '../utils/dateUtils.js';
import store from '../state/store.js';

export function renderRaceSelector(container, onSelect) {
    const activeId = store.get('activeRaceId');
    const riskData = store.get('riskData') || {};

    const upcoming = RACES.filter(r => getRaceStatus(r) !== 'past');
    const past = RACES.filter(r => getRaceStatus(r) === 'past');

    const optionHtml = (race) => {
        const risk = riskData[race.id];
        const badge = risk ? `[${risk.level}]` : '';
        const selected = race.id === activeId ? 'selected' : '';
        return `<option value="${race.id}" ${selected}>#${race.id} ${race.name} ${badge}</option>`;
    };

    container.innerHTML = `
        <div class="race-selector">
            <select class="race-selector__select" id="race-select" aria-label="Select race">
                ${upcoming.length > 0 ? `<optgroup label="Upcoming">${upcoming.map(optionHtml).join('')}</optgroup>` : ''}
                ${past.length > 0 ? `<optgroup label="Completed">${past.map(optionHtml).join('')}</optgroup>` : ''}
            </select>
        </div>`;

    const select = container.querySelector('#race-select');
    select.addEventListener('change', () => {
        const raceId = parseInt(select.value, 10);
        if (onSelect) onSelect(raceId);
    });
}
