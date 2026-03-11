/**
 * Centralized state management store
 * Adapted from Birding Weather Dashboard — keyed by race ID
 */

import { REFRESH_INTERVAL_NORMAL, STORAGE_KEYS } from '../config/constants.js';

const initialState = {
    // Active race being viewed in detail
    activeRaceId: null,

    // Weather data keyed by race ID: { [raceId]: { hourly, daily, raw, fetchedAt } }
    weatherData: {},

    // Risk assessments keyed by race ID: { [raceId]: { lightning, trailDamage, wind, heat, overall, level } }
    riskData: {},

    // NWS alerts keyed by race ID: { [raceId]: { alerts: [], fetchedAt } }
    alertsData: {},

    // Precipitation nowcast keyed by race ID: { [raceId]: { intervals: [], trend, fetchedAt } }
    nowcastData: {},

    // Previous risk levels for notification transitions: { [raceId]: 'GREEN'|'YELLOW'|'RED' }
    previousRiskLevels: {},

    // Notification preferences: { enabled, transitions: [...] }
    notificationPrefs: { enabled: false, transitions: ['toRed', 'toYellow', 'toGreen'] },

    // Timing
    lastFetchTime: null,
    refreshInterval: null,

    // UI State
    isLoading: false,
    error: null,

    // Preferences
    tempUnit: 'F',
    speedUnit: 'mph'
};

class Store {
    constructor() {
        this._state = { ...initialState };
        this._listeners = new Map();
        this._hydrateFromStorage();
    }

    getState() {
        return { ...this._state };
    }

    get(key) {
        return this._state[key];
    }

    set(key, value) {
        const oldValue = this._state[key];
        if (oldValue === value) return;
        this._state[key] = value;
        this._notifyListeners(key, value, oldValue);

        if (key in STORAGE_KEYS) {
            this._persistToStorage(key, value);
        }
    }

    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    subscribe(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);
        return () => {
            const listeners = this._listeners.get(key);
            if (listeners) listeners.delete(callback);
        };
    }

    subscribeAll(callback) {
        const key = '*';
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);
        return () => {
            const listeners = this._listeners.get(key);
            if (listeners) listeners.delete(callback);
        };
    }

    // Private

    _notifyListeners(key, newValue, oldValue) {
        if (this._listeners.has(key)) {
            this._listeners.get(key).forEach(cb => {
                try { cb(newValue, oldValue, key); }
                catch (e) { console.error(`Store listener error [${key}]:`, e); }
            });
        }
        if (this._listeners.has('*')) {
            this._listeners.get('*').forEach(cb => {
                try { cb(newValue, oldValue, key); }
                catch (e) { console.error('Store global listener error:', e); }
            });
        }
    }

    _hydrateFromStorage() {
        try {
            const tempUnit = localStorage.getItem(STORAGE_KEYS.TEMP_UNIT);
            if (tempUnit) this._state.tempUnit = tempUnit;
            const speedUnit = localStorage.getItem(STORAGE_KEYS.SPEED_UNIT);
            if (speedUnit) this._state.speedUnit = speedUnit;
        } catch (e) {
            // localStorage unavailable
        }
    }

    _persistToStorage(key, value) {
        const storageKeyMap = { tempUnit: STORAGE_KEYS.TEMP_UNIT, speedUnit: STORAGE_KEYS.SPEED_UNIT };
        const storageKey = storageKeyMap[key];
        if (!storageKey) return;
        try { localStorage.setItem(storageKey, value); }
        catch (e) { /* ignore */ }
    }
}

export const store = new Store();
export default store;
