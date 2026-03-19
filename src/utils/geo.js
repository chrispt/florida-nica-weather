/**
 * Geographic utility functions — Haversine distance, bearing, cardinal direction
 */

const EARTH_RADIUS_MILES = 3958.8;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Haversine distance between two lat/lon points in miles
 */
export function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * DEG_TO_RAD;
    const dLon = (lon2 - lon1) * DEG_TO_RAD;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_MILES * c;
}

/**
 * Initial bearing from point 1 to point 2 in degrees (0-360)
 */
export function bearing(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const dLambda = (lon2 - lon1) * DEG_TO_RAD;

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
              Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

    return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/**
 * Convert bearing degrees to 8-point compass direction
 */
export function bearingToCardinal(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
}
