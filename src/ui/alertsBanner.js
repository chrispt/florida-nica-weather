/**
 * NWS Alerts Banner — renders color-coded alert cards above the risk banner
 */

/**
 * Render NWS alert cards
 * @param {HTMLElement} container
 * @param {{alerts: Array, fetchedAt: Date}} alertsData
 */
export function renderAlertsBanner(container, alertsData) {
    if (!container) return;

    if (!alertsData || !alertsData.alerts || alertsData.alerts.length === 0) {
        container.innerHTML = '';
        return;
    }

    const cards = alertsData.alerts.map(alert => {
        const severityClass = getSeverityClass(alert);
        const isExpanded = false;

        return `
            <div class="alert-card alert-card--${severityClass}">
                <div class="alert-card__header">
                    <span class="alert-card__event">${escapeHtml(alert.event)}</span>
                    <span class="alert-card__severity">${escapeHtml(alert.severity)}</span>
                </div>
                <div class="alert-card__headline">${escapeHtml(alert.headline || '')}</div>
                ${alert.expires ? `<div class="alert-card__expires">Expires: ${formatAlertTime(alert.expires)}</div>` : ''}
                <div class="alert-card__description hidden">${escapeHtml(alert.description || '').replace(/\n/g, '<br>')}</div>
                ${alert.instruction ? `<div class="alert-card__instruction hidden">${escapeHtml(alert.instruction).replace(/\n/g, '<br>')}</div>` : ''}
                <button class="alert-card__toggle">Show details</button>
            </div>`;
    }).join('');

    container.innerHTML = `<div class="alerts-banner">${cards}</div>`;

    // Wire up expand/collapse toggles
    container.querySelectorAll('.alert-card__toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.alert-card');
            const desc = card.querySelector('.alert-card__description');
            const instr = card.querySelector('.alert-card__instruction');

            const isHidden = desc.classList.contains('hidden');
            desc.classList.toggle('hidden');
            if (instr) instr.classList.toggle('hidden');
            btn.textContent = isHidden ? 'Hide details' : 'Show details';
        });
    });
}

function getSeverityClass(alert) {
    const event = (alert.event || '').toLowerCase();
    if (event.includes('warning')) return 'warning';
    if (event.includes('watch')) return 'watch';
    return 'advisory';
}

function formatAlertTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
