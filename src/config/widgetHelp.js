/**
 * Help text for widget info buttons
 * Each key corresponds to a widget's data-help-key attribute
 */

export const WIDGET_HELP = {
    currentConditions: 'Current temperature, humidity, UV, and conditions at the race venue based on nearest weather station data.',
    rainfallHistory: 'Total rainfall over the past 7 days. High cumulative rain saturates trails and increases cancellation risk. The "30-yr normal" comparison shows if conditions are unusually wet or dry.',
    soilMoisture: 'How much water is in the ground. Above ~35% for Florida sandy soil means trails are likely too soft for safe racing. Surface (0\u20137cm) matters most for trail conditions.',
    wind: 'Current and forecast wind speeds. Sustained winds above 25 mph or gusts above 35 mph may require course modifications or delays.',
    heatSafety: 'Estimated Wet Bulb Globe Temperature (WBGT) \u2014 a heat stress index combining temperature, humidity, and wind. NICA restricts activity above 87\u00B0F WBGT. This is an estimate, not a substitute for on-site measurement.',
    nowcast: 'High-resolution 15-minute precipitation forecast for the next 2 hours. Only available when a race is within 2 days. Useful for real-time lightning delay decisions.',
    raceDayForecast: 'Daily weather summary for each race day. Helps with advance planning for rider safety and course setup.',
    decisionTimeline: 'Recommended go/no-go timeline with weather snapshots at each checkpoint. Follow NICA protocol: 72hr review \u2192 48hr preliminary \u2192 24hr firm decision \u2192 morning-of final check.',
    hourlyTimeline: 'Hour-by-hour forecast for race weekend. Orange-bordered hours are during race time (8am\u20134pm). Red borders indicate thunderstorm risk. Lightning bolt icons show high CAPE (storm energy).',
    riskBanner: 'Overall risk score (0\u2013100) based on lightning, trail damage, wind, and heat. GREEN (<30) = proceed. YELLOW (30\u201360) = enhanced monitoring. RED (>60) = likely cancellation/delay.'
};
