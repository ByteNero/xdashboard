import { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import {
  HomeAssistantPanel,
  UptimeKumaPanel,
  MediaPanel,
  ClockWeatherPanel,
  TautulliPanel,
  CameraPanel,
  CalendarPanel,
  NotesPanel,
  SystemPanel,
  ArrPanel,
  DownloadsPanel,
  QuickLinksPanel,
  DockerPanel,
  RSSPanel,
  PosterPanel,
  MarketsPanel,
  UniFiPanel,
  PiholePanel,
  ProxmoxPanel
} from '../components/panels';
import StandbyOverlay from '../components/StandbyOverlay';
import { Loader2 } from 'lucide-react';

const panelComponents = {
  'home-assistant': HomeAssistantPanel,
  'uptime-kuma': UptimeKumaPanel,
  'media': MediaPanel,
  'clock': ClockWeatherPanel,
  'tautulli': TautulliPanel,
  'cameras': CameraPanel,
  'calendar': CalendarPanel,
  'notes': NotesPanel,
  'system': SystemPanel,
  'arr': ArrPanel,
  'downloads': DownloadsPanel,
  'quicklinks': QuickLinksPanel,
  'docker': DockerPanel,
  'rss': RSSPanel,
  'poster': PosterPanel,
  'markets': MarketsPanel,
  'unifi': UniFiPanel,
  'pihole': PiholePanel,
  'proxmox': ProxmoxPanel
};

export default function Display() {
  const containerRef = useRef(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { panels, settings, connectAllEnabled, integrations, connectionStatus } = useDashboardStore();
  const enabledPanels = panels.filter(p => p.enabled).sort((a, b) => (a.order || 0) - (b.order || 0));
  const lastIntegrationsRef = useRef(null);

  // Create a hash of integration configs to detect changes
  const getIntegrationHash = (ints) => {
    return JSON.stringify({
      ha: { enabled: ints.homeAssistant?.enabled, url: ints.homeAssistant?.url },
      uk: { enabled: ints.uptimeKuma?.enabled, url: ints.uptimeKuma?.url },
      weather: { apiKey: ints.weather?.apiKey, units: ints.weather?.units },
      weatherLocations: (ints.weatherLocations || []).map(l => ({ id: l.id, enabled: l.enabled, city: l.city })),
      clocks: (ints.clocks || []).map(c => ({ id: c.id, enabled: c.enabled, city: c.city })),
      tautulli: { enabled: ints.tautulli?.enabled, url: ints.tautulli?.url },
      unifi: { enabled: ints.unifi?.enabled, url: ints.unifi?.url }
    });
  };

  // Auto-connect integrations on mount and when they change
  useEffect(() => {
    const currentHash = getIntegrationHash(integrations);
    const isFirstRun = lastIntegrationsRef.current === null;
    const hasChanged = lastIntegrationsRef.current !== currentHash;

    if (!isFirstRun && !hasChanged) return;
    lastIntegrationsRef.current = currentHash;

    const init = async () => {
      if (isFirstRun) setIsInitializing(true);

      const hasEnabled = Object.entries(integrations).some(([key, value]) => {
        if (Array.isArray(value)) return false; // Skip arrays like calendars, cameras
        // Weather uses API key instead of enabled flag
        if (key === 'weather') return !!value?.apiKey;
        return value?.enabled;
      });

      if (hasEnabled) {
        try {
          console.log('[Display] Connecting integrations...', isFirstRun ? '(initial)' : '(config changed)');
          await Promise.race([
            connectAllEnabled(),
            new Promise(resolve => setTimeout(resolve, 5000)) // Max 5 second wait
          ]);
        } catch (e) {
          console.error('Connection error:', e);
        }
      }

      if (isFirstRun) setIsInitializing(false);
    };

    init();
  }, [integrations, connectAllEnabled]);

  // Auto-scroll functionality
  useEffect(() => {
    if (!settings.autoScroll || !containerRef.current) return;
    
    const container = containerRef.current;
    let currentIndex = 0;
    
    const scroll = () => {
      currentIndex = (currentIndex + 1) % enabledPanels.length;
      const scrollTo = currentIndex * 384;
      container.scrollTo({ left: scrollTo, behavior: 'smooth' });
    };
    
    const interval = setInterval(scroll, settings.autoScrollInterval);
    return () => clearInterval(interval);
  }, [settings.autoScroll, settings.autoScrollInterval, enabledPanels.length]);

  // Hide cursor after inactivity
  useEffect(() => {
    let timeout;
    const container = containerRef.current;
    if (!container) return;

    const hideCursor = () => { container.style.cursor = 'none'; };
    const showCursor = () => {
      container.style.cursor = 'default';
      clearTimeout(timeout);
      timeout = setTimeout(hideCursor, 3000);
    };

    container.addEventListener('mousemove', showCursor);
    container.addEventListener('touchstart', showCursor);
    timeout = setTimeout(hideCursor, 3000);

    return () => {
      container.removeEventListener('mousemove', showCursor);
      container.removeEventListener('touchstart', showCursor);
      clearTimeout(timeout);
    };
  }, []);

  // Prevent context menu and keyboard scroll
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    const preventScroll = (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) e.preventDefault();
    };
    document.addEventListener('contextmenu', prevent);
    window.addEventListener('keydown', preventScroll);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      window.removeEventListener('keydown', preventScroll);
    };
  }, []);

  // Show loading during initial connection
  if (isInitializing) {
    return (
      <div className="display-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', marginBottom: '16px' }} />
          <p style={{ fontSize: '18px' }}>Connecting to services...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Apply panel height as CSS variable
  const dashboardHeight = settings.panelHeight && settings.panelHeight !== 'auto'
    ? `${settings.panelHeight}px`
    : '100vh';

  // UI scale for small/large screens
  const uiScale = settings.uiScale ? parseFloat(settings.uiScale) : 1;

  return (
    <div ref={containerRef} className="display-container" style={{
      '--dashboard-height': dashboardHeight,
      ...(uiScale !== 1 ? { zoom: uiScale } : {})
    }}>
      {enabledPanels.map((panel) => {
        const PanelComponent = panelComponents[panel.type];
        if (!PanelComponent) {
          return (
            <div key={panel.id} className="panel">
              <div className="panel-header"><h2>Unknown Panel</h2></div>
              <div className="panel-content">
                <p style={{ color: 'var(--text-muted)' }}>Panel type "{panel.type}" not found</p>
              </div>
            </div>
          );
        }
        return <PanelComponent key={panel.id} config={panel.config} title={panel.title} />;
      })}

      {enabledPanels.length === 0 && (
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '24px', marginBottom: '8px' }}>No panels enabled</p>
            <p>Go to /setup to configure your dashboard</p>
          </div>
        </div>
      )}

      {/* Standby / Screensaver overlay */}
      <StandbyOverlay />

      {/* Subtle brand watermark */}
      <div style={{
        position: 'fixed',
        bottom: '8px',
        right: '12px',
        fontSize: '9px',
        fontWeight: '600',
        letterSpacing: '1.5px',
        color: 'var(--text-muted)',
        opacity: 0.3,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        XDASHBOARD
      </div>
    </div>
  );
}
