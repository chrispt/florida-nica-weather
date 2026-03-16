/**
 * Help text for widget info buttons
 * Each key corresponds to a widget's data-help-key attribute
 */

export const WIDGET_HELP = {
    currentConditions: 'Current temperature, humidity, UV, and conditions at the race venue based on nearest weather station data.',
    rainfallHistory: 'Total rainfall over the past 7 days. High cumulative rain saturates trails and increases cancellation risk. The "30-yr normal" comparison shows if conditions are unusually wet or dry.',
    soilMoisture: 'How much water is in the ground. Above ~35% for Florida sandy soil means trails are likely too soft for safe racing. Surface (0\u20137cm) matters most for trail conditions.',
    wind: 'Current and forecast wind speeds. Sustained winds above 25 mph or gusts above 35 mph may require course modifications or delays. NICA treats wind as a full risk category.',
    heatSafety: 'Heat Index combines air temperature and humidity to estimate how hot it feels. NICA thresholds: GREEN (<95\u00B0F), YELLOW (95\u2013100\u00B0F, max 2 hrs), ORANGE (100\u2013105\u00B0F, max 1 hr), RED (>105\u00B0F, cancel). This is an estimate, not a substitute for on-site measurement.',
    nowcast: 'High-resolution 15-minute precipitation forecast for the next 2 hours. Only available when a race is within 2 days. Useful for real-time lightning delay decisions.',
    raceDayForecast: 'Daily weather summary for each race day. Helps with advance planning for rider safety and course setup.',
    decisionTimeline: 'Recommended go/no-go timeline with weather snapshots at each checkpoint. Follow NICA protocol: 72hr review \u2192 48hr preliminary \u2192 24hr firm decision \u2192 morning-of final check.',
    hourlyTimeline: 'Hour-by-hour forecast for race weekend. Orange-bordered hours are during race time (8am\u20134pm). Red borders indicate thunderstorm risk. Lightning bolt icons show high CAPE (storm energy).',
    riskBanner: 'Overall risk score (0\u2013100) across 6 categories: lightning, heat, wind, heavy rain, trail damage, and air quality. GREEN (0\u201325) = proceed. YELLOW (25\u201350) = enhanced monitoring. ORANGE (50\u201375) = activity modification needed. RED (>75) = likely cancellation.',
    airQuality: 'US Air Quality Index (AQI) for the race venue. NICA thresholds: GREEN (0\u201350, good), YELLOW (51\u2013100, moderate), ORANGE (101\u2013150, competitive events canceled), RED (>150, all outdoor activity canceled).'
};
