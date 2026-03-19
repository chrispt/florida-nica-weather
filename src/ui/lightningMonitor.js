/**
 * Lightning Monitor widget — real-time strike counter with NICA 30-min countdown
 */

import { LIGHTNING_MONITOR } from '../config/constants.js';

let countdownInterval = null;

/**
 * Render the lightning monitor widget
 */
export function renderLightningMonitor(container, strikeData, race) {
    if (!container) return;

    // No data yet or monitor not started
    if (!strikeData) {
        container.innerHTML = '';
        return;
    }

    const { dangerCount, watchCount, closestStrike, lastStrikeTime, wsConnected } = strikeData;
    const hasActiveStrikes = dangerCount > 0;
    const hasAnyStrikes = dangerCount > 0 || watchCount > 0;

    // Determine widget state
    let stateClass = 'lightning-monitor--monitoring';
    let statusText = 'Monitoring';
    let statusDot = 'status-dot--green';

    if (!wsConnected) {
        stateClass = 'lightning-monitor--disconnected';
        statusText = 'Disconnected';
        statusDot = 'status-dot--gray';
    } else if (hasActiveStrikes) {
        stateClass = 'lightning-monitor--active';
        statusText = 'STRIKES DETECTED';
        statusDot = 'status-dot--red';
    } else if (hasAnyStrikes) {
        stateClass = 'lightning-monitor--watch';
        statusText = 'Nearby Activity';
        statusDot = 'status-dot--yellow';
    }

    // Build countdown HTML
    let countdownHtml = '';
    if (lastStrikeTime && hasActiveStrikes) {
        countdownHtml = buildCountdownHtml(lastStrikeTime);
    } else if (lastStrikeTime && !hasActiveStrikes) {
        // Strikes expired from danger zone — check if 30-min countdown completed
        const elapsed = (Date.now() - new Date(lastStrikeTime).getTime()) / 1000 / 60;
        if (elapsed < LIGHTNING_MONITOR.NICA_CLEAR_MINUTES) {
            countdownHtml = buildCountdownHtml(lastStrikeTime);
            stateClass = 'lightning-monitor--countdown';
            statusText = 'CLEARING';
            statusDot = 'status-dot--yellow';
        } else {
            stateClass = 'lightning-monitor--clear';
            statusText = 'ALL CLEAR';
            statusDot = 'status-dot--green';
            countdownHtml = `<div class="lightning-monitor__clear-msg">30-min wait complete. Activity may resume.</div>`;
        }
    }

    container.innerHTML = `
        <div class="lightning-monitor ${stateClass}">
            <div class="lightning-monitor__header">
                <div class="lightning-monitor__title">
                    <span class="status-dot ${statusDot}"></span>
                    <span>Lightning Monitor</span>
                    <span class="lightning-monitor__beta-badge">BETA</span>
                    ${hasActiveStrikes ? '<span class="lightning-monitor__live-badge">LIVE</span>' : ''}
                </div>
                <div class="lightning-monitor__status">${statusText}</div>
            </div>

            ${hasAnyStrikes || lastStrikeTime ? `
                <div class="lightning-monitor__body">
                    ${dangerCount > 0 ? `
                        <div class="lightning-monitor__danger-zone">
                            <div class="lightning-monitor__count lightning-monitor__count--danger">
                                <span class="lightning-monitor__count-num">${dangerCount}</span>
                                <span class="lightning-monitor__count-label">strike${dangerCount !== 1 ? 's' : ''} within ${LIGHTNING_MONITOR.DANGER_RADIUS_MILES} mi</span>
                            </div>
                            ${closestStrike ? `
                                <div class="lightning-monitor__closest">
                                    Closest: ${closestStrike.distanceMiles} mi ${closestStrike.direction}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${watchCount > 0 ? `
                        <div class="lightning-monitor__watch-zone">
                            <span class="lightning-monitor__count-num lightning-monitor__count-num--watch">${watchCount}</span>
                            <span class="lightning-monitor__count-label">strike${watchCount !== 1 ? 's' : ''} within ${LIGHTNING_MONITOR.WATCH_RADIUS_MILES} mi</span>
                        </div>
                    ` : ''}

                    ${lastStrikeTime ? `
                        <div class="lightning-monitor__last-strike">
                            Last strike: <span class="lightning-monitor__time-ago" data-time="${new Date(lastStrikeTime).getTime()}">${formatTimeAgo(lastStrikeTime)}</span>
                        </div>
                    ` : ''}

                    ${countdownHtml}
                </div>
            ` : `
                <div class="lightning-monitor__body">
                    <div class="lightning-monitor__no-strikes">No strikes detected</div>
                </div>
            `}
        </div>
    `;

    // Start countdown timer if needed
    stopCountdownTimer();
    if (lastStrikeTime && (hasActiveStrikes || !isCountdownComplete(lastStrikeTime))) {
        startCountdownTimer(container, lastStrikeTime);
    }
}

/**
 * Clean up timers
 */
export function destroyLightningMonitor() {
    stopCountdownTimer();
}

// --- Internal ---

function buildCountdownHtml(lastStrikeTime) {
    const elapsed = (Date.now() - new Date(lastStrikeTime).getTime()) / 1000;
    const totalSeconds = LIGHTNING_MONITOR.NICA_CLEAR_MINUTES * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);
    const progress = Math.min(100, (elapsed / totalSeconds) * 100);

    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);

    return `
        <div class="lightning-monitor__countdown">
            <div class="lightning-monitor__countdown-label">NICA 30-min wait</div>
            <div class="lightning-monitor__countdown-timer" data-last-strike="${new Date(lastStrikeTime).getTime()}">
                ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}
            </div>
            <div class="lightning-monitor__progress-bar">
                <div class="lightning-monitor__progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
    `;
}

function startCountdownTimer(container, lastStrikeTime) {
    countdownInterval = setInterval(() => {
        // Update countdown timer
        const timerEl = container.querySelector('.lightning-monitor__countdown-timer');
        const progressEl = container.querySelector('.lightning-monitor__progress-fill');
        const timeAgoEl = container.querySelector('.lightning-monitor__time-ago');

        if (timerEl) {
            const elapsed = (Date.now() - new Date(lastStrikeTime).getTime()) / 1000;
            const totalSeconds = LIGHTNING_MONITOR.NICA_CLEAR_MINUTES * 60;
            const remaining = Math.max(0, totalSeconds - elapsed);
            const progress = Math.min(100, (elapsed / totalSeconds) * 100);

            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);

            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (progressEl) {
                progressEl.style.width = `${progress}%`;
            }

            // Timer complete — trigger full re-render via store update
            if (remaining <= 0) {
                stopCountdownTimer();
            }
        }

        // Update time-ago display
        if (timeAgoEl) {
            timeAgoEl.textContent = formatTimeAgo(lastStrikeTime);
        }
    }, LIGHTNING_MONITOR.COUNTDOWN_TICK_MS);
}

function stopCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function isCountdownComplete(lastStrikeTime) {
    const elapsed = (Date.now() - new Date(lastStrikeTime).getTime()) / 1000 / 60;
    return elapsed >= LIGHTNING_MONITOR.NICA_CLEAR_MINUTES;
}

function formatTimeAgo(time) {
    const seconds = Math.floor((Date.now() - new Date(time).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
}
