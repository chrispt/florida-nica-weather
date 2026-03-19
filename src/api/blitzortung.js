/**
 * Blitzortung WebSocket client — real-time lightning strike detection
 *
 * Connects to the Blitzortung community network, filters strikes by distance
 * from a race venue, and pushes data to the store for UI rendering and risk override.
 */

import store from '../state/store.js';
import { haversineDistanceMiles, bearing, bearingToCardinal } from '../utils/geo.js';
import { LIGHTNING_MONITOR } from '../config/constants.js';

const WS_URL = 'wss://ws1.blitzortung.org/';

let ws = null;
let currentRace = null;
let pruneTimer = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let intentionalClose = false;

/**
 * Start monitoring lightning for a given race venue
 */
export function startLightningMonitor(race) {
    if (currentRace?.id === race.id && ws?.readyState === WebSocket.OPEN) return;

    stopLightningMonitor();
    currentRace = race;
    intentionalClose = false;
    reconnectAttempts = 0;

    connect();

    // Prune expired strikes every 30s
    pruneTimer = setInterval(pruneExpiredStrikes, 30000);

    // Reconnect when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Stop monitoring and clean up
 */
export function stopLightningMonitor() {
    intentionalClose = true;
    if (ws) {
        ws.close();
        ws = null;
    }
    currentRace = null;
    clearInterval(pruneTimer);
    clearTimeout(reconnectTimer);
    pruneTimer = null;
    reconnectTimer = null;
    reconnectAttempts = 0;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Check if the monitor is actively connected
 */
export function isMonitorActive() {
    return ws !== null && ws.readyState === WebSocket.OPEN;
}

/**
 * Get current strike data for a race from the store
 */
export function getLightningStrikeData(raceId) {
    const allStrikes = store.get('lightningStrikes') || {};
    return allStrikes[raceId] || null;
}

// --- Internal ---

function connect() {
    if (!currentRace) return;

    try {
        ws = new WebSocket(WS_URL);
    } catch (err) {
        console.warn('Blitzortung WebSocket creation failed:', err);
        updateStoreConnectionStatus(false);
        scheduleReconnect();
        return;
    }

    ws.onopen = () => {
        reconnectAttempts = 0;

        // Subscribe to a bounding box ~0.5 degrees around the venue
        const bbox = {
            west: currentRace.lon - 0.5,
            east: currentRace.lon + 0.5,
            north: currentRace.lat + 0.5,
            south: currentRace.lat - 0.5
        };

        ws.send(JSON.stringify({
            west: bbox.west,
            east: bbox.east,
            north: bbox.north,
            south: bbox.south
        }));

        updateStoreConnectionStatus(true);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.lat != null && data.lon != null) {
                processStrike(data);
            }
        } catch (err) {
            // Ignore malformed messages
        }
    };

    ws.onclose = () => {
        updateStoreConnectionStatus(false);
        if (!intentionalClose) {
            scheduleReconnect();
        }
    };

    ws.onerror = () => {
        // onclose will fire after onerror
    };
}

function processStrike(data) {
    if (!currentRace) return;

    const strikeLat = data.lat;
    const strikeLon = data.lon;
    // Blitzortung sends time in nanoseconds
    const strikeTime = data.time ? new Date(data.time / 1000000) : new Date();

    const distanceMiles = haversineDistanceMiles(
        currentRace.lat, currentRace.lon,
        strikeLat, strikeLon
    );

    // Only track strikes within watch radius
    if (distanceMiles > LIGHTNING_MONITOR.WATCH_RADIUS_MILES) return;

    const bearingDeg = bearing(currentRace.lat, currentRace.lon, strikeLat, strikeLon);
    const direction = bearingToCardinal(bearingDeg);
    const zone = distanceMiles <= LIGHTNING_MONITOR.DANGER_RADIUS_MILES ? 'danger' : 'watch';

    const strike = {
        lat: strikeLat,
        lon: strikeLon,
        time: strikeTime,
        distanceMiles: Math.round(distanceMiles * 10) / 10,
        direction,
        zone
    };

    addStrikeToStore(strike);
}

function addStrikeToStore(strike) {
    const raceId = currentRace.id;
    const allStrikes = { ...(store.get('lightningStrikes') || {}) };
    const existing = allStrikes[raceId] || { strikes: [], dangerCount: 0, watchCount: 0, closestStrike: null, lastStrikeTime: null, wsConnected: true };

    const strikes = [...existing.strikes, strike];
    const updated = recomputeStrikeStats(strikes);
    updated.wsConnected = isMonitorActive();

    allStrikes[raceId] = updated;
    store.set('lightningStrikes', allStrikes);
}

function recomputeStrikeStats(strikes) {
    const now = new Date();
    const dangerCutoff = new Date(now - LIGHTNING_MONITOR.DANGER_STRIKE_TTL_MINUTES * 60 * 1000);
    const watchCutoff = new Date(now - LIGHTNING_MONITOR.STRIKE_TTL_MINUTES * 60 * 1000);

    // Filter to valid strikes per TTL
    const validStrikes = strikes.filter(s => {
        if (s.zone === 'danger') return s.time >= dangerCutoff;
        return s.time >= watchCutoff;
    });

    const dangerStrikes = validStrikes.filter(s => s.zone === 'danger');
    const watchStrikes = validStrikes.filter(s => s.zone === 'watch');

    let closestStrike = null;
    let lastStrikeTime = null;

    for (const s of validStrikes) {
        if (!closestStrike || s.distanceMiles < closestStrike.distanceMiles) {
            closestStrike = s;
        }
        if (!lastStrikeTime || s.time > lastStrikeTime) {
            lastStrikeTime = s.time;
        }
    }

    return {
        strikes: validStrikes,
        dangerCount: dangerStrikes.length,
        watchCount: watchStrikes.length,
        closestStrike,
        lastStrikeTime
    };
}

function pruneExpiredStrikes() {
    if (!currentRace) return;

    const raceId = currentRace.id;
    const allStrikes = store.get('lightningStrikes') || {};
    const existing = allStrikes[raceId];
    if (!existing || existing.strikes.length === 0) return;

    const updated = recomputeStrikeStats(existing.strikes);
    updated.wsConnected = isMonitorActive();

    // Only update store if strikes were actually pruned
    if (updated.strikes.length !== existing.strikes.length) {
        store.set('lightningStrikes', { ...allStrikes, [raceId]: updated });
    }
}

function updateStoreConnectionStatus(connected) {
    if (!currentRace) return;
    const raceId = currentRace.id;
    const allStrikes = { ...(store.get('lightningStrikes') || {}) };
    const existing = allStrikes[raceId] || { strikes: [], dangerCount: 0, watchCount: 0, closestStrike: null, lastStrikeTime: null, wsConnected: false };
    allStrikes[raceId] = { ...existing, wsConnected: connected };
    store.set('lightningStrikes', allStrikes);
}

function scheduleReconnect() {
    if (reconnectAttempts >= 10 || intentionalClose) return;

    const delay = Math.min(5000 * (2 ** reconnectAttempts), 60000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
        if (!intentionalClose && currentRace) connect();
    }, delay);
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && currentRace && (!ws || ws.readyState !== WebSocket.OPEN)) {
        reconnectAttempts = 0;
        connect();
    }
}
