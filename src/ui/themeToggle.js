/**
 * Theme Toggle — switch between dark, light, and auto (OS preference)
 * Persists choice to localStorage.
 */

const STORAGE_KEY = 'nica-theme';

/**
 * Initialize theme from stored preference or OS default
 */
export function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
        document.documentElement.setAttribute('data-theme', stored);
    }
    // If no stored preference, :root without data-theme lets
    // the @media (prefers-color-scheme) rule in variables.css decide
}

/**
 * Get the currently active theme (resolved)
 */
function getActiveTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    // Auto — detect OS preference
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Render the theme toggle button in the header
 */
export function renderThemeToggle(container) {
    if (!container) return;

    const active = getActiveTheme();
    const isDark = active === 'dark';

    container.innerHTML = `
        <button class="theme-toggle" id="theme-toggle-btn" type="button"
                aria-label="Switch to ${isDark ? 'light' : 'dark'} mode"
                title="Switch to ${isDark ? 'light' : 'dark'} mode">
            ${isDark ? sunIcon() : moonIcon()}
        </button>`;

    container.querySelector('#theme-toggle-btn').addEventListener('click', () => {
        const next = getActiveTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEY, next);
        renderThemeToggle(container);
    });
}

function sunIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
}

function moonIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>`;
}
