import { useState, useEffect } from 'react';
import { Cloud, MapPin, Droplets, Snowflake } from 'lucide-react';
import { weather as weatherService } from '../../services';
import { useDashboardStore } from '../../store/dashboardStore';
import { WeatherIcon } from '../../utils/weatherIcons.jsx';
import PanelHeader from './PanelHeader';

export default function WeatherPanel({ config }) {
  const [weatherData, setWeatherData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { connectionStatus, integrations } = useDashboardStore();
  const isConnected = connectionStatus.weather?.connected;
  const weatherLocations = integrations.weatherLocations || [];
  const units = integrations.weather?.units || config?.units || 'metric';

  useEffect(() => {
    if (!isConnected) {
      setWeatherData(null);
      setLocations([]);
      return;
    }

    // Load initial data
    const initial = weatherService.getWeather();
    console.log('[WeatherPanel] Initial data:', initial);
    if (initial.current) {
      setWeatherData(initial.current);
    }
    if (initial.locations && initial.locations.length > 0) {
      setLocations(initial.locations);
    }

    const unsubscribe = weatherService.subscribe((data) => {
      console.log('[WeatherPanel] Received update:', data);
      setWeatherData(data.current);
      if (data.locations && data.locations.length > 0) {
        setLocations(data.locations);
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  const unitSymbol = units === 'imperial' ? 'F' : 'C';

  // Get current location's weather
  const currentLocation = locations[selectedIndex] || { weather: weatherData };
  const displayWeather = currentLocation.weather || weatherData;

  const handlePrev = () => {
    setSelectedIndex(i => i > 0 ? i - 1 : locations.length - 1);
  };

  const handleNext = () => {
    setSelectedIndex(i => i < locations.length - 1 ? i + 1 : 0);
  };

  if (!isConnected || !displayWeather) {
    return (
      <div className="panel">
        <PanelHeader
          icon={Cloud}
          title="Weather"
          badge={
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px' }}>
              NOT CONNECTED
            </span>
          }
        />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: '14px' }}>
            Connect Weather in Setup
          </div>
        </div>
      </div>
    );
  }

  // Single location view
  if (locations.length <= 1) {
    return (
      <div className="panel">
        <PanelHeader icon={Cloud} title="Weather" />
        <div className="panel-content">
          <WeatherCard weather={displayWeather} unitSymbol={unitSymbol} units={units} />
        </div>
      </div>
    );
  }

  // Multiple locations view
  return (
    <div className="panel">
      <PanelHeader
        icon={Cloud}
        title="Weather"
        currentPage={selectedIndex + 1}
        totalPages={locations.length}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      <div className="panel-content">
        {/* Location tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
          {locations.map((loc, i) => (
            <button
              key={loc.id}
              onClick={() => setSelectedIndex(i)}
              style={{
                padding: '4px 10px',
                background: selectedIndex === i ? 'var(--accent-glow)' : 'var(--bg-card)',
                border: `1px solid ${selectedIndex === i ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: '4px',
                color: selectedIndex === i ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={10} />
              {loc.name}
            </button>
          ))}
        </div>

        {currentLocation.error ? (
          <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '40px 20px', fontSize: '13px' }}>
            {currentLocation.error}
          </div>
        ) : (
          <WeatherCard weather={displayWeather} unitSymbol={unitSymbol} units={units} compact={locations.length > 2} />
        )}
      </div>
    </div>
  );
}

function WeatherCard({ weather, unitSymbol, units, compact = false }) {
  if (!weather) return null;

  return (
    <>
      <div className="weather-main" style={compact ? { padding: '5px 0' } : {}}>
        <div className="weather-icon" style={compact ? { marginBottom: '4px' } : {}}>
          <WeatherIcon icon={weather.icon} size={compact ? 48 : 64} />
        </div>
        <div className="weather-temp" style={compact ? { fontSize: '42px' } : {}}>
          {weather.temp}
          <span className="unit">°{unitSymbol}</span>
        </div>
        <div className="weather-condition" style={compact ? { fontSize: '13px' } : {}}>
          {weather.description || weather.condition}
        </div>
        {weather.location && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <MapPin size={10} />
            {weather.location}
          </div>
        )}
      </div>

      <div className="weather-details" style={compact ? { gap: '16px', marginTop: '10px', paddingTop: '10px' } : {}}>
        <div className="weather-detail">
          <div className="weather-detail-label">High</div>
          <div className="weather-detail-value" style={{ color: 'var(--warning)' }}>{weather.high}°</div>
        </div>
        <div className="weather-detail">
          <div className="weather-detail-label">Low</div>
          <div className="weather-detail-value" style={{ color: 'var(--accent-primary)' }}>{weather.low}°</div>
        </div>
        <div className="weather-detail">
          <div className="weather-detail-label">Humidity</div>
          <div className="weather-detail-value">{weather.humidity}%</div>
        </div>
        <div className="weather-detail">
          <div className="weather-detail-label">Wind</div>
          <div className="weather-detail-value">{weather.windSpeed} {units === 'imperial' ? 'mph' : 'm/s'}</div>
        </div>
      </div>

      {/* Rain/Snow details if present */}
      {(weather.rain1h > 0 || weather.rain3h > 0 || weather.snow1h > 0 || weather.snow3h > 0) && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(weather.rain1h > 0 || weather.rain3h > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-primary)' }}>
              <Droplets size={14} />
              <span>
                Rain: {weather.rain1h > 0 ? `${weather.rain1h.toFixed(1)}mm/1h` : `${weather.rain3h.toFixed(1)}mm/3h`}
              </span>
            </div>
          )}
          {(weather.snow1h > 0 || weather.snow3h > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Snowflake size={14} />
              <span>
                Snow: {weather.snow1h > 0 ? `${weather.snow1h.toFixed(1)}mm/1h` : `${weather.snow3h.toFixed(1)}mm/3h`}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
