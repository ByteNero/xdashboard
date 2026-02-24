import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock as ClockIcon, Globe, Droplets, Wind, MapPin, Calendar, Timer } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { weather as weatherService } from '../../services';
import { WeatherIcon } from '../../utils/weatherIcons.jsx';
import PanelHeader from './PanelHeader';

// Parse iCal format (simplified)
function parseICal(icalData) {
  const events = [];
  const lines = icalData.replace(/\r\n /g, '').replace(/\r/g, '\n').split('\n');
  let currentEvent = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.start) events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        let key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        const semicolonIndex = key.indexOf(';');
        if (semicolonIndex > -1) key = key.substring(0, semicolonIndex);

        switch (key) {
          case 'SUMMARY':
            currentEvent.summary = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
            break;
          case 'DTSTART':
            currentEvent.start = parseICalDate(value);
            currentEvent.allDay = value.length === 8;
            break;
        }
      }
    }
  }
  return events;
}

function parseICalDate(dateStr) {
  if (dateStr.length === 8) {
    return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
  }
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(9, 11)) || 0;
  const minute = parseInt(dateStr.substring(11, 13)) || 0;
  const second = parseInt(dateStr.substring(13, 15)) || 0;
  if (dateStr.endsWith('Z')) return new Date(Date.UTC(year, month, day, hour, minute, second));
  return new Date(year, month, day, hour, minute, second);
}

export default function ClockWeatherPanel({ config }) {
  const [time, setTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLocations, setWeatherLocations] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const { integrations, connectionStatus, settings } = useDashboardStore();

  // Get clocks from config - default to local time
  const clocks = integrations.clocks && integrations.clocks.length > 0
    ? integrations.clocks.filter(c => c.enabled !== false)
    : [{ id: 'local', name: 'Local', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }];

  const calendars = integrations.calendars || [];
  const hasCalendars = calendars.length > 0 && calendars.some(c => c.url && c.enabled);
  const calendarsKey = JSON.stringify(calendars.filter(c => c.enabled).map(c => ({ id: c.id, url: c.url })));

  const countdowns = (integrations.countdowns || []).filter(c => c.enabled && c.name && c.targetDate);

  const isWeatherConnected = connectionStatus.weather?.connected;
  const units = integrations.weather?.units || 'metric';
  const unitSymbol = units === 'imperial' ? 'F' : 'C';

  // Always paginate through clocks - each clock can have its own weather (matched by ID)
  const totalItems = clocks.length;
  const currentClock = clocks[currentIndex] || clocks[0];
  const currentTimezone = currentClock?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentClockName = currentClock?.name || 'Clock';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch calendar events for today and tomorrow
  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;

  const fetchCalendarEvents = useCallback(async () => {
    const cals = calendarsRef.current;
    const hasAny = cals.length > 0 && cals.some(c => c.url && c.enabled);
    if (!hasAny) return;

    try {
      const allEvents = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      for (const calendar of cals) {
        if (!calendar.url || !calendar.enabled) continue;

        try {
          let calendarUrl = calendar.url.trim();
          if (calendarUrl.startsWith('webcal://')) {
            calendarUrl = calendarUrl.replace('webcal://', 'https://');
          }

          // Always use proxy for external calendar URLs (CORS)
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(calendarUrl)}`;

          const response = await fetch(proxyUrl);
          if (!response.ok) continue;

          const icalData = await response.text();
          const parsed = parseICal(icalData);

          parsed.forEach(event => {
            event.color = calendar.color || 'var(--accent-primary)';
          });

          allEvents.push(...parsed);
        } catch (err) {
          console.error(`[ClockWeather] Error fetching calendar:`, err);
        }
      }

      // Filter to today and tomorrow only, sort by time
      const filteredEvents = allEvents
        .filter(e => e.start >= today && e.start < dayAfterTomorrow)
        .sort((a, b) => a.start - b.start)
        .slice(0, 4); // Max 4 events in glance view

      setCalendarEvents(filteredEvents);
    } catch (err) {
      console.error('[ClockWeather] Calendar error:', err);
    }
  }, []); // stable - reads calendars from ref

  useEffect(() => {
    fetchCalendarEvents();
    const interval = setInterval(fetchCalendarEvents, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [calendarsKey, fetchCalendarEvents]);

  // Subscribe to weather updates
  useEffect(() => {
    if (!isWeatherConnected) {
      setWeatherData(null);
      setWeatherLocations([]);
      return;
    }

    const initial = weatherService.getWeather();
    if (initial.current) setWeatherData(initial.current);
    if (initial.locations?.length > 0) setWeatherLocations(initial.locations);

    const unsubscribe = weatherService.subscribe((data) => {
      setWeatherData(data.current);
      if (data.locations?.length > 0) setWeatherLocations(data.locations);
    });

    return () => unsubscribe();
  }, [isWeatherConnected]);

  const format24h = config?.format === '24h';

  const formatTime = (timezone) => {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !format24h,
      timeZone: timezone
    };

    try {
      const formatted = new Intl.DateTimeFormat('en-US', options).format(time);
      const parts = formatted.split(/[:\s]/);

      if (format24h) {
        return { hours: parts[0], minutes: parts[1], seconds: parts[2], period: '' };
      } else {
        return { hours: parts[0], minutes: parts[1], seconds: parts[2], period: parts[3] || '' };
      }
    } catch (e) {
      const hours = time.getHours();
      return {
        hours: (format24h ? hours : hours % 12 || 12).toString().padStart(2, '0'),
        minutes: time.getMinutes().toString().padStart(2, '0'),
        seconds: time.getSeconds().toString().padStart(2, '0'),
        period: format24h ? '' : (hours >= 12 ? 'PM' : 'AM')
      };
    }
  };

  const language = settings?.language || 'en-GB';

  const formatDate = (timezone) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone };
    try {
      return time.toLocaleDateString(language, options);
    } catch (e) {
      return time.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' });
    }
  };

  const handlePrev = () => setCurrentIndex(i => i > 0 ? i - 1 : totalItems - 1);
  const handleNext = () => setCurrentIndex(i => i < totalItems - 1 ? i + 1 : 0);

  const { hours, minutes, seconds, period } = formatTime(currentTimezone);

  // Get weather for current clock - match by clock ID or use first available
  const currentWeather = (() => {
    // Try to find weather matching this clock's ID
    const matchingLocation = weatherLocations.find(l => l.id === currentClock?.id);
    if (matchingLocation?.weather) return matchingLocation.weather;

    // Fallback: if only one weather location, use it for all clocks
    if (weatherLocations.length === 1 && weatherLocations[0]?.weather) {
      return weatherLocations[0].weather;
    }

    // Fallback: use primary weather data
    return weatherData;
  })();

  // Helper functions for calendar
  const isToday = (event) => {
    const today = new Date();
    return event.start.toDateString() === today.toDateString();
  };

  // Localized labels
  const labels = {
    allDay: { en: 'All day', it: 'Tutto il giorno', es: 'Todo el día', fr: 'Toute la journée', pt: 'O dia todo', de: 'Ganztägig', nl: 'Hele dag' },
    today: { en: 'Today', it: 'Oggi', es: 'Hoy', fr: "Aujourd'hui", pt: 'Hoje', de: 'Heute', nl: 'Vandaag' },
    tomorrow: { en: 'Tomorrow', it: 'Domani', es: 'Mañana', fr: 'Demain', pt: 'Amanhã', de: 'Morgen', nl: 'Morgen' },
    upcoming: { en: 'Upcoming', it: 'Prossimi', es: 'Próximos', fr: 'À venir', pt: 'Próximos', de: 'Anstehend', nl: 'Aankomend' },
    loadingWeather: { en: 'Loading weather for', it: 'Caricamento meteo per', es: 'Cargando clima para', fr: 'Chargement météo pour', pt: 'Carregando clima para', de: 'Wetter laden für', nl: 'Weer laden voor' },
    addCity: { en: 'Add a city to this clock for weather', it: 'Aggiungi una città a questo orologio per il meteo', es: 'Agrega una ciudad a este reloj para el clima', fr: 'Ajoutez une ville à cette horloge pour la météo', pt: 'Adicione uma cidade a este relógio para o clima', de: 'Fügen Sie diesem Uhr eine Stadt für das Wetter hinzu', nl: 'Voeg een stad toe aan deze klok voor het weer' },
    addApiKey: { en: 'Add weather API key in Setup', it: 'Aggiungi la chiave API meteo in Setup', es: 'Agrega la clave API del clima en Setup', fr: 'Ajoutez la clé API météo dans Setup', pt: 'Adicione a chave API do clima em Setup', de: 'Wetter-API-Schlüssel im Setup hinzufügen', nl: 'Voeg weer API-sleutel toe in Setup' },
    countdown: { en: 'Countdown', it: 'Conto alla rovescia', es: 'Cuenta regresiva', fr: 'Compte à rebours', pt: 'Contagem regressiva', de: 'Countdown', nl: 'Afteller' },
    days: { en: 'd', it: 'g', es: 'd', fr: 'j', pt: 'd', de: 'T', nl: 'd' },
    hours: { en: 'h', it: 'h', es: 'h', fr: 'h', pt: 'h', de: 'h', nl: 'u' },
    mins: { en: 'm', it: 'm', es: 'm', fr: 'm', pt: 'm', de: 'm', nl: 'm' },
    secs: { en: 's', it: 's', es: 's', fr: 's', pt: 's', de: 's', nl: 's' },
    todayExclaim: { en: 'Today!', it: 'Oggi!', es: '¡Hoy!', fr: "Aujourd'hui !", pt: 'Hoje!', de: 'Heute!', nl: 'Vandaag!' },
    passed: { en: 'Passed', it: 'Passato', es: 'Pasado', fr: 'Passé', pt: 'Passado', de: 'Vorbei', nl: 'Voorbij' }
  };

  const getLabel = (key) => {
    const lang = language.split('-')[0];
    return labels[key]?.[lang] || labels[key]?.en || key;
  };

  const formatEventTime = (event) => {
    if (event.allDay) return getLabel('allDay');
    return event.start.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="panel">
      <PanelHeader
        icon={ClockIcon}
        title={currentClockName}
        currentPage={currentIndex + 1}
        totalPages={totalItems}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      <div className="panel-content">
        <div className="clock-main">
          {/* Time */}
          <div className="clock-time" style={{ fontSize: 'var(--clock-size, 64px)' }}>
            {hours}:{minutes}
            <span className="clock-seconds" style={{ fontSize: 'var(--clock-seconds-size, 32px)' }}>:{seconds}</span>
            {period && (
              <span style={{ fontSize: 'calc(var(--clock-size, 64px) * 0.35)', marginLeft: '8px', color: 'var(--text-muted)' }}>
                {period}
              </span>
            )}
          </div>

          {/* Date */}
          {config?.showDate !== false && (
            <div className="clock-date" style={{ fontSize: 'var(--clock-date-size, 16px)' }}>
              {formatDate(currentTimezone)}
            </div>
          )}

          {/* Timezone indicator when multiple clocks */}
          {totalItems > 1 && currentTimezone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Globe size={12} />
              <span>{currentTimezone.replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Weather Section */}
          {currentWeather && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              {/* Location name if available */}
              {currentWeather.location && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <MapPin size={10} />
                  <span>{currentWeather.location}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                {/* Weather icon and temp */}
                <div style={{ textAlign: 'center' }}>
                  <WeatherIcon icon={currentWeather.icon} size={40} />
                  <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                    {currentWeather.temp}°{unitSymbol}
                  </div>
                </div>

                {/* Weather details */}
                <div style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div style={{ textTransform: 'capitalize', fontWeight: '500', marginBottom: '3px' }}>
                    {currentWeather.description || currentWeather.condition}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--warning)' }}>H:{currentWeather.high}°</span>
                    <span style={{ color: 'var(--accent-primary)' }}>L:{currentWeather.low}°</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Droplets size={9} />{currentWeather.humidity}%
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Wind size={9} />{currentWeather.windSpeed}{units === 'imperial' ? 'mph' : 'm/s'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Glance - Today & Tomorrow */}
          {calendarEvents.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Calendar size={10} />
                <span>{getLabel('upcoming')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {calendarEvents.map((event, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      background: 'var(--bg-card)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${event.color}`
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.summary || 'Untitled'}
                      </div>
                      <div style={{ fontSize: '9px', color: isToday(event) ? 'var(--success)' : 'var(--warning)' }}>
                        {isToday(event) ? getLabel('today') : getLabel('tomorrow')} {formatEventTime(event)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countdown Timers - Sliding Carousel */}
          {countdowns.length > 0 && (() => {
            const safeIdx = countdownIndex >= countdowns.length ? 0 : countdownIndex;
            const countdown = countdowns[safeIdx];
            const target = new Date(countdown.targetDate + 'T00:00:00');
            const now = time;
            const diffMs = target - now;
            const isPast = diffMs <= 0;
            const absDiff = Math.abs(diffMs);

            const totalSecs = Math.floor(absDiff / 1000);
            const d = Math.floor(totalSecs / 86400);
            const h = Math.floor((totalSecs % 86400) / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;

            let statusColor;
            if (isPast) {
              statusColor = 'var(--text-muted)';
            } else if (d === 0 && h === 0) {
              statusColor = 'var(--success)';
            } else if (d <= 7) {
              statusColor = 'var(--warning)';
            } else {
              statusColor = 'var(--accent-primary)';
            }

            const timerBlockStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '36px' };
            const timerNumStyle = { fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-display)', color: isPast ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 };
            const timerLabelStyle = { fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '3px' };
            const separatorStyle = { fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--text-muted)', opacity: 0.4, alignSelf: 'flex-start', lineHeight: 1 };

            return (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                {/* Header with nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Timer size={10} />
                  <span>{getLabel('countdown')}</span>
                  {countdowns.length > 1 && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setCountdownIndex(i => i > 0 ? i - 1 : countdowns.length - 1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '12px', lineHeight: 1 }}
                      >‹</button>
                      <span style={{ fontSize: '9px', fontVariantNumeric: 'tabular-nums' }}>{safeIdx + 1}/{countdowns.length}</span>
                      <button
                        onClick={() => setCountdownIndex(i => i < countdowns.length - 1 ? i + 1 : 0)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '12px', lineHeight: 1 }}
                      >›</button>
                    </span>
                  )}
                </div>

                {/* Single countdown card */}
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${statusColor}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {countdown.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {target.toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {isPast ? (
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                      {getLabel('passed')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '6px' }}>
                      {d > 0 && (
                        <>
                          <div style={timerBlockStyle}>
                            <span style={timerNumStyle}>{d}</span>
                            <span style={timerLabelStyle}>{getLabel('days')}</span>
                          </div>
                          <span style={separatorStyle}>:</span>
                        </>
                      )}
                      <div style={timerBlockStyle}>
                        <span style={timerNumStyle}>{String(h).padStart(2, '0')}</span>
                        <span style={timerLabelStyle}>{getLabel('hours')}</span>
                      </div>
                      <span style={separatorStyle}>:</span>
                      <div style={timerBlockStyle}>
                        <span style={timerNumStyle}>{String(m).padStart(2, '0')}</span>
                        <span style={timerLabelStyle}>{getLabel('mins')}</span>
                      </div>
                      <span style={separatorStyle}>:</span>
                      <div style={timerBlockStyle}>
                        <span style={timerNumStyle}>{String(s).padStart(2, '0')}</span>
                        <span style={timerLabelStyle}>{getLabel('secs')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dots indicator */}
                {countdowns.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
                    {countdowns.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCountdownIndex(i)}
                        style={{
                          width: i === safeIdx ? '16px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: i === safeIdx ? statusColor : 'var(--border-color)',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* No weather for this clock */}
          {!currentWeather && isWeatherConnected && currentClock?.city && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {getLabel('loadingWeather')} {currentClock.city}...
            </div>
          )}

          {/* No weather configured hint */}
          {!currentWeather && !hasCalendars && (
            <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {integrations.weather?.apiKey
                ? (currentClock?.city ? '' : getLabel('addCity'))
                : getLabel('addApiKey')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
