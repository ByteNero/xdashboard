import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Play, AlertTriangle, Lightbulb, Globe, Tv } from 'lucide-react';
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
  'bottom-left':    { bottom: '48px', left: '48px' },
  'bottom-right':   { bottom: '48px', right: '48px', textAlign: 'right', alignItems: 'flex-end' },
  'top-left':       { top: '48px', left: '48px' },
  'top-right':      { top: '48px', right: '48px', textAlign: 'right', alignItems: 'flex-end' },
  'center-bottom':  { bottom: '48px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', alignItems: 'center' },
};

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
  const [bgLoaded, setBgLoaded] = useState(false);
  const idleTimerRef = useRef(null);
  const isStandbyRef = useRef(false);

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
      console.log('[Standby] Idle timeout reached, activating standby');
      isStandbyRef.current = true;
      setIsStandby(true);
    }, idleMsRef.current);
  }, []);

  const handleInteraction = useCallback(() => {
    if (isStandbyRef.current) {
      console.log('[Standby] Interaction detected, waking up');
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

    console.log(`[Standby] Enabled, idle timeout: ${idleMsRef.current / 1000}s`);
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

  // ── Reset overlay data on standby enter (prevents stale data flash) ──
  useEffect(() => {
    if (isStandby) {
      setTautulliData(null);
      setWeatherData(null);
      setMonitors([]);
      setLightsOn(0);
      setLightsTotal(0);
      setSonarrData(null);
    }
  }, [isStandby]);

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
    .slice(0, 5);

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

        {/* ── Clock ── */}
        {standbyOverlays.clock && (
          <div className="standby-clock">
            {time.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        )}

        {/* ── Date ── */}
        {standbyOverlays.date && (
          <div className="standby-date">
            {time.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}

        {/* ── Weather ── */}
        {standbyOverlays.weather && currentWeather && (
          <div className="standby-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ flexShrink: 0 }}>
                <WeatherIcon icon={currentWeather.icon} size={42} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                  {Math.round(currentWeather.temp)}°
                </div>
                <div className="standby-truncate" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                  {currentWeather.description}
                </div>
              </div>
              {(currentWeather.high != null || currentWeather.low != null) && (
                <div style={{ flexShrink: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {currentWeather.high != null && <span>↑{Math.round(currentWeather.high)}°</span>}
                  {' '}
                  {currentWeather.low != null && <span>↓{Math.round(currentWeather.low)}°</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lights On ── */}
        {standbyOverlays.lights && homeAssistant.isConnected() && (
          <div className="standby-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={16} style={{ color: lightsOn > 0 ? '#facc15' : 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                {lightsOn > 0 ? (
                  <><span style={{ color: '#facc15', fontWeight: '600' }}>{lightsOn}</span> light{lightsOn !== 1 ? 's' : ''} on</>
                ) : (
                  'All lights off'
                )}
              </span>
              {lightsTotal > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {lightsOn}/{lightsTotal}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Services Down ── */}
        {standbyOverlays.services && uptimeKuma.isConnected() && (
          <div className="standby-card">
            {downServices.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {downServices.length <= 3
                      ? `${downServices.length} service${downServices.length !== 1 ? 's' : ''} down`
                      : `${3}+ services down`
                    }
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
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  All {monitors.length} services up
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Countdowns ── */}
        {standbyOverlays.countdowns && countdowns.length > 0 && (
          <div className="standby-card" style={{ padding: '8px 12px' }}>
            {countdowns.slice(0, 3).map(cd => (
              <CountdownItem key={cd.id} countdown={cd} now={time} />
            ))}
          </div>
        )}

        {/* ── Tautulli Activity ── */}
        {standbyOverlays.tautulliActivity && streamCount > 0 && (
          <div className="standby-card">
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
        )}
        {standbyOverlays.tautulliActivity && streamCount === 0 && tautulli.isConnected() && (
          <div className="standby-card">
            <div className="standby-tautulli-header" style={{ opacity: 0.4, marginBottom: 0 }}>
              <Users size={12} />
              <span>Nothing playing</span>
            </div>
          </div>
        )}

        {/* ── Extra / World Clocks ── */}
        {standbyOverlays.extraClocks && extraClocks.length > 0 && (() => {
          const clocks = extraClocks.slice(0, 3);
          return (
            <div className="standby-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  World Clocks
                </span>
                {extraClocks.length > 3 && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                    +{extraClocks.length - 3} more
                  </span>
                )}
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
        })()}

        {/* ── TV Calendar (favorites only) ── */}
        {standbyOverlays.tvCalendar && sonarr.connected && tvEpisodes.length > 0 && (
          <div className="standby-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Tv size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Upcoming
              </span>
              {tvEpisodes.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                  {tvEpisodes.length} ep{tvEpisodes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {tvEpisodes.map(ep => {
              const airDate = new Date(ep.airDateUtc);
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const tomorrowStart = new Date(todayStart);
              tomorrowStart.setDate(tomorrowStart.getDate() + 1);
              const epDay = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());

              let dayLabel;
              if (epDay.getTime() === todayStart.getTime()) dayLabel = 'Today';
              else if (epDay.getTime() === tomorrowStart.getTime()) dayLabel = 'Tomorrow';
              else {
                const diff = Math.floor((epDay - todayStart) / 86400000);
                dayLabel = diff <= 7
                  ? airDate.toLocaleDateString(language, { weekday: 'short' })
                  : airDate.toLocaleDateString(language, { month: 'short', day: 'numeric' });
              }

              const timeLabel = airDate.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });

              return (
                <div key={ep.id} style={{ padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span className="standby-truncate" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                    {ep.seriesTitle}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontFamily: 'var(--font-mono, monospace)' }}>
                    S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--accent-primary)', flexShrink: 0, fontWeight: 600 }}>
                    {dayLabel} {timeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {standbyOverlays.tvCalendar && sonarr.connected && tvEpisodes.length === 0 && favoriteIds.size > 0 && (
          <div className="standby-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.4 }}>
              <Tv size={12} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>No upcoming episodes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
