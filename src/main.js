/**
 * Main entry point — orchestrates data fetching, risk assessment, and UI rendering
 */

import store from './state/store.js';
import { RACES } from './config/raceSchedule.js';
import { fetchRaceWeather } from './api/openMeteo.js';
import { assessRaceRisk } from './config/riskAssessment.js';
import { findNextRace, isRaceDay, getRemainingRaces } from './utils/dateUtils.js';
import { formatRelativeTime } from './utils/formatting.js';
import { renderHero, destroyHero } from './ui/heroView.js';
import { renderRiskBanner } from './ui/riskBanner.js';
import { renderWeatherDetails } from './ui/weatherDetailView.js';
import { renderHourlyTimeline } from './ui/hourlyTimeline.js';
import { renderAllRaces } from './ui/allRacesView.js';
import { REFRESH_INTERVAL_NORMAL, REFRESH_INTERVAL_RACEDAY } from './config/constants.js';

// DOM containers
const heroContainer = document.getElementById('hero');
const riskContainer = document.getElementById('risk-banner');
const weatherContainer = document.getElementById('weather-details');
const timelineContainer = document.getElementById('hourly-timeline');
const allRacesContainer = document.getElementById('all-races');
const lastUpdateEl = document.getElementById('last-update');
const errorContainer = document.getElementById('error-container');
const refreshBtn = document.getElementById('refresh-btn');

let refreshTimer = null;

/**
 * Initialize the app
 */
async function init() {
    // Find the next race and set it as active
    const nextRace = findNextRace();
    if (nextRace) {
        store.set('activeRaceId', nextRace.id);
    } else {
        // Season over — show last race
        store.set('activeRaceId', RACES[RACES.length - 1].id);
    }

    // Wire up refresh button
    refreshBtn?.addEventListener('click', () => fetchAllWeatherData());

    // Initial render
    renderActiveRace();
    renderAllRaces(allRacesContainer, handleRaceClick);

    // Fetch weather data
    await fetchAllWeatherData();

    // Start auto-refresh
    startAutoRefresh();
}

/**
 * Fetch weather for all remaining races (+ the active race if past)
 */
async function fetchAllWeatherData() {
    store.set('isLoading', true);
    store.set('error', null);
    showLoading(true);

    try {
        const racesToFetch = getRelevantRaces();
        const results = await Promise.allSettled(
            racesToFetch.map(race => fetchRaceWeather(race.lat, race.lon).then(result => ({ race, result })))
        );

        const weatherData = { ...store.get('weatherData') };
        const riskData = { ...store.get('riskData') };

        for (const settled of results) {
            if (settled.status === 'fulfilled') {
                const { race, result } = settled.value;
                if (result.data) {
                    weatherData[race.id] = result.data;
                    riskData[race.id] = assessRaceRisk(result.data, race);
                } else if (result.error) {
                    console.error(`Weather fetch failed for ${race.name}:`, result.error.message);
                }
            }
        }

        store.update({ weatherData, riskData, lastFetchTime: new Date(), isLoading: false });
        updateLastFetchDisplay();
        renderActiveRace();
        renderAllRaces(allRacesContainer, handleRaceClick);

    } catch (err) {
        console.error('Failed to fetch weather data:', err);
        store.update({ error: err.message, isLoading: false });
        showError(err.message);
    }

    showLoading(false);
}

/**
 * Get races that need weather data — remaining + active
 */
function getRelevantRaces() {
    const remaining = getRemainingRaces();
    const activeId = store.get('activeRaceId');
    const activeRace = RACES.find(r => r.id === activeId);

    if (activeRace && !remaining.find(r => r.id === activeId)) {
        return [activeRace, ...remaining];
    }
    return remaining.length > 0 ? remaining : [RACES[RACES.length - 1]];
}

/**
 * Render the currently active race detail view
 */
function renderActiveRace() {
    const activeId = store.get('activeRaceId');
    const race = RACES.find(r => r.id === activeId);
    if (!race) return;

    const weatherData = store.get('weatherData')[race.id];
    const riskData = store.get('riskData')[race.id];

    destroyHero();
    renderHero(heroContainer, race);
    renderRiskBanner(riskContainer, riskData, race);
    renderWeatherDetails(weatherContainer, weatherData, race);
    renderHourlyTimeline(timelineContainer, weatherData, race);
}

/**
 * Handle race card click — switch detail view
 */
function handleRaceClick(raceId) {
    store.set('activeRaceId', raceId);
    renderActiveRace();
    renderAllRaces(allRacesContainer, handleRaceClick);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Auto-refresh on interval (faster on race days)
 */
function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);

    const interval = isRaceDay() ? REFRESH_INTERVAL_RACEDAY : REFRESH_INTERVAL_NORMAL;
    refreshTimer = setInterval(() => {
        fetchAllWeatherData();
    }, interval);
}

function updateLastFetchDisplay() {
    const lastFetch = store.get('lastFetchTime');
    if (lastUpdateEl && lastFetch) {
        lastUpdateEl.textContent = `Updated ${formatRelativeTime(lastFetch)}`;
    }

    // Keep updating the relative time
    if (lastUpdateEl) {
        setInterval(() => {
            const t = store.get('lastFetchTime');
            if (t) lastUpdateEl.textContent = `Updated ${formatRelativeTime(t)}`;
        }, 30000);
    }
}

function showLoading(show) {
    if (errorContainer) errorContainer.innerHTML = '';
    // Loading state is visual — widgets show their own spinners
}

function showError(message) {
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="error-message">Failed to load weather data: ${message}</div>`;
    }
}

// Start the app
init();
