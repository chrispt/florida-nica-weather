/**
 * Florida NICA 2026 Season 7 Race Schedule
 * GPS coordinates for each venue for weather API lookups.
 * Update this file each season with new dates/venues.
 */

export const SEASON = 7;
export const SEASON_YEAR = 2026;

export const RACES = [
    {
        id: 1,
        name: 'The Fast and the Fearless',
        venue: 'Caloosahatchee Regional Park',
        city: 'Alva',
        state: 'FL',
        lat: 26.7156,
        lon: -81.6089,
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2026-01-31',
            end: '2026-02-01'
        },
        // Typical race hours (local time) — used for hourly risk windows
        raceHours: { start: 8, end: 16 }
    },
    {
        id: 2,
        name: 'Raiders of the Lost Trail',
        venue: 'Florida Horse Park (Santos)',
        city: 'Ocala',
        state: 'FL',
        lat: 29.1094,
        lon: -82.0853,
        dates: {
            start: '2026-02-21',
            end: '2026-02-22'
        },
        raceHours: { start: 8, end: 16 }
    },
    {
        id: 3,
        name: 'Shred Wars: Episode 7',
        venue: 'Dyer Park',
        city: 'West Palm Beach',
        state: 'FL',
        lat: 26.7485,
        lon: -80.1834,
        dates: {
            start: '2026-03-14',
            end: '2026-03-15'
        },
        raceHours: { start: 8, end: 16 }
    },
    {
        id: 4,
        name: 'Trailbusters',
        venue: 'Loyce E. Harpe Park',
        city: 'Mulberry',
        state: 'FL',
        lat: 27.8953,
        lon: -81.9714,
        dates: {
            start: '2026-03-28',
            end: '2026-03-29'
        },
        raceHours: { start: 8, end: 16 }
    },
    {
        id: 5,
        name: 'Jurassic Shred',
        venue: 'J.R. Alford Greenway Park',
        city: 'Tallahassee',
        state: 'FL',
        lat: 30.4074,
        lon: -84.1838,
        dates: {
            start: '2026-04-11',
            end: '2026-04-12'
        },
        raceHours: { start: 8, end: 16 }
    },
    {
        id: 6,
        name: 'This Season Deserves an Oscar',
        venue: 'San Felasco State Park',
        city: 'Alachua',
        state: 'FL',
        lat: 29.7211,
        lon: -82.4582,
        // Single-day championship event
        dates: {
            start: '2026-04-25',
            end: '2026-04-25'
        },
        raceHours: { start: 8, end: 16 }
    }
];
