/**
 * Unit Toggle — segmented control for switching between °F/mph and °C/km/h
 */

import store from '../state/store.js';

/**
 * Render the unit toggle in the header
 * @param {HTMLElement} container
 */
export function renderUnitToggle(container) {
    if (!container) return;

    const isMetric = store.get('tempUnit') === 'C';

    container.innerHTML = `
        <div class="unit-toggle">
            <button class="unit-toggle__btn ${!isMetric ? 'unit-toggle__btn--active' : ''}" data-unit="imperial">°F</button>
            <button class="unit-toggle__btn ${isMetric ? 'unit-toggle__btn--active' : ''}" data-unit="metric">°C</button>
        </div>`;

    container.querySelectorAll('.unit-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const metric = btn.dataset.unit === 'metric';
            store.update({
                tempUnit: metric ? 'C' : 'F',
                speedUnit: metric ? 'kph' : 'mph'
            });
        });
    });
}
