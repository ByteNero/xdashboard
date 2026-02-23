import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Play } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { tautulli } from '../services';

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

function CountdownItem({ countdown, now, language }) {
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
    <div className="standby-countdown-item">
      <span className="standby-countdown-name">{countdown.name}</span>
      <span className="standby-countdown-time" style={{ color: isPast ? 'rgba(255,255,255,0.3)' : 'var(--accent-primary)' }}>
        {timeStr}
      </span>
    </div>
  );
}

export default function StandbyOverlay() {
  const { settings, integrations } = useDashboardStore();
  const [isStandby, setIsStandby] = useState(false);
  const [time, setTime] = useState(new Date());
  const [tautulliData, setTautulliData] = useState(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const idleTimerRef = useRef(null);

  const {
    standbyEnabled = false,
    standbyIdleMinutes = 300,
    standbyBackgroundUrl = '',
    standbyBackgroundPreset = 'none',
    standbyOverlays = {},
    standbyOverlayPosition = 'bottom-left',
    standbyDimOpacity = 0.4,
    language = 'en-GB'
  } = settings || {};

  // ── Idle detection ──
  const resetIdleTimer = useCallback(() => {
    if (isStandby) {
      setIsStandby(false);
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (standbyEnabled) {
      const idleMs = (standbyIdleMinutes || 300) * 60 * 1000;
      idleTimerRef.current = setTimeout(() => {
        setIsStandby(true);
      }, idleMs);
    }
  }, [isStandby, standbyEnabled, standbyIdleMinutes]);

  useEffect(() => {
    if (!standbyEnabled) {
      setIsStandby(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    INTERACTION_EVENTS.forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // Start initial timer
    resetIdleTimer();

    return () => {
      INTERACTION_EVENTS.forEach(evt => {
        document.removeEventListener(evt, resetIdleTimer);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [standbyEnabled, standbyIdleMinutes, resetIdleTimer]);

  // ── Clock tick (only when standby active) ──
  useEffect(() => {
    if (!isStandby) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isStandby]);

  // ── Tautulli subscription ──
  useEffect(() => {
    if (!isStandby || !standbyOverlays.tautulliActivity) return;
    if (!tautulli.isConnected()) {
      setTautulliData(null);
      return;
    }

    const unsub = tautulli.subscribe((data) => {
      setTautulliData(data);
    });

    return () => unsub();
  }, [isStandby, standbyOverlays.tautulliActivity]);

  // ── Preload background image ──
  useEffect(() => {
    if (!standbyBackgroundUrl) {
      setBgLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.onerror = () => setBgLoaded(false);
    img.src = standbyBackgroundUrl;
  }, [standbyBackgroundUrl]);

  // ── Don't render if not enabled or not in standby ──
  if (!standbyEnabled || !isStandby) return null;

  // ── Data ──
  const countdowns = (integrations?.countdowns || []).filter(c => c.enabled && c.name && c.targetDate);
  const streams = tautulliData?.activity?.streams || [];
  const streamCount = tautulliData?.activity?.streamCount || 0;

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

        {/* Clock */}
        {standbyOverlays.clock && (
          <div className="standby-clock">
            {time.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        )}

        {/* Date */}
        {standbyOverlays.date && (
          <div className="standby-date">
            {time.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}

        {/* Countdowns */}
        {standbyOverlays.countdowns && countdowns.length > 0 && (
          <div className="standby-countdowns">
            {countdowns.slice(0, 3).map(cd => (
              <CountdownItem key={cd.id} countdown={cd} now={time} language={language} />
            ))}
          </div>
        )}

        {/* Tautulli Activity */}
        {standbyOverlays.tautulliActivity && streamCount > 0 && (
          <div className="standby-tautulli">
            <div className="standby-tautulli-header">
              <Play size={12} style={{ fill: 'var(--accent-primary)', color: 'var(--accent-primary)' }} />
              <span>{streamCount} streaming</span>
            </div>
            {streams.slice(0, 3).map((s, i) => (
              <div key={i} className="standby-tautulli-stream">
                <span className="standby-tautulli-user">{s.user}</span>
                <span className="standby-tautulli-title">{s.grandparentTitle ? `${s.grandparentTitle} - ${s.title}` : s.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tautulli — nothing playing */}
        {standbyOverlays.tautulliActivity && streamCount === 0 && tautulli.isConnected() && (
          <div className="standby-tautulli">
            <div className="standby-tautulli-header" style={{ opacity: 0.4 }}>
              <Users size={12} />
              <span>Nothing playing</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
