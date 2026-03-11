/**
 * Hero section — next race name, venue, countdown timer
 */

import { getCountdown, formatCountdown, formatRaceDates, getRaceStatus, isRaceDayForRace } from '../utils/dateUtils.js';

let countdownInterval = null;

export function renderHero(container, race) {
    if (!race) {
        container.innerHTML = `
            <div class="hero">
                <div class="hero__label">Season Complete</div>
                <div class="hero__race-name">See you next season!</div>
            </div>`;
        return;
    }

    const status = getRaceStatus(race);
    const isActive = isRaceDayForRace(race);
    const pastClass = status === 'past' ? ' hero--past' : '';

    container.innerHTML = `
        <div class="hero${pastClass}">
            <div class="hero__label">${isActive ? 'Race Day' : 'Next Race'} — Race #${race.id}</div>
            <div class="hero__race-name">${race.name}</div>
            <div class="hero__venue">${race.venue} — ${race.city}, ${race.state}</div>
            <div class="hero__dates">${formatRaceDates(race)}</div>
            <div class="hero__countdown" id="countdown-value">--</div>
            <div class="hero__countdown-label" id="countdown-label"></div>
        </div>`;

    startCountdown(race);
}

function startCountdown(race) {
    if (countdownInterval) clearInterval(countdownInterval);

    function tick() {
        const countdown = getCountdown(race);
        const el = document.getElementById('countdown-value');
        const label = document.getElementById('countdown-label');
        if (!el) return;

        if (countdown.total <= 0) {
            el.textContent = 'Race Day!';
            label.textContent = 'Racing is underway';
            clearInterval(countdownInterval);
            return;
        }

        el.textContent = formatCountdown(countdown);
        label.textContent = countdown.days > 0
            ? `${countdown.days} day${countdown.days !== 1 ? 's' : ''} to go`
            : 'Starting soon';
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
}

export function destroyHero() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}
