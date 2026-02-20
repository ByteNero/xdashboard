// Uptime Kuma Service - Uses status page public API
import { proxyFetch } from './proxy';

class UptimeKumaService {
  constructor() {
    this.baseUrl = null;
    this.statusPageSlug = null;
    this.monitors = {};
    this.subscribers = new Set();
    this.pollInterval = null;
    this.connected = false;
  }

  // Normalize URL - add http:// if missing
  normalizeUrl(url) {
    let normalized = url.trim().replace(/\/$/, '');
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'http://' + normalized;
    }
    return normalized;
  }

  // Connect using status page (public, no auth needed)
  async connectStatusPage(url, slug) {
    this.baseUrl = this.normalizeUrl(url);
    this.statusPageSlug = slug;

    try {
      console.log('[Uptime Kuma] Connecting to status page:', this.baseUrl, '/ slug:', slug);

      // Fetch status page config first
      const configResponse = await proxyFetch(`${this.baseUrl}/api/status-page/${slug}`);
      if (!configResponse.ok) {
        const status = configResponse.status;
        if (status === 404) {
          throw new Error(`Status page "${slug}" not found. Check the slug matches your status page URL (e.g., "benn" from /status/benn)`);
        }
        throw new Error(`HTTP ${status}: ${configResponse.statusText}`);
      }

      const configData = await configResponse.json();
      console.log('[Uptime Kuma] Status page config:', configData);

      // Now fetch the heartbeat data which has current status
      const heartbeatResponse = await proxyFetch(`${this.baseUrl}/api/status-page/heartbeat/${slug}`);
      if (!heartbeatResponse.ok) {
        throw new Error(`Failed to fetch heartbeat data: HTTP ${heartbeatResponse.status}`);
      }

      const heartbeatData = await heartbeatResponse.json();
      console.log('[Uptime Kuma] Heartbeat data:', heartbeatData);

      // Process the data
      this.processStatusPageData(configData, heartbeatData);

      if (Object.keys(this.monitors).length === 0) {
        throw new Error(`Status page "${slug}" has no monitors. Add monitors to your status page in Uptime Kuma.`);
      }

      this.connected = true;
      console.log('[Uptime Kuma] Connected successfully with', Object.keys(this.monitors).length, 'monitors');

      // Start polling for updates
      this.startPolling();

      return { success: true, monitors: Object.keys(this.monitors).length };
    } catch (error) {
      console.error('[Uptime Kuma] Connection failed:', error);
      this.connected = false;
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Connection failed - check URL and ensure Uptime Kuma is running');
      }
      throw error;
    }
  }

  processStatusPageData(configData, heartbeatData) {
    // Config data has publicGroupList with monitor info
    // Heartbeat data has heartbeatList with current status and uptimeList with uptime %

    const heartbeatList = heartbeatData?.heartbeatList || {};
    const uptimeList = heartbeatData?.uptimeList || {};

    if (configData.publicGroupList) {
      configData.publicGroupList.forEach(group => {
        group.monitorList?.forEach(monitor => {
          const monitorId = monitor.id;
          const heartbeats = heartbeatList[monitorId] || [];
          const latestHeartbeat = heartbeats[heartbeats.length - 1];
          const uptime24 = uptimeList[`${monitorId}_24`];

          this.monitors[monitorId] = {
            id: monitorId,
            name: monitor.name,
            status: latestHeartbeat?.status === 1 ? 'up' : (latestHeartbeat?.status === 0 ? 'down' : 'unknown'),
            uptime: uptime24 ? (uptime24 * 100) : 100,
            ping: latestHeartbeat?.ping || null,
            type: monitor.type,
            url: monitor.url
          };
        });
      });
    }

    this.notifySubscribers();
  }

  startPolling(interval = 30000) {
    this.stopPolling();

    this.pollInterval = setInterval(async () => {
      try {
        if (this.statusPageSlug) {
          // Fetch both config and heartbeat
          const [configResponse, heartbeatResponse] = await Promise.all([
            proxyFetch(`${this.baseUrl}/api/status-page/${this.statusPageSlug}`),
            proxyFetch(`${this.baseUrl}/api/status-page/heartbeat/${this.statusPageSlug}`)
          ]);

          if (configResponse.ok && heartbeatResponse.ok) {
            const configData = await configResponse.json();
            const heartbeatData = await heartbeatResponse.json();
            this.processStatusPageData(configData, heartbeatData);
          }
        }
      } catch (error) {
        console.error('[Uptime Kuma] Poll failed:', error);
      }
    }, interval);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);

    // Immediately call with current data
    if (Object.keys(this.monitors).length > 0) {
      callback(Object.values(this.monitors));
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifySubscribers() {
    const monitorList = Object.values(this.monitors);
    this.subscribers.forEach(callback => callback(monitorList));
  }

  getMonitors() {
    return Object.values(this.monitors);
  }

  getMonitor(id) {
    return this.monitors[id] || null;
  }

  disconnect() {
    this.stopPolling();
    this.connected = false;
    this.monitors = {};
    this.subscribers.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const uptimeKuma = new UptimeKumaService();
export default uptimeKuma;
