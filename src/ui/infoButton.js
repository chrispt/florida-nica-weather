/**
 * Info button + popover for widget help text
 */

import { WIDGET_HELP } from '../config/widgetHelp.js';

/**
 * Returns an HTML string for an info button
 * @param {string} helpKey - Key from WIDGET_HELP
 * @returns {string} HTML string
 */
export function renderInfoButton(helpKey) {
    return `
        <span class="info-btn-wrapper">
            <button class="info-btn" data-help-key="${helpKey}" aria-label="What is this?" type="button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                    <text x="8" y="12" text-anchor="middle" fill="currentColor" font-size="10" font-weight="600" font-family="serif">i</text>
                </svg>
            </button>
        </span>`;
}

/**
 * Attach click handlers to all .info-btn elements within a container.
 * Only one popover can be open at a time. Click outside dismisses.
 * @param {HTMLElement} container
 */
export function setupInfoButtons(container) {
    const buttons = container.querySelectorAll('.info-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const key = btn.dataset.helpKey;
            const text = WIDGET_HELP[key];
            if (!text) return;

            // Close any existing popover
            const existing = document.querySelector('.info-popover');
            if (existing) {
                // If clicking the same button that has the open popover, just close it
                if (existing.previousElementSibling === btn || existing.dataset.helpKey === key) {
                    existing.remove();
                    return;
                }
                existing.remove();
            }

            // Create popover
            const popover = document.createElement('div');
            popover.className = 'info-popover';
            popover.dataset.helpKey = key;
            popover.textContent = text;

            // Append to body to escape stacking contexts (backdrop-filter on parent sections)
            const rect = btn.getBoundingClientRect();
            popover.style.top = `${rect.bottom + 4}px`;
            popover.style.left = `${rect.left}px`;
            document.body.appendChild(popover);

            // If popover overflows right edge, align to right of button
            requestAnimationFrame(() => {
                const popRect = popover.getBoundingClientRect();
                if (popRect.right > window.innerWidth - 16) {
                    popover.style.left = 'auto';
                    popover.style.right = `${window.innerWidth - rect.right}px`;
                }
            });

            // Cleanup helper
            const cleanup = () => {
                popover.remove();
                document.removeEventListener('click', dismiss);
                window.removeEventListener('scroll', dismissOnScroll, true);
            };

            // Click outside to dismiss
            function dismiss(evt) {
                if (!popover.contains(evt.target) && evt.target !== btn) {
                    cleanup();
                }
            }

            // Dismiss on scroll (anchor position becomes stale)
            const dismissOnScroll = () => cleanup();

            requestAnimationFrame(() => {
                document.addEventListener('click', dismiss);
                window.addEventListener('scroll', dismissOnScroll, { once: true, capture: true });
            });
        });
    });
}
