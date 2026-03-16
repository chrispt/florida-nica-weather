/**
 * Main entry point — orchestrates data fetching, risk assessment, and UI rendering
 */

import store from './state/store.js';
import { RACES } from './config/raceSchedule.js';
import { fetchRaceWeather, fetchNowcast } from './api/openMeteo.js';
import { fetchNWSAlerts, filterAlertsForRaceWindow } from './api/nwsAlerts.js';
import { fetchClimatePrecipNormal } from './api/openMeteoClimate.js';
import { fetchAirQuality } from './api/openMeteoAirQuality.js';
import { assessRaceRisk } from './config/riskAssessment.js';
import { findNextRace, isRaceDay, getRemainingRaces, daysUntilRace } from './utils/dateUtils.js';
import { formatRelativeTime } from './utils/formatting.js';
import { renderHero, destroyHero } from './ui/heroView.js';
import { renderRiskBanner } from './ui/riskBanner.js';
import { renderWeatherDetails } from './ui/weatherDetailView.js';
import { renderHourlyTimeline } from './ui/hourlyTimeline.js';
import { renderAllRaces } from './ui/allRacesView.js';
import { renderAlertsBanner } from './ui/alertsBanner.js';
import { renderDecisionTimeline } from './ui/decisionTimeline.js';
import { renderShareButton, updateURLHash, readRaceFromURL } from './ui/shareStatus.js';
import { renderNotificationBell, addRecentTransition } from './ui/notificationBell.js';
import { renderUnitToggle } from './ui/unitToggle.js';
import {
    initNotifications, checkForRiskTransitions,
    sendRiskNotification, shouldNotify,
    getPreviousRiskLevels, savePreviousRiskLevels
} from './notifications/notificationManager.js';
import { REFRESH_INTERVAL_NORMAL, REFRESH_INTERVAL_RACEDAY, NOWCAST_PROXIMITY_DAYS } from './config/constants.js';

// DOM containers
const heroContainer = document.getElementById('hero');
const riskContainer = document.getElementById('risk-banner');
const alertsContainer = document.getElementById('nws-alerts');
const timelineContainer = document.getElementById('decision-timeline');
const weatherContainer = document.getElementById('weather-details');
const hourlyContainer = document.getElementById('hourly-timeline');
const allRacesContainer = document.getElementById('all-races');
const lastUpdateEl = document.getElementById('last-update');
const errorContainer = document.getElementById('error-container');
const refreshBtn = document.getElementById('refresh-btn');
const notifBellContainer = document.getElementById('notification-bell');
const unitToggleContainer = document.getElementById('unit-toggle');

let refreshTimer = null;

/**
 * Initialize the app
 */
async function init() {
    // Check URL hash for deep-linked race
    const hashRaceId = readRaceFromURL();

    // Find the next race and set it as active
    if (hashRaceId) {
        store.set('activeRaceId', hashRaceId);
    } else {
        const nextRace = findNextRace();
        if (nextRace) {
            store.set('activeRaceId', nextRace.id);
        } else {
            store.set('activeRaceId', RACES[RACES.length - 1].id);
        }
    }

    // Initialize notifications
    initNotifications();
    renderNotificationBell(notifBellContainer);

    // Unit toggle
    renderUnitToggle(unitToggleContainer);
    store.subscribe('tempUnit', () => {
        renderUnitToggle(unitToggleContainer);
        renderActiveRace();
        renderAllRaces(allRacesContainer, handleRaceClick);
    });

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

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }

    try {
        const racesToFetch = getRelevantRaces();

        // Parallel-fetch weather, NWS alerts, climate normals, and nowcast per race
        const results = await Promise.allSettled(
            racesToFetch.map(async (race) => {
                const days = daysUntilRace(race);

                // Fetch weather + alerts + climate + AQI in parallel
                const fetches = [
                    fetchRaceWeather(race.lat, race.lon),
                    fetchNWSAlerts(race.lat, race.lon),
                    fetchClimatePrecipNormal(race.lat, race.lon, race.dates.start),
                    fetchAirQuality(race.lat, race.lon)
                ];

                // Conditionally fetch nowcast for nearby races
                if (days >= 0 && days <= NOWCAST_PROXIMITY_DAYS) {
                    fetches.push(fetchNowcast(race.lat, race.lon));
                }

                const [weatherResult, alertsResult, climateResult, aqiResult, nowcastResult] = await Promise.allSettled(fetches);

                return { race, weatherResult, alertsResult, climateResult, aqiResult, nowcastResult };
            })
        );

        const weatherData = { ...store.get('weatherData') };
        const riskData = { ...store.get('riskData') };
        const alertsData = { ...store.get('alertsData') };
        const nowcastData = { ...store.get('nowcastData') };
        const aqiData = { ...store.get('aqiData') };

        for (const settled of results) {
            if (settled.status !== 'fulfilled') continue;
            const { race, weatherResult, alertsResult, climateResult, aqiResult, nowcastResult } = settled.value;

            // Weather data
            if (weatherResult.status === 'fulfilled') {
                const result = weatherResult.value;
                if (result.data) {
                    weatherData[race.id] = result.data;
                } else if (result.error) {
                    console.error(`Weather fetch failed for ${race.name}:`, result.error.message);
                }
            }

            // NWS alerts
            if (alertsResult.status === 'fulfilled') {
                alertsData[race.id] = alertsResult.value;
            }

            // Climate normals
            let climateDeparture = null;
            if (climateResult?.status === 'fulfilled') {
                const climate = climateResult.value;
                if (climate.normalPrecip7d != null && weatherData[race.id]) {
                    // Calculate departure: actual past 7d rain - normal
                    const raceDate = new Date(race.dates.start + 'T00:00:00');
                    const sevenDaysBefore = new Date(raceDate);
                    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
                    const pastRain = weatherData[race.id].hourly
                        .filter(h => h.time >= sevenDaysBefore && h.time < raceDate)
                        .reduce((sum, h) => sum + (h.precipitation || 0), 0);
                    climateDeparture = Math.round(pastRain) - climate.normalPrecip7d;
                }
            }

            // AQI data
            if (aqiResult?.status === 'fulfilled') {
                const result = aqiResult.value;
                if (result.data) {
                    aqiData[race.id] = result.data;
                }
            }

            // Nowcast
            if (nowcastResult?.status === 'fulfilled') {
                const result = nowcastResult.value;
                if (result.data) {
                    nowcastData[race.id] = result.data;
                }
            }

            // Risk assessment with alerts, climate, and AQI context
            if (weatherData[race.id]) {
                const alerts = alertsData[race.id]
                    ? filterAlertsForRaceWindow(alertsData[race.id].alerts, race.dates.start, race.dates.end, race.raceHours)
                    : [];
                riskData[race.id] = assessRaceRisk(weatherData[race.id], race, alerts, climateDeparture, aqiData[race.id] || null);
            }
        }

        // Check for risk transitions before updating
        const previousLevels = getPreviousRiskLevels();
        const transitions = checkForRiskTransitions(riskData, previousLevels);
        const prefs = store.get('notificationPrefs');

        for (const t of transitions) {
            const race = RACES.find(r => r.id == t.raceId);
            const raceName = race ? race.name : `Race ${t.raceId}`;
            addRecentTransition(t, raceName);

            if (shouldNotify(t, prefs)) {
                sendRiskNotification(t, raceName);
            }
        }

        // Save current levels for next comparison
        const currentLevels = {};
        for (const [raceId, risk] of Object.entries(riskData)) {
            currentLevels[raceId] = risk.level;
        }
        savePreviousRiskLevels(currentLevels);

        store.update({ weatherData, riskData, alertsData, nowcastData, aqiData, lastFetchTime: new Date(), isLoading: false });
        updateLastFetchDisplay();
        renderActiveRace();
        renderAllRaces(allRacesContainer, handleRaceClick);
        renderNotificationBell(notifBellContainer);

    } catch (err) {
        console.error('Failed to fetch weather data:', err);
        store.update({ error: err.message, isLoading: false });
        showError(err.message);
    }

    showLoading(false);

    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
    }
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
    const alertsDataForRace = store.get('alertsData')[race.id];
    const nowcastData = store.get('nowcastData')[race.id];
    const aqiDataForRace = store.get('aqiData')[race.id];

    // Calculate climate departure for display
    let climateDeparture = null;
    if (riskData && riskData.trailDamageDetails) {
        climateDeparture = riskData.trailDamageDetails.climateDeparture;
    }

    // Update URL hash
    updateURLHash(race.id);

    destroyHero();
    renderHero(heroContainer, race);
    renderRiskBanner(riskContainer, riskData, race);
    renderAlertsBanner(alertsContainer, alertsDataForRace);
    renderDecisionTimeline(timelineContainer, race, riskData, weatherData);
    renderWeatherDetails(weatherContainer, weatherData, race, nowcastData, climateDeparture, aqiDataForRace);
    renderHourlyTimeline(hourlyContainer, weatherData, race);

    // Share button in the risk banner header area
    renderShareButton(riskContainer, race, riskData, weatherData);
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
