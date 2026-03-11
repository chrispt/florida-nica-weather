/**
 * Precipitation Nowcast Widget — 15-minute resolution for the next 2 hours
 * Only shown when a race is within 2 days
 */

/**
 * Render the nowcast widget
 * @param {object} nowcastData - { intervals: [{time, precipitation}], trend, fetchedAt }
 * @returns {string} HTML string
 */
export function renderNowcastWidget(nowcastData) {
    if (!nowcastData || !nowcastData.intervals || nowcastData.intervals.length === 0) {
        return '';
    }

    const { intervals, trend } = nowcastData;
    const maxPrecip = Math.max(...intervals.map(d => d.precipitation), 0.5);
    const hasAnyRain = intervals.some(d => d.precipitation > 0);

    const trendArrow = trend === 'increasing' ? '&#x2191;' : trend === 'decreasing' ? '&#x2193;' : '&#x2192;';
    const trendLabel = trend === 'increasing' ? 'Increasing' : trend === 'decreasing' ? 'Decreasing' : 'Steady';

    // Find time until next rain
    const summaryText = getSummaryText(intervals);

    const bars = intervals.map(d => {
        const height = Math.max(2, (d.precipitation / maxPrecip) * 100);
        const time = new Date(d.time);
        const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const barClass = d.precipitation > 5 ? 'nowcast-bar--heavy' : d.precipitation > 0 ? 'nowcast-bar--rain' : 'nowcast-bar--dry';
        return `<div class="nowcast-bar ${barClass}" style="height: ${height}%" title="${timeStr}: ${d.precipitation.toFixed(1)}mm"></div>`;
    }).join('');

    return `
        <div class="widget widget--full">
            <div class="widget__title">Next 2 Hours — Precipitation Nowcast</div>
            <div class="nowcast-summary">
                <span class="nowcast-summary__text">${summaryText}</span>
                ${hasAnyRain ? `<span class="nowcast-trend">${trendArrow} ${trendLabel}</span>` : ''}
            </div>
            <div class="nowcast-chart">${bars}</div>
            <div class="nowcast-labels">
                <span>Now</span>
                <span>+30min</span>
                <span>+1hr</span>
                <span>+1.5hr</span>
                <span>+2hr</span>
            </div>
        </div>`;
}

function getSummaryText(intervals) {
    const hasRainNow = intervals.length > 0 && intervals[0].precipitation > 0;
    const firstRainIdx = intervals.findIndex(d => d.precipitation > 0);
    const lastRainIdx = [...intervals].reverse().findIndex(d => d.precipitation > 0);
    const firstDryIdx = hasRainNow ? intervals.findIndex(d => d.precipitation === 0) : -1;

    if (!intervals.some(d => d.precipitation > 0)) {
        return 'No precipitation expected in the next 2 hours';
    }

    if (hasRainNow && firstDryIdx >= 0) {
        const minsUntilDry = firstDryIdx * 15;
        return `Rain clearing in ~${minsUntilDry} min`;
    }

    if (hasRainNow) {
        return 'Rain expected to continue';
    }

    if (firstRainIdx >= 0) {
        const minsUntilRain = firstRainIdx * 15;
        return `Rain expected in ~${minsUntilRain} min`;
    }

    return 'Precipitation data available';
}
