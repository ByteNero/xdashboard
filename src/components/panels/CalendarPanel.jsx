import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelHeader from './PanelHeader';

const ITEMS_PER_PAGE = 5;

// Parse iCal format
function parseICal(icalData) {
  const events = [];
  const lines = icalData.replace(/\r\n /g, '').replace(/\r/g, '\n').split('\n');

  let currentEvent = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.start) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        let key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);

        // Handle parameters like DTSTART;VALUE=DATE:20240101
        const semicolonIndex = key.indexOf(';');
        if (semicolonIndex > -1) {
          key = key.substring(0, semicolonIndex);
        }

        switch (key) {
          case 'SUMMARY':
            currentEvent.summary = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
            break;
          case 'DTSTART':
            currentEvent.start = parseICalDate(value);
            currentEvent.allDay = value.length === 8;
            break;
          case 'DTEND':
            currentEvent.end = parseICalDate(value);
            break;
          case 'LOCATION':
            currentEvent.location = value.replace(/\\,/g, ',');
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
            break;
          case 'UID':
            currentEvent.id = value;
            break;
        }
      }
    }
  }

  return events;
}

function parseICalDate(dateStr) {
  // Format: 20240115 or 20240115T103000 or 20240115T103000Z
  if (dateStr.length === 8) {
    // All day event
    return new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8))
    );
  }

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(9, 11)) || 0;
  const minute = parseInt(dateStr.substring(11, 13)) || 0;
  const second = parseInt(dateStr.substring(13, 15)) || 0;

  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  return new Date(year, month, day, hour, minute, second);
}

export default function CalendarPanel({ config }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const { integrations } = useDashboardStore();

  const calendars = integrations.calendars || [];
  const isConfigured = calendars.length > 0 && calendars.some(c => c.url);
  const { settings } = useDashboardStore();
  const language = settings?.language || 'en-GB';

  // Localized labels
  const labels = {
    allDay: { en: 'All day', it: 'Tutto il giorno', es: 'Todo el día', fr: 'Toute la journée', pt: 'O dia todo', de: 'Ganztägig', nl: 'Hele dag' },
    today: { en: 'Today', it: 'Oggi', es: 'Hoy', fr: "Aujourd'hui", pt: 'Hoje', de: 'Heute', nl: 'Vandaag' },
    tomorrow: { en: 'Tomorrow', it: 'Domani', es: 'Mañana', fr: 'Demain', pt: 'Amanhã', de: 'Morgen', nl: 'Morgen' },
    noEvents: { en: 'No events this week', it: 'Nessun evento questa settimana', es: 'Sin eventos esta semana', fr: 'Aucun événement cette semaine', pt: 'Sem eventos esta semana', de: 'Keine Termine diese Woche', nl: 'Geen evenementen deze week' },
    loading: { en: 'Loading events...', it: 'Caricamento eventi...', es: 'Cargando eventos...', fr: 'Chargement des événements...', pt: 'Carregando eventos...', de: 'Termine laden...', nl: 'Evenementen laden...' },
    configure: { en: 'Configure calendars in Setup to display events', it: 'Configura i calendari in Setup per visualizzare gli eventi', es: 'Configura calendarios en Setup para mostrar eventos', fr: 'Configurez les calendriers dans Setup pour afficher les événements', pt: 'Configure calendários em Setup para exibir eventos', de: 'Konfigurieren Sie Kalender im Setup, um Termine anzuzeigen', nl: 'Configureer agenda\'s in Setup om evenementen weer te geven' },
    addCalendars: { en: 'Add calendars in Setup', it: 'Aggiungi calendari in Setup', es: 'Agregar calendarios en Setup', fr: 'Ajouter des calendriers dans Setup', pt: 'Adicionar calendários em Setup', de: 'Kalender in Setup hinzufügen', nl: 'Agenda\'s toevoegen in Setup' },
    notConnected: { en: 'NOT CONNECTED', it: 'NON CONNESSO', es: 'NO CONECTADO', fr: 'NON CONNECTÉ', pt: 'NÃO CONECTADO', de: 'NICHT VERBUNDEN', nl: 'NIET VERBONDEN' },
    calendar: { en: 'Calendar', it: 'Calendario', es: 'Calendario', fr: 'Calendrier', pt: 'Calendário', de: 'Kalender', nl: 'Agenda' }
  };

  const getLabel = (key) => {
    const lang = language.split('-')[0];
    return labels[key]?.[lang] || labels[key]?.en || key;
  };

  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const paginatedEvents = events.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const fetchEvents = useCallback(async () => {
    if (!isConfigured) return;

    setLoading(true);
    setError(null);

    try {
      const allEvents = [];

      for (const calendar of calendars) {
        if (!calendar.url || !calendar.enabled) continue;

        try {
          // Convert webcal:// to https:// (Apple Calendar uses webcal protocol)
          let calendarUrl = calendar.url.trim();
          if (calendarUrl.startsWith('webcal://')) {
            calendarUrl = calendarUrl.replace('webcal://', 'https://');
          }

          // Always use proxy for external calendar URLs (CORS)
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(calendarUrl)}`;

          const response = await fetch(proxyUrl);
          if (!response.ok) {
            console.error(`[Calendar] Failed to fetch ${calendar.name}: HTTP ${response.status}`);
            continue;
          }

          const icalData = await response.text();
          const parsed = parseICal(icalData);

          // Add calendar color to events
          parsed.forEach(event => {
            event.color = calendar.color || 'var(--accent-primary)';
            event.calendarName = calendar.name;
          });

          allEvents.push(...parsed);
        } catch (err) {
          console.error(`[Calendar] Error fetching ${calendar.name}:`, err);
        }
      }

      // Filter to current week and sort
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const filteredEvents = allEvents
        .filter(e => e.start >= startOfWeek && e.start < endOfWeek)
        .sort((a, b) => a.start - b.start);

      setEvents(filteredEvents);
    } catch (err) {
      console.error('[Calendar] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [calendars, currentDate, isConfigured]);

  useEffect(() => {
    fetchEvents();
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const formatEventTime = (event) => {
    if (event.allDay) return getLabel('allDay');
    return event.start.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
  };

  const formatEventDate = (event) => {
    return event.start.toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isToday = (event) => {
    const today = new Date();
    return event.start.toDateString() === today.toDateString();
  };

  const isTomorrow = (event) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return event.start.toDateString() === tomorrow.toDateString();
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
    setCurrentPage(0); // Reset page when changing week
  };

  const handlePrevPage = () => setCurrentPage(p => p > 0 ? p - 1 : totalPages - 1);
  const handleNextPage = () => setCurrentPage(p => p < totalPages - 1 ? p + 1 : 0);

  const getWeekLabel = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startMonth = startOfWeek.toLocaleDateString(language, { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString(language, { month: 'short' });
    const startDay = startOfWeek.getDate();
    const endDay = endOfWeek.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  if (!isConfigured) {
    return (
      <div className="panel">
        <PanelHeader
          icon={Calendar}
          title={getLabel('calendar')}
          badge={
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px' }}>
              {getLabel('notConnected')}
            </span>
          }
        />
        <div className="panel-content">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '14px' }}>
            {getLabel('addCalendars')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <PanelHeader
        icon={Calendar}
        title={getLabel('calendar')}
        currentPage={currentPage + 1}
        totalPages={totalPages}
        onPrev={handlePrevPage}
        onNext={handleNextPage}
        onRefresh={fetchEvents}
      >
        {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      </PanelHeader>
      <div className="panel-content">
        {/* Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px', padding: '6px', background: 'var(--bg-card)', borderRadius: '6px' }}>
          <button
            onClick={() => navigateWeek(-1)}
            style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ‹
          </button>
          <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)', minWidth: '100px', textAlign: 'center' }}>
            {getWeekLabel()}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ›
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px', marginBottom: '12px', fontSize: '11px', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Events List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paginatedEvents.length > 0 ? (
            paginatedEvents.map((event, i) => (
              <div
                key={event.id || i}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${event.color}`
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.summary || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '10px', color: isToday(event) ? 'var(--success)' : isTomorrow(event) ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {isToday(event) ? getLabel('today') : isTomorrow(event) ? getLabel('tomorrow') : formatEventDate(event)} {formatEventTime(event)}
                      </span>
                    </div>
                    {event.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                          {event.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : !loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '13px' }}>
              {getLabel('noEvents')}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
