/**
 * Notification Bell — UI for notification preferences and recent transitions
 */

import {
    getNotificationPrefs, setNotificationPrefs
} from '../notifications/notificationManager.js';

let recentTransitions = [];

/**
 * Add a transition to the recent history (max 10)
 */
export function addRecentTransition(transition, raceName) {
    recentTransitions.unshift({
        ...transition,
        raceName,
        time: new Date()
    });
    if (recentTransitions.length > 10) recentTransitions.pop();
}

/**
 * Render the notification bell in the header
 * @param {HTMLElement} container
 */
export function renderNotificationBell(container) {
    if (!container) return;

    const prefs = getNotificationPrefs();
    const badgeCount = recentTransitions.length;

    container.innerHTML = `
        <button class="notif-bell" id="notif-bell-toggle" type="button" aria-label="Notifications${badgeCount > 0 ? ` (${badgeCount} new)` : ''}" aria-expanded="false" aria-controls="notif-dropdown">
            <svg class="notif-bell__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            ${badgeCount > 0 ? `<span class="notif-bell__badge">${badgeCount}</span>` : ''}
        </button>
        <div class="notif-dropdown hidden" id="notif-dropdown">
            <div class="notif-dropdown__header">Notifications</div>
            <label class="notif-dropdown__toggle-row">
                <input type="checkbox" id="notif-enabled" ${prefs.enabled ? 'checked' : ''}>
                <span>Enable browser notifications</span>
            </label>
            <div class="notif-dropdown__section">Notify on transitions to:</div>
            <label class="notif-dropdown__check-row">
                <input type="checkbox" data-transition="toRed" ${prefs.transitions.includes('toRed') ? 'checked' : ''}>
                <span class="notif-dropdown__level notif-dropdown__level--red">RED</span>
            </label>
            <label class="notif-dropdown__check-row">
                <input type="checkbox" data-transition="toOrange" ${prefs.transitions.includes('toOrange') ? 'checked' : ''}>
                <span class="notif-dropdown__level notif-dropdown__level--orange">ORANGE</span>
            </label>
            <label class="notif-dropdown__check-row">
                <input type="checkbox" data-transition="toYellow" ${prefs.transitions.includes('toYellow') ? 'checked' : ''}>
                <span class="notif-dropdown__level notif-dropdown__level--yellow">YELLOW</span>
            </label>
            <label class="notif-dropdown__check-row">
                <input type="checkbox" data-transition="toGreen" ${prefs.transitions.includes('toGreen') ? 'checked' : ''}>
                <span class="notif-dropdown__level notif-dropdown__level--green">GREEN</span>
            </label>
            ${recentTransitions.length > 0 ? `
                <div class="notif-dropdown__section">Recent Changes</div>
                <div class="notif-dropdown__history">
                    ${recentTransitions.map(t => `
                        <div class="notif-history-item">
                            <span class="notif-history-item__race">${escapeHtml(t.raceName)}</span>
                            <span class="notif-history-item__change">${t.from} → ${t.to}</span>
                            <span class="notif-history-item__time">${formatTime(t.time)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>`;

    // Toggle dropdown
    const bell = container.querySelector('#notif-bell-toggle');
    const dropdown = container.querySelector('#notif-dropdown');

    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        const isOpen = !dropdown.classList.contains('hidden');
        bell.setAttribute('aria-expanded', isOpen);
    });

    // Close dropdown on outside click
    function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== bell) {
            dropdown.classList.add('hidden');
            bell.setAttribute('aria-expanded', 'false');
        }
    }
    document.addEventListener('click', closeDropdown);

    // Prevent dropdown click from closing
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Enable toggle
    const enabledCheckbox = container.querySelector('#notif-enabled');
    enabledCheckbox.addEventListener('change', async () => {
        const prefs = getNotificationPrefs();
        prefs.enabled = enabledCheckbox.checked;

        if (prefs.enabled && 'Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
            if (Notification.permission !== 'granted') {
                enabledCheckbox.checked = false;
                prefs.enabled = false;
            }
        }

        setNotificationPrefs(prefs);
    });

    // Transition checkboxes
    container.querySelectorAll('[data-transition]').forEach(cb => {
        cb.addEventListener('change', () => {
            const prefs = getNotificationPrefs();
            const t = cb.dataset.transition;
            if (cb.checked && !prefs.transitions.includes(t)) {
                prefs.transitions.push(t);
            } else if (!cb.checked) {
                prefs.transitions = prefs.transitions.filter(x => x !== t);
            }
            setNotificationPrefs(prefs);
        });
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
