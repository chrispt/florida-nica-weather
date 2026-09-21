/**
 * Florida NICA 2027 Season 8 Race Schedule
 * GPS coordinates for each venue for weather API lookups.
 * Update this file each season with new dates/venues.
 *
 * Source: floridamtb.org event calendar (verified 2026-09-21).
 * Coordinates are from the league's published street addresses (US Census
 * geocoder); each nwsRadarUrl station is the radar NWS itself reports for
 * that exact point via api.weather.gov/points.
 *
 * Season 8 is conference-scoped: races are run for the North conference,
 * the South conference, or all conferences together. The `conference` field
 * drives the badge on each race card.
 *
 * Entries are ordered chronologically. `id` is the stable key used for
 * store lookups and URL deep-links, so it spans every event; `raceNumber`
 * is the season race count (1-6) and is null for non-race events.
 */

export const SEASON = 8;
export const SEASON_YEAR = 2027;

/** Display labels for the `conference` field. */
export const CONFERENCE_LABELS = {
    all: 'All Conference',
    north: 'North Conference',
    south: 'South Conference'
};

export const RACES = [
    {
        id: 1,
        raceNumber: null,
        eventType: 'adventure',
        conference: 'north',
        name: 'North Conference Adventure Day',
        venue: 'Spruce Creek Park / Kaye Property',
        city: 'New Smyrna Beach',
        state: 'FL',
        lat: 29.0742,
        lon: -80.9867,
        radarStation: 'KMLB',
        // Single-day adventure ride, not a race
        dates: {
            start: '2026-12-05',
            end: '2026-12-05'
        },
        // Typical event hours (local time) — used for hourly risk windows
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MC45ODY3LDI5LjA3NDJdLCJ6b29tIjo4LCJmaWx0ZXIiOiJXU1ItODhEIiwibGF5ZXIiOiJicmVmX3JhdyIsInN0YXRpb24iOiJLTUxCIiwidHJhbnNwYXJlbnQiOnRydWUsImFsZXJ0c092ZXJsYXkiOnRydWUsInN0YXRpb25JY29uc092ZXJsYXkiOnRydWV9LCJiYXNlIjoic3RhbmRhcmQiLCJjb3VudHkiOmZhbHNlLCJjd2EiOmZhbHNlLCJzdGF0ZSI6ZmFsc2UsIm1lbnUiOnRydWUsInNob3J0RnVzZWRPbmx5Ijp0cnVlfQ==#/'
    },
    {
        id: 2,
        raceNumber: null,
        eventType: 'adventure',
        conference: 'south',
        name: 'South Conference Adventure Day',
        venue: 'Amelia Earhart MTB Trails',
        city: 'Hialeah',
        state: 'FL',
        lat: 25.8817,
        lon: -80.275,
        radarStation: 'KAMX',
        // Single-day adventure ride, not a race
        dates: {
            start: '2026-12-12',
            end: '2026-12-12'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MC4yNzUsMjUuODgxN10sInpvb20iOjgsImZpbHRlciI6IldTUi04OEQiLCJsYXllciI6ImJyZWZfcmF3Iiwic3RhdGlvbiI6IktBTVgiLCJ0cmFuc3BhcmVudCI6dHJ1ZSwiYWxlcnRzT3ZlcmxheSI6dHJ1ZSwic3RhdGlvbkljb25zT3ZlcmxheSI6dHJ1ZX0sImJhc2UiOiJzdGFuZGFyZCIsImNvdW50eSI6ZmFsc2UsImN3YSI6ZmFsc2UsInN0YXRlIjpmYWxzZSwibWVudSI6dHJ1ZSwic2hvcnRGdXNlZE9ubHkiOnRydWV9#/'
    },
    {
        id: 3,
        raceNumber: 1,
        eventType: 'race',
        conference: 'all',
        name: 'All Conference Time Trial',
        venue: 'Wickham Park',
        city: 'Melbourne',
        state: 'FL',
        lat: 28.1576,
        lon: -80.6626,
        radarStation: 'KMLB',
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-01-16',
            end: '2027-01-17'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MC42NjI2LDI4LjE1NzZdLCJ6b29tIjo4LCJmaWx0ZXIiOiJXU1ItODhEIiwibGF5ZXIiOiJicmVmX3JhdyIsInN0YXRpb24iOiJLTUxCIiwidHJhbnNwYXJlbnQiOnRydWUsImFsZXJ0c092ZXJsYXkiOnRydWUsInN0YXRpb25JY29uc092ZXJsYXkiOnRydWV9LCJiYXNlIjoic3RhbmRhcmQiLCJjb3VudHkiOmZhbHNlLCJjd2EiOmZhbHNlLCJzdGF0ZSI6ZmFsc2UsIm1lbnUiOnRydWUsInNob3J0RnVzZWRPbmx5Ijp0cnVlfQ==#/'
    },
    {
        id: 4,
        raceNumber: 2,
        eventType: 'race',
        conference: 'south',
        name: 'South Conference at CRP',
        venue: 'Caloosahatchee Regional Park / Alva Community Park',
        city: 'Alva',
        state: 'FL',
        lat: 26.7261,
        lon: -81.6444,
        radarStation: 'KTBW',
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-01-30',
            end: '2027-01-31'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MS42NDQ0LDI2LjcyNjFdLCJ6b29tIjo4LCJmaWx0ZXIiOiJXU1ItODhEIiwibGF5ZXIiOiJicmVmX3JhdyIsInN0YXRpb24iOiJLVEJXIiwidHJhbnNwYXJlbnQiOnRydWUsImFsZXJ0c092ZXJsYXkiOnRydWUsInN0YXRpb25JY29uc092ZXJsYXkiOnRydWV9LCJiYXNlIjoic3RhbmRhcmQiLCJjb3VudHkiOmZhbHNlLCJjd2EiOmZhbHNlLCJzdGF0ZSI6ZmFsc2UsIm1lbnUiOnRydWUsInNob3J0RnVzZWRPbmx5Ijp0cnVlfQ==#/'
    },
    {
        id: 5,
        raceNumber: 3,
        eventType: 'race',
        conference: 'all',
        name: 'All Conference at Ocala',
        venue: 'Florida Horse Park (west entrance)',
        city: 'Ocala',
        state: 'FL',
        lat: 29.057,
        lon: -82.1526,
        radarStation: 'KTBW',
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-02-13',
            end: '2027-02-14'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04Mi4xNTI2LDI5LjA1N10sInpvb20iOjgsImZpbHRlciI6IldTUi04OEQiLCJsYXllciI6ImJyZWZfcmF3Iiwic3RhdGlvbiI6IktUQlciLCJ0cmFuc3BhcmVudCI6dHJ1ZSwiYWxlcnRzT3ZlcmxheSI6dHJ1ZSwic3RhdGlvbkljb25zT3ZlcmxheSI6dHJ1ZX0sImJhc2UiOiJzdGFuZGFyZCIsImNvdW50eSI6ZmFsc2UsImN3YSI6ZmFsc2UsInN0YXRlIjpmYWxzZSwibWVudSI6dHJ1ZSwic2hvcnRGdXNlZE9ubHkiOnRydWV9#/'
    },
    {
        id: 6,
        raceNumber: 4,
        eventType: 'race',
        conference: 'north',
        name: 'North Conference at Jacksonville',
        venue: 'Kathryn Abbey Hanna Park',
        city: 'Jacksonville',
        state: 'FL',
        lat: 30.3713,
        lon: -81.4094,
        radarStation: 'KJAX',
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-03-20',
            end: '2027-03-21'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MS40MDk0LDMwLjM3MTNdLCJ6b29tIjo4LCJmaWx0ZXIiOiJXU1ItODhEIiwibGF5ZXIiOiJicmVmX3JhdyIsInN0YXRpb24iOiJLSkFYIiwidHJhbnNwYXJlbnQiOnRydWUsImFsZXJ0c092ZXJsYXkiOnRydWUsInN0YXRpb25JY29uc092ZXJsYXkiOnRydWV9LCJiYXNlIjoic3RhbmRhcmQiLCJjb3VudHkiOmZhbHNlLCJjd2EiOmZhbHNlLCJzdGF0ZSI6ZmFsc2UsIm1lbnUiOnRydWUsInNob3J0RnVzZWRPbmx5Ijp0cnVlfQ==#/'
    },
    {
        id: 7,
        raceNumber: 5,
        eventType: 'race',
        conference: 'all',
        name: 'All Conference at Lakeland',
        venue: 'Loyce E. Harpe Park',
        city: 'Mulberry',
        state: 'FL',
        lat: 27.928,
        lon: -81.9634,
        radarStation: 'KTBW',
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-04-03',
            end: '2027-04-04'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04MS45NjM0LDI3LjkyOF0sInpvb20iOjgsImZpbHRlciI6IldTUi04OEQiLCJsYXllciI6ImJyZWZfcmF3Iiwic3RhdGlvbiI6IktUQlciLCJ0cmFuc3BhcmVudCI6dHJ1ZSwiYWxlcnRzT3ZlcmxheSI6dHJ1ZSwic3RhdGlvbkljb25zT3ZlcmxheSI6dHJ1ZX0sImJhc2UiOiJzdGFuZGFyZCIsImNvdW50eSI6ZmFsc2UsImN3YSI6ZmFsc2UsInN0YXRlIjpmYWxzZSwibWVudSI6dHJ1ZSwic2hvcnRGdXNlZE9ubHkiOnRydWV9#/'
    },
    {
        id: 8,
        raceNumber: 6,
        eventType: 'race',
        championship: true,
        conference: 'all',
        name: 'State Championship',
        venue: 'Apalachee Regional Park',
        city: 'Tallahassee',
        state: 'FL',
        lat: 30.4187,
        lon: -84.1495,
        radarStation: 'KTLH',
        // Season championship event
        // Saturday setup/pre-ride, Sunday racing
        dates: {
            start: '2027-04-24',
            end: '2027-04-25'
        },
        raceHours: { start: 8, end: 16 },
        nwsRadarUrl: 'https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy04NC4xNDk1LDMwLjQxODddLCJ6b29tIjo4LCJmaWx0ZXIiOiJXU1ItODhEIiwibGF5ZXIiOiJicmVmX3JhdyIsInN0YXRpb24iOiJLVExIIiwidHJhbnNwYXJlbnQiOnRydWUsImFsZXJ0c092ZXJsYXkiOnRydWUsInN0YXRpb25JY29uc092ZXJsYXkiOnRydWV9LCJiYXNlIjoic3RhbmRhcmQiLCJjb3VudHkiOmZhbHNlLCJjd2EiOmZhbHNlLCJzdGF0ZSI6ZmFsc2UsIm1lbnUiOnRydWUsInNob3J0RnVzZWRPbmx5Ijp0cnVlfQ==#/'
    }
];

/** Races only (excludes adventure days and other non-race events). */
export const RACE_EVENTS = RACES.filter(r => r.eventType === 'race');
