import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Play, AlertTriangle, Lightbulb, Globe, Tv, Power, Calendar } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { tautulli, homeAssistant, uptimeKuma, weather, sonarr } from '../services';
import { WeatherIcon } from '../utils/weatherIcons.jsx';

// ── Constants ──

const GRADIENT_PRESETS = {
  'gradient-1': 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #0d0d2b 100%)',
  'gradient-2': 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0a1628 100%)',
  'gradient-3': 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)',
};

const INTERACTION_EVENTS = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'];

const POSITION_STYLES = {
  'bottom-left':    { bottom: '32px', left: '32px' },
  'top-left':       { top: '32px', left: '32px' },
  'center-bottom':  { bottom: '32px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', alignItems: 'center' },
};

// ── iCal helpers ──

function parseICalDate(dateStr) {
  if (dateStr.length === 8) {
    return new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
  }
  const y = parseInt(dateStr.substring(0, 4)), mo = parseInt(dateStr.substring(4, 6)) - 1, d = parseInt(dateStr.substring(6, 8));
  const h = parseInt(dateStr.substring(9, 11)) || 0, mi = parseInt(dateStr.substring(11, 13)) || 0, s = parseInt(dateStr.substring(13, 15)) || 0;
  return dateStr.endsWith('Z') ? new Date(Date.UTC(y, mo, d, h, mi, s)) : new Date(y, mo, d, h, mi, s);
}

function parseICal(icalData) {
  const events = [];
  const lines = icalData.replace(/\r\n /g, '').replace(/\r/g, '\n').split('\n');
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT' && cur) { if (cur.start) events.push(cur); cur = null; }
    else if (cur) {
      const ci = line.indexOf(':');
      if (ci > -1) {
        let key = line.substring(0, ci); const val = line.substring(ci + 1);
        const si = key.indexOf(';'); if (si > -1) key = key.substring(0, si);
        if (key === 'SUMMARY') cur.summary = val.replace(/\\,/g, ',').replace(/\\n/g, '\n');
        else if (key === 'DTSTART') { cur.start = parseICalDate(val); cur.allDay = val.length === 8; }
        else if (key === 'DTEND') cur.end = parseICalDate(val);
        else if (key === 'UID') cur.id = val;
      }
    }
  }
  return events;
}

// ── Sub-components ──

function CountdownItem({ countdown, now }) {
  const target = new Date(countdown.targetDate + 'T00:00:00');
  const diffMs = target - now;
  const isPast = diffMs <= 0;
  const absDiff = Math.abs(diffMs);
  const totalSecs = Math.floor(absDiff / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const timeStr = isPast
    ? 'Passed'
    : d > 0
      ? `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="standby-card-row">
      <span className="standby-card-label">{countdown.name}</span>
      <span className="standby-card-value" style={{ color: isPast ? 'rgba(255,255,255,0.3)' : 'var(--accent-primary)' }}>
        {timeStr}
      </span>
    </div>
  );
}

// ── Main Component ──

export default function StandbyOverlay() {
  const { settings, integrations } = useDashboardStore();
  const [isStandby, setIsStandby] = useState(false);
  const [time, setTime] = useState(new Date());
  const [tautulliData, setTautulliData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [lightsOn, setLightsOn] = useState(0);
  const [lightsTotal, setLightsTotal] = useState(0);
  const [sonarrData, setSonarrData] = useState(null);
  const [quickActionStates, setQuickActionStates] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 720);
  const idleTimerRef = useRef(null);
  const isStandbyRef = useRef(false);
  const quickActionsRef = useRef(null);

  const {
    standbyEnabled = false,
    standbyIdleMinutes = 300,
    standbyBackgroundUrl = '',
    standbyBackgroundPreset = 'none',
    standbyOverlays = {},
    standbyOverlayPosition = 'bottom-left',
    standbyDimOpacity = 0.4,
    standbyStreamDetails = true,
    language = 'en-GB'
  } = settings || {};

  // Keep ref in sync with state
  useEffect(() => {
    isStandbyRef.current = isStandby;
  }, [isStandby]);

  // ── Idle detection (using refs for stable callbacks) ──
  const idleMsRef = useRef((standbyIdleMinutes || 300) * 60 * 1000);
  useEffect(() => {
    idleMsRef.current = (standbyIdleMinutes || 300) * 60 * 1000;
  }, [standbyIdleMinutes]);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isStandbyRef.current = true;
      setIsStandby(true);
    }, idleMsRef.current);
  }, []);

  const handleInteraction = useCallback((event) => {
    // Don't wake standby if interacting with quick action buttons
    if (quickActionsRef.current && event?.target && quickActionsRef.current.contains(event.target)) {
      return;
    }
    if (isStandbyRef.current) {
      isStandbyRef.current = false;
      setIsStandby(false);
    }
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    if (!standbyEnabled) {
      setIsStandby(false);
      isStandbyRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    INTERACTION_EVENTS.forEach(evt => {
      document.addEventListener(evt, handleInteraction, { passive: true });
    });
    startIdleTimer();

    return () => {
      INTERACTION_EVENTS.forEach(evt => {
        document.removeEventListener(evt, handleInteraction);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [standbyEnabled, handleInteraction, startIdleTimer]);

  // Restart timer when idle minutes changes
  useEffect(() => {
    if (standbyEnabled && !isStandbyRef.current) {
      startIdleTimer();
    }
  }, [standbyIdleMinutes, standbyEnabled, startIdleTimer]);

  // ── Track viewport height for card limits ──
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Reset overlay data on standby enter (prevents stale data flash) ──
  useEffect(() => {
    if (isStandby) {
      setTautulliData(null);
      setWeatherData(null);
      setMonitors([]);
      setLightsOn(0);
      setLightsTotal(0);
      setSonarrData(null);
      setQuickActionStates({});
    }
  }, [isStandby]);

  // ── Quick Actions — poll HA entity states ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.quickActions) return;
    const actions = (settings.standbyQuickActions || []).slice(0, 3);
    if (!actions.length || !homeAssistant.isConnected()) return;

    const updateStates = () => {
      const entities = homeAssistant.entities || {};
      const states = {};
      actions.forEach(entityId => {
        const entity = entities[entityId];
        if (entity) {
          states[entityId] = {
            state: entity.state,
            name: entity.attributes?.friendly_name || entityId.split('.').pop().replace(/_/g, ' '),
            domain: entityId.split('.')[0]
          };
        }
      });
      setQuickActionStates(states);
    };

    updateStates();
    const interval = setInterval(updateStates, 2000);
    return () => clearInterval(interval);
  }, [isStandby, standbyOverlays.quickActions, settings.standbyQuickActions]);

  // ── Clock tick (only when standby active) ──
  useEffect(() => {
    if (!isStandby) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isStandby]);

  // ── Tautulli subscription ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.tautulliActivity) return;
    if (!tautulli.isConnected()) { setTautulliData(null); return; }
    const unsub = tautulli.subscribe(data => setTautulliData(data));
    return () => unsub();
  }, [isStandby, standbyOverlays.tautulliActivity]);

  // ── Weather subscription ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.weather) return;
    if (!weather.isConnected()) { setWeatherData(null); return; }
    const unsub = weather.subscribe(data => setWeatherData(data));
    return () => unsub();
  }, [isStandby, standbyOverlays.weather]);

  // ── Uptime Kuma subscription ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.services) return;
    if (!uptimeKuma.isConnected()) { setMonitors([]); return; }
    const unsub = uptimeKuma.subscribe(data => setMonitors(data || []));
    return () => unsub();
  }, [isStandby, standbyOverlays.services]);

  // ── Home Assistant lights polling ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.lights) return;
    if (!homeAssistant.isConnected()) { setLightsOn(0); setLightsTotal(0); return; }

    const updateLights = () => {
      const entities = homeAssistant.entities || {};
      // Filter to actual light entities, excluding groups and unavailable
      const lights = Object.values(entities).filter(e => {
        if (!e.entity_id?.startsWith('light.')) return false;
        // Skip light groups — they have an entity_id array attribute listing children
        if (e.attributes?.entity_id && Array.isArray(e.attributes.entity_id)) return false;
        // Skip unavailable/unknown entities
        if (e.state === 'unavailable' || e.state === 'unknown') return false;
        return true;
      });
      setLightsTotal(lights.length);
      setLightsOn(lights.filter(e => e.state === 'on').length);
    };

    updateLights();
    const interval = setInterval(updateLights, 5000);
    return () => clearInterval(interval);
  }, [isStandby, standbyOverlays.lights]);

  // ── Sonarr TV Calendar subscription ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.tvCalendar) return;
    if (!sonarr.connected) { setSonarrData(null); return; }
    const unsub = sonarr.subscribe(data => setSonarrData(data));
    return () => unsub();
  }, [isStandby, standbyOverlays.tvCalendar]);

  // ── iCal/Google Calendar fetch ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.calendar) { setCalendarEvents([]); return; }
    const calendars = (integrations?.calendars || []).filter(c => c.enabled && c.url);
    if (!calendars.length) { setCalendarEvents([]); return; }

    const fetchCalendars = async () => {
      const allEvents = [];
      const now = new Date();
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);

      for (const cal of calendars) {
        try {
          let url = cal.url.trim();
          if (url.startsWith('webcal://')) url = url.replace('webcal://', 'https://');
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) continue;
          const data = await res.text();
          const parsed = parseICal(data);
          parsed.forEach(ev => { ev.color = cal.color || 'var(--accent-primary)'; ev.calendarName = cal.name; });
          allEvents.push(...parsed);
        } catch { /* skip failed calendar */ }
      }

      const filtered = allEvents
        .filter(e => e.start >= now && e.start < weekEnd)
        .sort((a, b) => a.start - b.start);
      setCalendarEvents(filtered);
    };

    fetchCalendars();
    const interval = setInterval(fetchCalendars, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isStandby, standbyOverlays.calendar, integrations?.calendars]);

  // ── Preload background image (with race condition guard) ──
  useEffect(() => {
    if (!standbyBackgroundUrl) { setBgLoaded(false); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setBgLoaded(true); };
    img.onerror = () => { if (!cancelled) setBgLoaded(false); };
    img.src = standbyBackgroundUrl;
    setBgLoaded(false);
    return () => { cancelled = true; };
  }, [standbyBackgroundUrl]);

  // ── Don't render if not enabled or not in standby ──
  if (!standbyEnabled || !isStandby) return null;

  // ── Data ──
  const countdowns = (integrations?.countdowns || []).filter(c => c.enabled && c.name && c.targetDate);
  const extraClocks = (integrations?.clocks || []).filter(c => c.enabled && c.timezone);
  const streams = tautulliData?.activity?.streams || [];
  const streamCount = tautulliData?.activity?.streamCount || 0;
  const currentWeather = weatherData?.current;
  const downServices = monitors.filter(m => m.status === 'down');

  // TV Calendar — upcoming episodes for favorited series only
  const favoriteSeries = integrations?.favoriteSeries || [];
  const favoriteIds = new Set(favoriteSeries.map(f => f.id));
  const now = new Date();
  const tvEpisodes = (sonarrData?.calendar || [])
    .filter(ep => favoriteIds.has(ep.seriesId) && new Date(ep.airDateUtc) >= now)
    .slice(0, 3);

  // ── Determine if quick actions are active (buttons visible bottom-right) ──
  const quickActionsActive = standbyOverlays.quickActions && (settings.standbyQuickActions || []).length > 0 && Object.keys(quickActionStates).length > 0;

  // ── Card limit based on viewport height ──
  const maxCards = viewportHeight >= 720 ? 6 : viewportHeight >= 550 ? 4 : 3;

  // ── Build prioritised card list (clock + date are not cards) ──
  const cards = [];

  if (standbyOverlays.weather && currentWeather) {
    cards.push(
      <div key="weather" className="standby-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ flexShrink: 0 }}><WeatherIcon icon={currentWeather.icon} size={42} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{Math.round(currentWeather.temp)}°</div>
            <div className="standby-truncate" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{currentWeather.description}</div>
          </div>
          {(currentWeather.high != null || currentWeather.low != null) && (
            <div style={{ flexShrink: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, monospace)' }}>
              {currentWeather.high != null && <span>↑{Math.round(currentWeather.high)}°</span>}{' '}
              {currentWeather.low != null && <span>↓{Math.round(currentWeather.low)}°</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lights card — skip from main list if quick actions are active (shown above buttons instead)
  if (standbyOverlays.lights && homeAssistant.isConnected() && !quickActionsActive) {
    cards.push(
      <div key="lights" className="standby-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} style={{ color: lightsOn > 0 ? '#facc15' : 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            {lightsOn > 0 ? <><span style={{ color: '#facc15', fontWeight: '600' }}>{lightsOn}</span> light{lightsOn !== 1 ? 's' : ''} on</> : 'All lights off'}
          </span>
          {lightsTotal > 0 && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>{lightsOn}/{lightsTotal}</span>}
        </div>
      </div>
    );
  }

  if (standbyOverlays.services && uptimeKuma.isConnected()) {
    cards.push(
      <div key="services" className="standby-card">
        {downServices.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {downServices.length <= 3 ? `${downServices.length} service${downServices.length !== 1 ? 's' : ''} down` : '3+ services down'}
              </span>
            </div>
            {downServices.slice(0, 3).map((svc, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span className="standby-truncate">{svc.name}</span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>All {monitors.length} services up</span>
          </div>
        )}
      </div>
    );
  }

  if (standbyOverlays.countdowns && countdowns.length > 0) {
    cards.push(
      <div key="countdowns" className="standby-card" style={{ padding: '8px 12px' }}>
        {countdowns.slice(0, 3).map(cd => <CountdownItem key={cd.id} countdown={cd} now={time} />)}
      </div>
    );
  }

  if (standbyOverlays.tautulliActivity) {
    if (streamCount > 0) {
      cards.push(
        <div key="tautulli" className="standby-card">
          <div className="standby-tautulli-header" style={{ marginBottom: standbyStreamDetails ? '6px' : 0 }}>
            <Play size={12} style={{ fill: 'var(--accent-primary)', color: 'var(--accent-primary)' }} />
            <span>{streamCount} streaming</span>
          </div>
          {standbyStreamDetails && streams.slice(0, 3).map((s, i) => (
            <div key={i} className="standby-tautulli-stream">
              <span className="standby-tautulli-user">{s.user}</span>
              <span className="standby-tautulli-title">{s.grandparentTitle ? `${s.grandparentTitle} - ${s.title}` : s.title}</span>
            </div>
          ))}
        </div>
      );
    } else if (tautulli.isConnected()) {
      cards.push(
        <div key="tautulli-idle" className="standby-card">
          <div className="standby-tautulli-header" style={{ opacity: 0.4, marginBottom: 0 }}>
            <Users size={12} /><span>Nothing playing</span>
          </div>
        </div>
      );
    }
  }

  if (standbyOverlays.extraClocks && extraClocks.length > 0) {
    const clocks = extraClocks.slice(0, 3);
    cards.push(
      <div key="clocks" className="standby-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Globe size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>World Clocks</span>
          {extraClocks.length > 3 && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>+{extraClocks.length - 3} more</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${clocks.length}, 1fr)`, gap: '8px' }}>
          {clocks.map(clock => (
            <div key={clock.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{clock.name}</span>
              <span style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono, monospace)' }}>
                {time.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: clock.timezone })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (standbyOverlays.tvCalendar && sonarr.connected) {
    if (tvEpisodes.length > 0) {
      cards.push(
        <div key="tv" className="standby-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Tv size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Upcoming</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{tvEpisodes.length} ep{tvEpisodes.length !== 1 ? 's' : ''}</span>
          </div>
          {tvEpisodes.map(ep => {
            const airDate = new Date(ep.airDateUtc);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const epDay = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());
            let dayLabel;
            if (epDay.getTime() === todayStart.getTime()) dayLabel = 'Today';
            else if (epDay.getTime() === tomorrowStart.getTime()) dayLabel = 'Tomorrow';
            else { const diff = Math.floor((epDay - todayStart) / 86400000); dayLabel = diff <= 7 ? airDate.toLocaleDateString(language, { weekday: 'short' }) : airDate.toLocaleDateString(language, { month: 'short', day: 'numeric' }); }
            const timeLabel = airDate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
              <div key={ep.id} style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span className="standby-truncate" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{ep.seriesTitle}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontFamily: 'var(--font-mono, monospace)' }}>S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}</span>
                <span style={{ fontSize: '10px', color: 'var(--accent-primary)', flexShrink: 0, fontWeight: 600 }}>{dayLabel} {timeLabel}</span>
              </div>
            );
          })}
        </div>
      );
    } else if (favoriteIds.size > 0) {
      cards.push(
        <div key="tv-idle" className="standby-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.4 }}>
            <Tv size={12} /><span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No upcoming episodes</span>
          </div>
        </div>
      );
    }
  }

  // ── Slice cards to fit viewport ──
  const visibleCards = cards.slice(0, maxCards);

  // ── Background style ──
  const backgroundStyle = (standbyBackgroundUrl && bgLoaded)
    ? { backgroundImage: `url(${standbyBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : standbyBackgroundPreset !== 'none' && GRADIENT_PRESETS[standbyBackgroundPreset]
      ? { background: GRADIENT_PRESETS[standbyBackgroundPreset] }
      : { background: '#000' };

  const posStyle = POSITION_STYLES[standbyOverlayPosition] || POSITION_STYLES['bottom-left'];

  return (
    <div className="standby-overlay active" style={backgroundStyle}>
      {/* Dim layer */}
      <div className="standby-dim" style={{ opacity: standbyDimOpacity }} />

      {/* Info overlays */}
      <div className="standby-info" style={{ position: 'absolute', ...posStyle }}>
        {standbyOverlays.clock && (
          <div className="standby-clock">
            {time.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        )}
        {standbyOverlays.date && (
          <div className="standby-date">
            {time.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
        {visibleCards}
      </div>

      {/* ── iCal/Google Calendar — fixed top-right ── */}
      {standbyOverlays.calendar && calendarEvents.length > 0 && (
        <div style={{
          position: 'absolute', top: '32px', right: '32px', zIndex: 2,
          width: '320px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div className="standby-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Calendar size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Calendar</span>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''}</span>
            </div>
            {calendarEvents.slice(0, 5).map((ev, i) => {
              const evDate = new Date(ev.start);
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
              const evDay = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate());
              let dayLabel;
              if (evDay.getTime() === todayStart.getTime()) dayLabel = 'Today';
              else if (evDay.getTime() === tomorrowStart.getTime()) dayLabel = 'Tomorrow';
              else dayLabel = evDate.toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' });
              const timeLabel = ev.allDay ? 'All day' : evDate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });
              return (
                <div key={ev.id || i} style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ width: '3px', height: '14px', borderRadius: '2px', background: ev.color || 'var(--accent-primary)', flexShrink: 0 }} />
                  <span className="standby-truncate" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{ev.summary}</span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-primary)', flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>{dayLabel} {timeLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Action Buttons — always bottom-right ── */}
      {quickActionsActive && (
        <div ref={quickActionsRef} style={{
          position: 'absolute', bottom: '32px', right: '32px', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
        }}>
          {/* Lights count above buttons when lights overlay is enabled */}
          {standbyOverlays.lights && homeAssistant.isConnected() && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <Lightbulb size={14} style={{ color: lightsOn > 0 ? '#facc15' : 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {lightsOn > 0 ? <><span style={{ color: '#facc15', fontWeight: '600' }}>{lightsOn}</span>/{lightsTotal}</> : 'All off'}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
          {(settings.standbyQuickActions || []).slice(0, 3).map(entityId => {
            const entity = quickActionStates[entityId];
            if (!entity) return null;
            const isOn = entity.state === 'on';
            const isLight = entity.domain === 'light';
            const activeColor = isLight ? '#facc15' : 'var(--accent-primary)';

            return (
              <div key={entityId} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    homeAssistant.toggle(entityId);
                  }}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    border: `2px solid ${isOn ? activeColor : 'rgba(255,255,255,0.15)'}`,
                    background: isOn ? `${activeColor}20` : 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease', padding: 0
                  }}
                  title={entity.name}
                >
                  {isLight ? (
                    <Lightbulb size={28} style={{ color: isOn ? activeColor : 'rgba(255,255,255,0.4)' }} />
                  ) : (
                    <Power size={28} style={{ color: isOn ? activeColor : 'rgba(255,255,255,0.4)' }} />
                  )}
                </button>
                <span style={{
                  fontSize: '10px', color: isOn ? activeColor : 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600',
                  maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                  {entity.name}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
