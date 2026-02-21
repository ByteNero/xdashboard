import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { homeAssistant, uptimeKuma, weather, tautulli } from '../services';
import { unifi } from '../services/unifi';

// Increment this when making breaking changes to force cache reset
const STORE_VERSION = 6;

const defaultPanels = [
  {
    id: 'uptime-kuma',
    type: 'uptime-kuma',
    title: 'Services',
    enabled: true,
    order: 0,
    config: {
      services: []  // User will configure via Uptime Kuma connection
    }
  },
  {
    id: 'home-assistant',
    type: 'home-assistant',
    title: 'Smart Home',
    enabled: true,
    order: 1,
    config: {
      entities: []  // Start empty - user will add their own
    }
  },
  {
    id: 'clock',
    type: 'clock',
    title: 'Clock & Weather',
    enabled: true,
    order: 2,
    config: {
      format: '24h',
      showDate: true
    }
  },
  {
    id: 'media',
    type: 'media',
    title: 'Now Playing',
    enabled: true,
    order: 3,
    config: {
      source: 'spotify'
    }
  },
  {
    id: 'tautulli',
    type: 'tautulli',
    title: 'Plex',
    enabled: true,
    order: 4,
    config: {
      defaultTab: 'activity'
    }
  },
  {
    id: 'cameras',
    type: 'cameras',
    title: 'Cameras',
    enabled: false,
    order: 5,
    config: {
      cameras: [], // Auto-discover if empty, or specify entityIds
      refreshInterval: 5000,
      defaultView: 'grid' // 'grid' or 'single'
    }
  },
  {
    id: 'calendar',
    type: 'calendar',
    title: 'Calendar',
    enabled: false,
    order: 6,
    config: {}
  },
  {
    id: 'notes',
    type: 'notes',
    title: 'Notes',
    enabled: false,
    order: 7,
    config: {}
  },
  {
    id: 'system',
    type: 'system',
    title: 'System',
    enabled: false,
    order: 8,
    config: {}
  },
  {
    id: 'arr',
    type: 'arr',
    title: 'Media',
    enabled: false,
    order: 9,
    config: {
      defaultTab: 'overseerr'
    }
  },
  {
    id: 'downloads',
    type: 'downloads',
    title: 'Downloads',
    enabled: false,
    order: 10,
    config: {}
  },
  {
    id: 'quicklinks',
    type: 'quicklinks',
    title: 'Quick Links',
    enabled: false,
    order: 11,
    config: {}
  },
  {
    id: 'docker',
    type: 'docker',
    title: 'Docker',
    enabled: false,
    order: 12,
    config: {}
  },
  {
    id: 'rss',
    type: 'rss',
    title: 'RSS Feed',
    enabled: false,
    order: 13,
    config: {}
  },
  {
    id: 'poster',
    type: 'poster',
    title: 'Discover',
    enabled: false,
    order: 14,
    config: {}
  },
  {
    id: 'markets',
    type: 'markets',
    title: 'Markets',
    enabled: false,
    order: 15,
    config: {}
  },
  {
    id: 'unifi',
    type: 'unifi',
    title: 'Network',
    enabled: false,
    order: 16,
    config: {}
  }
];

const defaultIntegrations = {
  homeAssistant: {
    enabled: false,
    url: '',
    token: ''
  },
  uptimeKuma: {
    enabled: false,
    url: '',
    apiKey: '',
    statusPageSlug: '',
    useStatusPage: true
  },
  weather: {
    enabled: false,
    apiKey: '',
    city: '',
    lat: null,
    lon: null,
    units: 'metric',
    useGeolocation: false
  },
  weatherLocations: [
    // { id: '1', name: 'Home', provider: 'openweathermap', apiKey: '', city: '', units: 'metric', enabled: true }
    // { id: '2', name: 'Office', provider: 'custom', apiUrl: 'https://...', enabled: true }
  ],
  tautulli: {
    enabled: false,
    url: '',
    apiKey: ''
  },
  calendars: [
    // { id: '1', name: 'Personal', url: 'https://...ical', color: '#4285f4', enabled: true }
  ],
  cameras: [
    // { id: '1', name: 'Front Door', source: 'ha', entityId: 'camera.front', url: '', enabled: true }
  ],
  scrypted: {
    enabled: false,
    url: '', // e.g., https://192.168.1.100:10443
    username: '',
    password: '',
    token: '' // Bearer token for API access
  },
  clocks: [
    // { id: '1', name: 'New York', timezone: 'America/New_York', enabled: true }
    // { id: '2', name: 'London', timezone: 'Europe/London', enabled: true }
  ],
  countdowns: [
    // { id: '1', name: 'Baby Due', targetDate: '2025-09-15', enabled: true }
  ],
  notes: [
    // { id: '1', text: 'Remember to...', createdAt: timestamp, color: '#...' }
  ],
  system: {
    apiUrl: '', // URL to system stats API (Glances, custom script, etc)
    refreshInterval: 5000
  },
  arr: {
    overseerr: { enabled: false, url: '', apiKey: '' },
    radarr: { enabled: false, url: '', apiKey: '' },
    sonarr: { enabled: false, url: '', apiKey: '' },
    readarr: { enabled: false, url: '', apiKey: '' }
  },
  downloadClients: {
    qbittorrent: { enabled: false, url: '', username: '', password: '' },
    deluge: { enabled: false, url: '', password: '' },
    sabnzbd: { enabled: false, url: '', apiKey: '' },
    transmission: { enabled: false, url: '', username: '', password: '' }
  },
  quickLinks: [
    // { id: '1', name: 'Google', url: 'https://google.com', icon: 'search', color: '#4285f4' }
  ],
  docker: {
    enabled: false,
    type: 'portainer', // 'portainer' or 'docker'
    url: '',
    apiKey: '',
    endpointId: ''
  },
  rssFeeds: [
    // { id: '1', name: 'Hacker News', url: 'https://news.ycombinator.com/rss', color: '#ff6600', enabled: true }
  ],
  poster: {
    tmdbApiKey: '',
    traktClientId: '', // Trakt API client ID
    sources: ['upcoming', 'trending', 'popular'], // TMDB: upcoming, trending, popular, now_playing, on_air | Trakt: trakt_trending, trakt_popular, trakt_anticipated
    rotateInterval: 15000, // ms between rotations
    hideInLibrary: false, // Hide items already in Radarr/Sonarr
    displayMode: 'poster' // 'poster' or 'backdrop'
  },
  markets: {
    currency: 'usd', // usd, eur, gbp, etc
    watchlist: ['bitcoin', 'ethereum'], // CoinGecko IDs for crypto
    customAssets: [], // { symbol: 'AAPL', name: 'Apple', type: 'stock' }
    alphaVantageKey: '', // Optional: for stocks/ETFs
    finnhubKey: '', // Optional: alternative stock data
    refreshInterval: 60000 // 1 minute
  },
  unifi: {
    enabled: false,
    url: '',
    controllerType: 'udm', // 'self-hosted' or 'udm'
    authMethod: 'credentials', // 'credentials' or 'apikey'
    username: '',
    password: '',
    apiKey: '',
    site: 'default'
  }
};

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      panels: defaultPanels,
      integrations: defaultIntegrations,
      settings: {
        autoScroll: false,
        autoScrollInterval: 10000,
        theme: 'corsair-dark',
        accentColor: '#00d4ff',
        fontStyle: 'tech',
        language: 'en-GB',
        panelHeight: 'auto'
      },
      connectionStatus: {
        homeAssistant: { connected: false, error: null },
        uptimeKuma: { connected: false, error: null },
        weather: { connected: false, error: null },
        tautulli: { connected: false, error: null },
        poster: { tmdb: { connected: false, error: null }, trakt: { connected: false, error: null } },
        calendars: { configured: false, connected: false, testedCount: 0, totalCount: 0, totalEvents: 0 },
        unifi: { connected: false, error: null }
      },
      
      // Panel management
      togglePanel: (panelId) => set((state) => ({
        panels: state.panels.map(p => 
          p.id === panelId ? { ...p, enabled: !p.enabled } : p
        )
      })),
      
      reorderPanels: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.panels);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { panels: result.map((p, i) => ({ ...p, order: i })) };
      }),
      
      updatePanelConfig: (panelId, config) => set((state) => ({
        panels: state.panels.map(p => 
          p.id === panelId ? { ...p, config: { ...p.config, ...config } } : p
        )
      })),
      
      // Integration management
      updateIntegration: (name, config) => set((state) => ({
        integrations: {
          ...state.integrations,
          // If config is an array (calendars, cameras), set it directly
          // Otherwise merge with existing config
          [name]: Array.isArray(config) ? config : { ...state.integrations[name], ...config }
        }
      })),

      setConnectionStatus: (name, status) => set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          [name]: status
        }
      })),
      
      // Connect integrations
      connectHomeAssistant: async () => {
        const { integrations, setConnectionStatus } = get();
        const config = integrations.homeAssistant;
        
        if (!config.url || !config.token) {
          setConnectionStatus('homeAssistant', { 
            connected: false, 
            error: 'URL and token are required' 
          });
          return false;
        }
        
        try {
          setConnectionStatus('homeAssistant', { connected: false, error: null, connecting: true });
          console.log('[Store] Attempting HA connection to:', config.url);
          const result = await homeAssistant.connect(config.url, config.token);
          console.log('[Store] HA connected successfully');
          setConnectionStatus('homeAssistant', { 
            connected: true, 
            connecting: false,
            error: null,
            version: result.version 
          });
          return true;
        } catch (error) {
          console.error('[Store] HA connection failed:', error);
          setConnectionStatus('homeAssistant', { 
            connected: false, 
            connecting: false,
            error: error.message 
          });
          return false;
        }
      },
      
      connectUptimeKuma: async () => {
        const { integrations, setConnectionStatus } = get();
        const config = integrations.uptimeKuma;
        
        if (!config.url) {
          setConnectionStatus('uptimeKuma', { 
            connected: false, 
            error: 'URL is required' 
          });
          return false;
        }
        
        try {
          setConnectionStatus('uptimeKuma', { connected: false, error: null, connecting: true });
          
          let result;
          if (config.useStatusPage) {
            if (!config.statusPageSlug) {
              throw new Error('Status page slug required. Create a status page in Uptime Kuma Settings → Status Pages, then enter the slug (e.g., "default")');
            }
            result = await uptimeKuma.connectStatusPage(config.url, config.statusPageSlug);
          } else if (config.apiKey) {
            result = await uptimeKuma.connectWithApiKey(config.url, config.apiKey);
          } else {
            throw new Error('Enable "Use public status page" and enter a slug, or provide an API key');
          }
          
          setConnectionStatus('uptimeKuma', { 
            connected: true, 
            error: null,
            monitors: result.monitors 
          });
          return true;
        } catch (error) {
          setConnectionStatus('uptimeKuma', { 
            connected: false, 
            error: error.message 
          });
          return false;
        }
      },
      
      connectWeather: async () => {
        const { integrations, setConnectionStatus } = get();
        const config = integrations.weather;
        const clocks = integrations.clocks || [];
        const legacyWeatherLocations = integrations.weatherLocations || [];

        // API key is required
        if (!config.apiKey) {
          setConnectionStatus('weather', {
            connected: false,
            error: 'API key is required'
          });
          return false;
        }

        try {
          setConnectionStatus('weather', { connected: false, error: null, connecting: true });

          // Build weather locations from clocks that have cities
          const clocksWithCities = clocks.filter(c => c.enabled !== false && c.city?.trim());

          // If clocks have cities, use those
          if (clocksWithCities.length > 0) {
            const locations = clocksWithCities.map(clock => ({
              id: clock.id,
              name: clock.name || clock.city,
              provider: 'openweathermap',
              apiKey: config.apiKey,
              city: clock.city,
              units: config.units || 'metric',
              enabled: true
            }));

            const result = await weather.connect(locations);
            setConnectionStatus('weather', {
              connected: true,
              error: null,
              location: result.location,
              locations: result.locations
            });
            return true;
          }

          // Fallback: check legacy weatherLocations
          if (legacyWeatherLocations.length > 0 && legacyWeatherLocations.some(l => l.enabled)) {
            const result = await weather.connect(legacyWeatherLocations);
            setConnectionStatus('weather', {
              connected: true,
              error: null,
              location: result.location,
              locations: result.locations
            });
            return true;
          }

          // Fallback: legacy single-location mode with config.city
          if (config.city) {
            const result = await weather.connect(config.apiKey, {
              city: config.city,
              units: config.units || 'metric'
            });
            setConnectionStatus('weather', {
              connected: true,
              error: null,
              location: result.location
            });
            return true;
          }

          // Fallback: use browser geolocation
          if (config.useGeolocation) {
            const result = await weather.connect(config.apiKey, {
              units: config.units || 'metric'
            });
            setConnectionStatus('weather', {
              connected: true,
              error: null,
              location: result.location
            });
            return true;
          }

          // No cities configured - still mark as "connected" since API key is valid
          // Weather will show when user adds a city to a clock
          setConnectionStatus('weather', {
            connected: true,
            error: null,
            location: 'No cities configured'
          });
          return true;

        } catch (error) {
          setConnectionStatus('weather', {
            connected: false,
            error: error.message
          });
          return false;
        }
      },
      
      connectTautulli: async () => {
        const { integrations, setConnectionStatus } = get();
        const config = integrations.tautulli;

        if (!config.url || !config.apiKey) {
          setConnectionStatus('tautulli', {
            connected: false,
            connecting: false,
            error: 'URL and API key required'
          });
          return false;
        }

        try {
          setConnectionStatus('tautulli', { connected: false, error: null, connecting: true });
          console.log('[Store] Attempting Tautulli connection to:', config.url);
          await tautulli.connect(config.url, config.apiKey);
          console.log('[Store] Tautulli connected successfully');
          setConnectionStatus('tautulli', {
            connected: true,
            connecting: false,
            error: null
          });
          return true;
        } catch (error) {
          console.error('[Store] Tautulli connection failed:', error);
          setConnectionStatus('tautulli', {
            connected: false,
            connecting: false,
            error: error.message
          });
          return false;
        }
      },
      
      // Disconnect integrations
      disconnectHomeAssistant: () => {
        homeAssistant.disconnect();
        get().setConnectionStatus('homeAssistant', { connected: false, error: null });
      },
      
      disconnectUptimeKuma: () => {
        uptimeKuma.disconnect();
        get().setConnectionStatus('uptimeKuma', { connected: false, error: null });
      },
      
      disconnectWeather: () => {
        weather.disconnect();
        get().setConnectionStatus('weather', { connected: false, error: null });
      },
      
      disconnectTautulli: () => {
        tautulli.disconnect();
        get().setConnectionStatus('tautulli', { connected: false, error: null });
      },

      connectUnifi: async () => {
        const { integrations, setConnectionStatus } = get();
        const config = integrations.unifi;

        if (!config.url) {
          setConnectionStatus('unifi', { connected: false, error: 'Controller URL is required' });
          return false;
        }

        const needsCredentials = config.authMethod !== 'apikey' && (!config.username || !config.password);
        const needsApiKey = config.authMethod === 'apikey' && !config.apiKey;

        if (needsCredentials || needsApiKey) {
          setConnectionStatus('unifi', { connected: false, error: 'Authentication details required' });
          return false;
        }

        try {
          setConnectionStatus('unifi', { connected: false, error: null, connecting: true });
          console.log('[Store] Attempting UniFi connection to:', config.url);
          await unifi.connect(config);
          console.log('[Store] UniFi connected successfully');
          setConnectionStatus('unifi', { connected: true, connecting: false, error: null });
          return true;
        } catch (error) {
          console.error('[Store] UniFi connection failed:', error);
          setConnectionStatus('unifi', { connected: false, connecting: false, error: error.message });
          return false;
        }
      },

      disconnectUnifi: () => {
        unifi.disconnect();
        get().setConnectionStatus('unifi', { connected: false, error: null });
      },

      // Test TMDB API connection
      testTmdbConnection: async () => {
        const { integrations, setConnectionStatus, connectionStatus } = get();
        const apiKey = integrations.poster?.tmdbApiKey;

        if (!apiKey) {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            tmdb: { connected: false, error: 'API key required' }
          });
          return false;
        }

        try {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            tmdb: { connected: false, error: null, connecting: true }
          });

          const response = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.themoviedb.org/3/configuration?api_key=${apiKey}`)}`);

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Invalid API key');
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            tmdb: { connected: true, connecting: false, error: null }
          });
          return true;
        } catch (error) {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            tmdb: { connected: false, connecting: false, error: error.message }
          });
          return false;
        }
      },

      // Test Trakt API connection
      testTraktConnection: async () => {
        const { integrations, setConnectionStatus, connectionStatus } = get();
        const clientId = integrations.poster?.traktClientId;

        if (!clientId) {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            trakt: { connected: false, error: 'Client ID required' }
          });
          return false;
        }

        try {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            trakt: { connected: false, error: null, connecting: true }
          });

          const traktHeaders = encodeURIComponent(JSON.stringify({
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': clientId
          }));
          const traktUrl = encodeURIComponent('https://api.trakt.tv/movies/trending?limit=1');
          const response = await fetch(`/api/proxy?url=${traktUrl}&headers=${traktHeaders}`);

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Invalid Client ID');
            }
            throw new Error(`HTTP ${response.status}`);
          }

          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            trakt: { connected: true, connecting: false, error: null }
          });
          return true;
        } catch (error) {
          setConnectionStatus('poster', {
            ...connectionStatus.poster,
            trakt: { connected: false, connecting: false, error: error.message }
          });
          return false;
        }
      },

      // Reset poster connection status
      resetPosterConnection: () => {
        get().setConnectionStatus('poster', {
          tmdb: { connected: false, error: null },
          trakt: { connected: false, error: null }
        });
      },

      // Connect all enabled integrations
      connectAllEnabled: async () => {
        const { integrations, connectHomeAssistant, connectUptimeKuma, connectWeather, connectTautulli, connectUnifi } = get();

        const promises = [];

        if (integrations.homeAssistant.enabled && integrations.homeAssistant.url && integrations.homeAssistant.token) {
          promises.push(connectHomeAssistant());
        }
        if (integrations.uptimeKuma.enabled && integrations.uptimeKuma.url) {
          promises.push(connectUptimeKuma());
        }

        // Weather: connect if API key exists (with clocks that have cities, legacy locations, or legacy mode)
        const hasWeatherLocations = (integrations.weatherLocations || []).some(l => l.enabled);
        const hasClocksWithCities = (integrations.clocks || []).some(c => c.enabled !== false && c.city?.trim());
        if (integrations.weather.apiKey && (hasClocksWithCities || hasWeatherLocations || integrations.weather.city || integrations.weather.useGeolocation)) {
          promises.push(connectWeather());
        }

        if (integrations.tautulli.enabled && integrations.tautulli.url && integrations.tautulli.apiKey) {
          promises.push(connectTautulli());
        }

        if (integrations.unifi?.enabled && integrations.unifi?.url) {
          promises.push(connectUnifi());
        }

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      },
      
      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // Get only enabled panels
      getEnabledPanels: () => get().panels.filter(p => p.enabled).sort((a, b) => a.order - b.order),
      
      // Reset to defaults
      resetToDefaults: () => set({ 
        panels: defaultPanels,
        integrations: defaultIntegrations
      }),
    }),
    {
      name: 'ultrawide-dashboard-storage',
      version: STORE_VERSION,
      onRehydrateStorage: () => (state) => {
        // Called when hydration is complete
        if (state) {
          state._hasHydrated = true;
        }
      },
      partialize: (state) => ({
        panels: state.panels,
        integrations: state.integrations,
        settings: state.settings,
        connectionStatus: {
          calendars: state.connectionStatus.calendars // Persist calendar status
        }
      }),
      // Migration: merge new panels/fields while keeping user data
      migrate: (persistedState, version) => {
        if (version < STORE_VERSION) {
          console.log(`[Store] Migrating from v${version} to v${STORE_VERSION}`);

          // Merge in any new default panels that don't exist
          const existingPanelIds = persistedState.panels?.map(p => p.id) || [];
          const newPanels = defaultPanels.filter(p => !existingPanelIds.includes(p.id));

          // Deep merge integrations - keep user data but add any new keys/integrations
          const mergedIntegrations = { ...defaultIntegrations };
          const persisted = persistedState.integrations || {};
          for (const key of Object.keys(mergedIntegrations)) {
            if (key in persisted) {
              // Arrays: use persisted data directly (clocks, calendars, notes, etc.)
              if (Array.isArray(mergedIntegrations[key])) {
                mergedIntegrations[key] = persisted[key];
              } else if (typeof mergedIntegrations[key] === 'object' && mergedIntegrations[key] !== null) {
                // Objects: merge defaults with persisted (keeps new fields, preserves user values)
                mergedIntegrations[key] = { ...mergedIntegrations[key], ...persisted[key] };
              } else {
                mergedIntegrations[key] = persisted[key];
              }
            }
          }
          // Also carry over any user integrations not in defaults
          for (const key of Object.keys(persisted)) {
            if (!(key in mergedIntegrations)) {
              mergedIntegrations[key] = persisted[key];
            }
          }

          return {
            ...persistedState,
            panels: [...(persistedState.panels || []), ...newPanels],
            integrations: mergedIntegrations,
            settings: {
              ...{ autoScroll: false, autoScrollInterval: 10000, theme: 'corsair-dark', accentColor: '#00d4ff', fontStyle: 'tech', language: 'en-GB', panelHeight: 'auto' },
              ...persistedState.settings
            }
          };
        }
        return persistedState;
      }
    }
  )
);

// Utility to clear cache and reset (can be called from console)
export const clearDashboardCache = () => {
  localStorage.removeItem('ultrawide-dashboard-storage');
  window.location.reload();
};

// ============================================
// Server sync — server is the SINGLE source of truth
// localStorage is only a fallback when server is unreachable
// ============================================

let saveTimeout = null;
let isSyncing = false;
let serverReady = false; // blocks saves until first server load completes
let lastServerHash = ''; // track what server has to avoid redundant saves

const hashState = (data) => {
  try {
    return JSON.stringify({ p: data.panels, i: data.integrations, s: data.settings });
  } catch { return ''; }
};

// Save to server (debounced 1.5s)
const saveToServer = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (isSyncing || !serverReady) return;
    const state = useDashboardStore.getState();
    const data = {
      panels: state.panels,
      integrations: state.integrations,
      settings: state.settings,
      savedAt: new Date().toISOString()
    };
    const hash = hashState(data);
    if (hash === lastServerHash) return; // no real change
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        lastServerHash = hash;
        console.log('[Sync] Saved to server');
      }
    } catch (err) {
      console.warn('[Sync] Save failed:', err.message);
    }
  }, 1500);
};

// Load from server
const loadFromServer = async () => {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.panels ? data : null;
  } catch {
    return null;
  }
};

// Apply server data to store (preserving local-only settings like panelHeight)
const applyServerData = (serverData) => {
  isSyncing = true;
  const localPanelHeight = useDashboardStore.getState().settings?.panelHeight || 'auto';

  // Merge in any new default panels missing from server data
  const serverPanelIds = (serverData.panels || []).map(p => p.id);
  const missingPanels = defaultPanels.filter(p => !serverPanelIds.includes(p.id));
  const mergedPanels = [...(serverData.panels || []), ...missingPanels];

  // Merge in any new default integrations missing from server data
  const mergedIntegrations = { ...defaultIntegrations };
  const persisted = serverData.integrations || {};
  for (const key of Object.keys(mergedIntegrations)) {
    if (key in persisted) {
      if (Array.isArray(mergedIntegrations[key])) {
        mergedIntegrations[key] = persisted[key];
      } else if (typeof mergedIntegrations[key] === 'object' && mergedIntegrations[key] !== null) {
        mergedIntegrations[key] = { ...mergedIntegrations[key], ...persisted[key] };
      } else {
        mergedIntegrations[key] = persisted[key];
      }
    }
  }
  for (const key of Object.keys(persisted)) {
    if (!(key in mergedIntegrations)) {
      mergedIntegrations[key] = persisted[key];
    }
  }

  useDashboardStore.setState({
    panels: mergedPanels,
    integrations: mergedIntegrations,
    settings: { ...serverData.settings, panelHeight: localPanelHeight }
  });
  lastServerHash = hashState({ panels: mergedPanels, integrations: mergedIntegrations, settings: serverData.settings });
  isSyncing = false;
};

if (typeof window !== 'undefined') {
  window.clearDashboardCache = clearDashboardCache;

  // 1. On startup: always load from server first
  (async () => {
    // Small delay to let Zustand hydrate from localStorage first (fallback)
    await new Promise(r => setTimeout(r, 300));

    const serverData = await loadFromServer();
    if (serverData) {
      applyServerData(serverData);
      console.log('[Sync] Loaded from server — source of truth');
    } else {
      console.log('[Sync] Server unavailable, using localStorage fallback');
    }
    serverReady = true;
  })();

  // 2. On any state change: save to server
  useDashboardStore.subscribe((state, prevState) => {
    if (isSyncing || !serverReady) return;
    if (
      state.panels !== prevState.panels ||
      state.integrations !== prevState.integrations ||
      state.settings !== prevState.settings
    ) {
      saveToServer();
    }
  });

  // 3. Poll server every 15s for changes from other devices
  setInterval(async () => {
    if (isSyncing || !serverReady) return;
    try {
      const serverData = await loadFromServer();
      if (!serverData) return;
      const serverHash = hashState(serverData);
      if (serverHash !== lastServerHash) {
        applyServerData(serverData);
        console.log('[Sync] Updated from server (another device changed settings)');
      }
    } catch {
      // silent
    }
  }, 15000);
}

export default useDashboardStore;
