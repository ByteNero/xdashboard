/**
 * Weather icon URL helper using OpenWeatherMap's icon set.
 * Works on all platforms (no emoji font dependency).
 */
export function getWeatherIconUrl(iconCode, size = 2) {
  const code = iconCode || '03d';
  return `https://openweathermap.org/img/wn/${code}@${size}x.png`;
}

/**
 * React component for weather icon.
 * @param {string} icon - OWM icon code (e.g. '01d', '10n')
 * @param {number} size - Display size in px (default 48)
 */
export function WeatherIcon({ icon, size = 48, style = {} }) {
  return (
    <img
      src={getWeatherIconUrl(icon)}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', ...style }}
      loading="lazy"
    />
  );
}
